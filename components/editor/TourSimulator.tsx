import { useEffect, useRef, useState } from 'react';
import { SimulationContext, Step } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/ui/icons';

interface TourSimulatorProps {
  steps: Step[];
  simulationContext?: SimulationContext;
  tourName?: string;
  targetUrl?: string;
  onExitPreview: () => void;
  initialIsPlaying?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

type NormalizedRect = {
  topPct: number;
  leftPct: number;
  widthPct: number;
  heightPct: number;
};

type SimulationElementWithRect = NonNullable<SimulationContext['elements']>[number] & {
  rect: NormalizedRect;
};

type TooltipPlacement = Exclude<Step['position'], undefined>;
type PreviewBridgeRectMessage = {
  type: 'TRUSTDEV_PREVIEW_TARGET_RECT';
  selector?: string;
  rect?: { top: number; left: number; width: number; height: number } | null;
};
const PREVIEW_BASE_URL_STORAGE_KEY = 'trustdev_dashboard_preview_base_url_v1';

function toAbsoluteHttpUrl(value?: string): URL | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function resolvePreviewPageUrl(
  stepRouteOrUrl: string | undefined,
  tourTargetUrl: string | undefined,
  simulationPageUrl: string | undefined,
): string | undefined {
  const rawStep = (stepRouteOrUrl || '').trim();
  const absoluteStepUrl = toAbsoluteHttpUrl(rawStep);
  if (absoluteStepUrl) {
    return absoluteStepUrl.href;
  }

  const absoluteTourTargetUrl = toAbsoluteHttpUrl(tourTargetUrl);
  const absoluteSimulationPageUrl = toAbsoluteHttpUrl(simulationPageUrl);
  const dashboardOrigin =
    typeof window !== 'undefined' ? toAbsoluteHttpUrl(window.location.origin)?.origin : undefined;

  const pickUsableBase = (...candidates: Array<URL | null>): URL | null => {
    for (const candidate of candidates) {
      if (!candidate) continue;
      // If step/tour URL is relative, avoid resolving against the dashboard origin,
      // otherwise preview often loops into dashboard/login instead of the target app.
      if (dashboardOrigin && candidate.origin === dashboardOrigin) continue;
      return candidate;
    }
    return null;
  };

  let baseUrl = pickUsableBase(absoluteTourTargetUrl, absoluteSimulationPageUrl);

  if (!baseUrl && typeof window !== 'undefined') {
    const envPreviewBase = toAbsoluteHttpUrl(process.env.NEXT_PUBLIC_PREVIEW_APP_URL);
    const storedPreviewBase = toAbsoluteHttpUrl(window.localStorage.getItem(PREVIEW_BASE_URL_STORAGE_KEY) || undefined);
    // Local-first fallback for developers when targetUrl is just "/".
    const defaultLocalPreviewBase = toAbsoluteHttpUrl('http://localhost:3000');
    baseUrl = pickUsableBase(envPreviewBase, storedPreviewBase, defaultLocalPreviewBase);
  }

  if (rawStep) {
    if (baseUrl) {
      try {
        // Resolve relative multi-page routes (/about, /contact) against the target app origin.
        return rawStep.startsWith('/')
          ? new URL(rawStep, baseUrl.origin).href
          : new URL(rawStep, baseUrl.href).href;
      } catch {
        // Fall through to local fallback.
      }
    }

    if (typeof window !== 'undefined') {
      try {
        return new URL(rawStep, window.location.origin).href;
      } catch {
        // Ignore invalid URL and fall through.
      }
    }

    return rawStep;
  }

  if (absoluteTourTargetUrl) return absoluteTourTargetUrl.href;
  if (absoluteSimulationPageUrl) return absoluteSimulationPageUrl.href;
  return undefined;
}

function withSimulatorPreviewFlag(urlValue?: string): string | undefined {
  if (!urlValue) return undefined;
  try {
    const parsed = new URL(urlValue);
    parsed.searchParams.set('__trustdev_simulator_preview', '1');
    return parsed.href;
  } catch {
    return urlValue;
  }
}

function normalizeSearchText(value?: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value?: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  return normalized.split(' ').filter((token) => token.length >= 3);
}

function extractSelectorHints(selector?: string): string[] {
  if (!selector) return [];

  const hints = new Set<string>();

  const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/g) || [];
  idMatch.forEach((entry) => hints.add(entry.replace('#', '')));

  const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/g) || [];
  classMatch.forEach((entry) => hints.add(entry.replace('.', '')));

  const dataAttrMatches = selector.match(/\[data-[^=]+=["']([^"']+)["']\]/g) || [];
  dataAttrMatches.forEach((entry) => {
    const valueMatch = entry.match(/=["']([^"']+)["']/);
    if (valueMatch?.[1]) hints.add(valueMatch[1]);
  });

  return [...hints];
}

function extractStableSelectorToken(selector?: string): string | null {
  if (!selector) return null;

  const dataTourIdMatch = selector.match(/\[data-tour-id=["']([^"']+)["']\]/i);
  if (dataTourIdMatch?.[1]) return `data-tour-id:${dataTourIdMatch[1]}`;

  const dataTestIdMatch = selector.match(/\[data-testid=["']([^"']+)["']\]/i);
  if (dataTestIdMatch?.[1]) return `data-testid:${dataTestIdMatch[1]}`;

  const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch?.[1]) return `id:${idMatch[1]}`;

  return null;
}

function findBestElementForStep(step: Step, elements: SimulationElementWithRect[]): SimulationElementWithRect | null {
  const stepSelector = step.targetSelector;
  if (!stepSelector || !elements.length) return null;

  const exact = elements.find((item) => item.selector === stepSelector);
  if (exact) return exact;

  const stepToken = extractStableSelectorToken(stepSelector);
  if (stepToken) {
    const tokenMatch = elements.find((item) => extractStableSelectorToken(item.selector) === stepToken);
    if (tokenMatch) return tokenMatch;
  }

  const selectorHints = extractSelectorHints(stepSelector);
  const contentTokens = new Set([
    ...tokenize(step.title),
    ...tokenize(step.content),
    ...selectorHints.flatMap((hint) => tokenize(hint)),
  ]);

  let best: { element: SimulationElementWithRect; score: number } | null = null;

  for (const element of elements) {
    let score = 0;

    if (element.selector === stepSelector) score += 220;
    if (stepToken && extractStableSelectorToken(element.selector) === stepToken) score += 180;

    const elementSelectorNorm = normalizeSearchText(element.selector);
    for (const hint of selectorHints) {
      const hintNorm = normalizeSearchText(hint);
      if (hintNorm && elementSelectorNorm.includes(hintNorm)) {
        score += 18;
      }
    }

    const elementTextNorm = normalizeSearchText(element.text);
    for (const token of contentTokens) {
      if (token.length < 3) continue;
      if (elementTextNorm.includes(token)) {
        score += 14;
      }
    }

    if (element.actionable) {
      score += 10;
    }

    if (!best || score > best.score) {
      best = { element, score };
    }
  }

  return best && best.score >= 30 ? best.element : null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const LIVE_RECT_MIN_PCT = -20;
const LIVE_RECT_MAX_PCT = 120;

function normalizeRect(
  bbox: { top: number; left: number; width: number; height: number },
  viewport: { width: number; height: number },
): NormalizedRect {
  const vw = Math.max(1, viewport.width || 1);
  const vh = Math.max(1, viewport.height || 1);

  return {
    topPct: clampPercent((bbox.top / vh) * 100),
    leftPct: clampPercent((bbox.left / vw) * 100),
    widthPct: Math.max(2, clampPercent((bbox.width / vw) * 100)),
    heightPct: Math.max(2, clampPercent((bbox.height / vh) * 100)),
  };
}

function resolveTooltipPlacement(rect: NormalizedRect, position?: Step['position']): TooltipPlacement {
  const prefer = position || 'BOTTOM';
  const left = rect.leftPct;
  const right = rect.leftPct + rect.widthPct;
  const top = rect.topPct;
  const bottom = rect.topPct + rect.heightPct;

  let pos: Step['position'] = prefer;

  // Flip horizontally when the preferred side does not have enough room.
  if ((prefer === 'RIGHT' || prefer === 'TOP_RIGHT' || prefer === 'BOTTOM_RIGHT') && right > 76) {
    pos = prefer === 'RIGHT' ? 'LEFT' : prefer === 'TOP_RIGHT' ? 'TOP_LEFT' : 'BOTTOM_LEFT';
  } else if ((prefer === 'LEFT' || prefer === 'TOP_LEFT' || prefer === 'BOTTOM_LEFT') && left < 24) {
    pos = prefer === 'LEFT' ? 'RIGHT' : prefer === 'TOP_LEFT' ? 'TOP_RIGHT' : 'BOTTOM_RIGHT';
  }

  // Flip vertically when the preferred side does not have enough room.
  if ((pos === 'BOTTOM' || pos === 'BOTTOM_LEFT' || pos === 'BOTTOM_RIGHT') && bottom > 78) {
    pos = pos === 'BOTTOM' ? 'TOP' : pos === 'BOTTOM_LEFT' ? 'TOP_LEFT' : 'TOP_RIGHT';
  } else if ((pos === 'TOP' || pos === 'TOP_LEFT' || pos === 'TOP_RIGHT') && top < 20) {
    pos = pos === 'TOP' ? 'BOTTOM' : pos === 'TOP_LEFT' ? 'BOTTOM_LEFT' : 'BOTTOM_RIGHT';
  }

  return pos;
}


function getArrowAnchorOnTarget(
  placement: TooltipPlacement,
  targetRect: NormalizedRect,
  stageRect: DOMRect,
): { x: number; y: number } {
  const toPixels = (pct: number, dimension: number) => (pct / 100) * dimension;
  
  const centerX = toPixels(targetRect.leftPct + targetRect.widthPct / 2, stageRect.width);
  const centerY = toPixels(targetRect.topPct + targetRect.heightPct / 2, stageRect.height);
  const edgeTop = toPixels(targetRect.topPct, stageRect.height);
  const edgeBottom = toPixels(targetRect.topPct + targetRect.heightPct, stageRect.height);
  const edgeLeft = toPixels(targetRect.leftPct, stageRect.width);
  const edgeRight = toPixels(targetRect.leftPct + targetRect.widthPct, stageRect.width);

  switch (placement) {
    case 'TOP':
    case 'TOP_LEFT':
    case 'TOP_RIGHT':
      return { x: centerX, y: edgeTop };
    case 'BOTTOM':
    case 'BOTTOM_LEFT':
    case 'BOTTOM_RIGHT':
      return { x: centerX, y: edgeBottom };
    case 'LEFT':
      return { x: edgeLeft, y: centerY };
    case 'RIGHT':
      return { x: edgeRight, y: centerY };
    default:
      return { x: centerX, y: centerY };
  }
}

function getTooltipAnchorPoint(
  placement: TooltipPlacement,
  arrowStartX: number,
  arrowStartY: number,
): { x: number; y: number } {
  // Arrow length in pixels (aligned with SDK runtime spacing).
  const arrowLength = 84;
  
  switch (placement) {
    case 'LEFT':
      return {
        x: arrowStartX - arrowLength,
        y: arrowStartY,
      };
    case 'RIGHT':
      return {
        x: arrowStartX + arrowLength,
        y: arrowStartY,
      };
    case 'TOP_LEFT':
      return {
        x: arrowStartX - arrowLength,
        y: arrowStartY - arrowLength,
      };
    case 'TOP_RIGHT':
      return {
        x: arrowStartX + arrowLength,
        y: arrowStartY - arrowLength,
      };
    case 'BOTTOM_LEFT':
      return {
        x: arrowStartX - arrowLength,
        y: arrowStartY + arrowLength,
      };
    case 'BOTTOM_RIGHT':
      return {
        x: arrowStartX + arrowLength,
        y: arrowStartY + arrowLength,
      };
    case 'TOP':
      return {
        x: arrowStartX,
        y: arrowStartY - arrowLength,
      };
    case 'BOTTOM':
    default:
      return {
        x: arrowStartX,
        y: arrowStartY + arrowLength,
      };
  }
}

function getRectBoundaryPoint(
  rect: { top: number; left: number; width: number; height: number },
  toward: { x: number; y: number },
): { x: number; y: number } {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: cx, y: cy };
  }

  const halfW = Math.max(1, rect.width / 2);
  const halfH = Math.max(1, rect.height / 2);
  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}

function getTooltipPositionFromArrowAnchor(
  arrowAnchorX: number,
  arrowAnchorY: number,
  placement: TooltipPlacement,
  stageRect: DOMRect,
): { top: string; left: string; transform: string } {
  const stageW = stageRect.width;
  const stageH = stageRect.height;

  // Convert pixel position to percentage
  const anchorPctX = (arrowAnchorX / stageW) * 100;
  const anchorPctY = (arrowAnchorY / stageH) * 100;

  switch (placement) {
    case 'TOP':
      return {
        top: `${anchorPctY}%`,
        left: `${anchorPctX}%`,
        transform: 'translate(-50%, -100%)',
      };
    case 'BOTTOM':
    default:
      return {
        top: `${anchorPctY}%`,
        left: `${anchorPctX}%`,
        transform: 'translate(-50%, 0)',
      };
    case 'LEFT':
      return {
        top: `${anchorPctY}%`,
        left: `${anchorPctX}%`,
        transform: 'translate(-100%, -50%)',
      };
    case 'RIGHT':
      return {
        top: `${anchorPctY}%`,
        left: `${anchorPctX}%`,
        transform: 'translate(0, -50%)',
      };
    case 'TOP_LEFT':
      return {
        top: `${anchorPctY}%`,
        left: `${anchorPctX}%`,
        transform: 'translate(-100%, -100%)',
      };
    case 'TOP_RIGHT':
      return {
        top: `${anchorPctY}%`,
        left: `${anchorPctX}%`,
        transform: 'translate(0, -100%)',
      };
    case 'BOTTOM_LEFT':
      return {
        top: `${anchorPctY}%`,
        left: `${anchorPctX}%`,
        transform: 'translate(-100%, 0)',
      };
    case 'BOTTOM_RIGHT':
      return {
        top: `${anchorPctY}%`,
        left: `${anchorPctX}%`,
        transform: 'translate(0, 0)',
      };
    case 'CENTER':
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
  }
}

function clampTooltipStyle(style: { top: string; left: string; transform: string }) {
  const topMatch = style.top.match(/-?\d+(?:\.\d+)?/);
  const leftMatch = style.left.match(/-?\d+(?:\.\d+)?/);

  if (!topMatch || !leftMatch) {
    return style;
  }

  const rawTop = Number(topMatch[0]);
  const rawLeft = Number(leftMatch[0]);

  let minLeft = 2;
  let maxLeft = 98;
  let minTop = 2;
  let maxTop = 98;

  // Keep the tooltip body visible based on its transform anchor.
  if (style.transform.includes('translate(-50%')) {
    minLeft = 16;
    maxLeft = 84;
  } else if (style.transform.includes('translate(-100%')) {
    minLeft = 26;
    maxLeft = 98;
  } else if (style.transform.includes('translate(0')) {
    minLeft = 2;
    maxLeft = 74;
  }

  if (style.transform.includes('-100%)')) {
    minTop = 20;
    maxTop = 98;
  } else if (style.transform.includes('-50%')) {
    minTop = 10;
    maxTop = 90;
  } else {
    minTop = 2;
    maxTop = 78;
  }

  const safeTop = Math.max(minTop, Math.min(maxTop, rawTop));
  const safeLeft = Math.max(minLeft, Math.min(maxLeft, rawLeft));

  return {
    ...style,
    top: `${safeTop}%`,
    left: `${safeLeft}%`,
  };
}

export default function TourSimulator({
  steps,
  simulationContext,
  tourName,
  targetUrl,
  onExitPreview,
  initialIsPlaying = false,
  onPlayStateChange,
}: TourSimulatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(initialIsPlaying);
  const [viewMode, setViewMode] = useState<'preview' | 'debug'>('preview');
  const [iframeState, setIframeState] = useState<'idle' | 'loading' | 'ready' | 'blocked'>('idle');
  const [canUseIframe, setCanUseIframe] = useState(false);
  const [canInspectIframeDom, setCanInspectIframeDom] = useState(false);
  const [liveTargetRect, setLiveTargetRect] = useState<NormalizedRect | null>(null);
  const [liveCalibrationTimedOut, setLiveCalibrationTimedOut] = useState(false);
  const [connectorPath, setConnectorPath] = useState<string | null>(null);
  const [connectorStart, setConnectorStart] = useState<{ x: number; y: number } | null>(null);
  const [arrowAnchorPixels, setArrowAnchorPixels] = useState<{ x: number; y: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const syncLiveTargetRef = useRef<(() => void) | null>(null);
  const hasSteps = steps.length > 0;
  const safeIndex = hasSteps ? Math.min(currentIndex, steps.length - 1) : 0;
  const currentStep = hasSteps ? steps[safeIndex] : null;
  const isLastStep = hasSteps ? safeIndex === steps.length - 1 : false;
  const currentStepPageUrl = resolvePreviewPageUrl(
    currentStep?.stepTargetUrl || targetUrl || simulationContext?.pageUrl,
    targetUrl,
    simulationContext?.pageUrl,
  );
  const prevStep = hasSteps && safeIndex > 0 ? steps[safeIndex - 1] : null;
  const prevStepPageUrl = resolvePreviewPageUrl(
    prevStep?.stepTargetUrl || targetUrl || simulationContext?.pageUrl,
    targetUrl,
    simulationContext?.pageUrl,
  );
  const nextStep = hasSteps && safeIndex < steps.length - 1 ? steps[safeIndex + 1] : null;
  const nextStepPageUrl = resolvePreviewPageUrl(
    nextStep?.stepTargetUrl || targetUrl || simulationContext?.pageUrl,
    targetUrl,
    simulationContext?.pageUrl,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preferredBase = toAbsoluteHttpUrl(targetUrl) || toAbsoluteHttpUrl(simulationContext?.pageUrl);
    if (!preferredBase) return;
    try {
      window.localStorage.setItem(PREVIEW_BASE_URL_STORAGE_KEY, preferredBase.origin);
    } catch {
      // Ignore storage write errors.
    }
  }, [targetUrl, simulationContext?.pageUrl]);

  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  const hasStructuredContext =
    Boolean(simulationContext?.viewport?.width) &&
    Boolean(simulationContext?.viewport?.height) &&
    Boolean(simulationContext?.elements?.length);

  useEffect(() => {
    if (!currentStepPageUrl || typeof window === 'undefined') {
      setCanUseIframe(false);
      setCanInspectIframeDom(false);
      return;
    }

    try {
      const resolvedUrl = new URL(currentStepPageUrl, window.location.origin);
      setCanUseIframe(Boolean(resolvedUrl.href));
      setCanInspectIframeDom(resolvedUrl.origin === window.location.origin);
    } catch {
      setCanUseIframe(false);
      setCanInspectIframeDom(false);
    }
  }, [currentStepPageUrl]);

  useEffect(() => {
    if (viewMode !== 'preview' || !isPlaying || !canUseIframe || !currentStepPageUrl) {
      setIframeState('idle');
      return;
    }

    setIframeState('loading');
    const timeoutId = window.setTimeout(() => {
      setIframeState((currentState) => (currentState === 'ready' ? currentState : 'blocked'));
    }, 12000);

    return () => window.clearTimeout(timeoutId);
  }, [viewMode, isPlaying, canUseIframe, currentStepPageUrl]);

  const handleNext = () => {
    if (!hasSteps) {
      return;
    }
    if (isLastStep) {
      setIsPlaying(false);
      setCurrentIndex(0);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const scrollLiveIframe = (deltaY: number, deltaMode = 0, clientX?: number, clientY?: number) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      return;
    }

    const win = iframe.contentWindow;
    let doc: Document;
    try {
      doc = win.document;
    } catch {
      // Cross-origin iframe: keep native page scrolling behavior.
      return;
    }

    const lineHeight = 16;
    const pageHeight = Math.max(1, iframe.clientHeight || 800);
    const deltaPx = deltaMode === 1 ? deltaY * lineHeight : deltaMode === 2 ? deltaY * pageHeight : deltaY;

    const canScrollY = (element: HTMLElement) => {
      const style = win.getComputedStyle(element);
      const overflowY = style.overflowY;
      const scrollable = /(auto|scroll|overlay)/.test(overflowY);
      return scrollable && element.scrollHeight - element.clientHeight > 1;
    };

    const tryScroll = (element: HTMLElement | null) => {
      if (!element || !canScrollY(element)) {
        return false;
      }

      const prevTop = element.scrollTop;
      const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
      const nextTop = Math.max(0, Math.min(maxTop, prevTop + deltaPx));
      if (Math.abs(nextTop - prevTop) < 0.1) {
        return false;
      }

      element.scrollTop = nextTop;
      return Math.abs(element.scrollTop - prevTop) > 0.1;
    };

    let didScroll = false;

    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const iframeRect = iframe.getBoundingClientRect();
      const localX = clientX - iframeRect.left;
      const localY = clientY - iframeRect.top;
      let node = doc.elementFromPoint(localX, localY) as HTMLElement | null;

      // Climb ancestors from hovered element to find the real scroll container.
      while (node && node !== doc.body && node !== doc.documentElement) {
        if (tryScroll(node)) {
          didScroll = true;
          break;
        }
        node = node.parentElement;
      }
    }

    if (!didScroll) {
      const rootScroller = (doc.scrollingElement || doc.documentElement || doc.body) as HTMLElement | null;
      didScroll = tryScroll(rootScroller);
    }

    if (!didScroll) {
      // Last resort for layouts that delegate scrolling to window.
      win.scrollBy({ top: deltaPx, left: 0, behavior: 'auto' });
    }

    syncLiveTargetRef.current?.();
  };

  const normalizedElements = hasStructuredContext && simulationContext
    ? simulationContext.elements.slice(0, 60).map((item) => ({
        ...item,
        rect: normalizeRect(item.bbox, simulationContext.viewport),
      }))
    : [];

  const currentElement = hasStructuredContext && currentStep
    ? findBestElementForStep(currentStep, normalizedElements)
    : null;

  const normalizedCurrentRect = currentElement?.rect || null;

  const fallbackPageTitle = simulationContext?.pageTitle || tourName || 'Page inconnue';
  const fallbackPageUrl = currentStepPageUrl;
  const iframePageUrl = withSimulatorPreviewFlag(fallbackPageUrl);
  const iframePrevStepPageUrl = withSimulatorPreviewFlag(prevStepPageUrl);
  const iframeNextStepPageUrl = withSimulatorPreviewFlag(nextStepPageUrl);
  const currentStepIndex = currentStep ? steps.findIndex((step) => step.id === currentStep.id) : 0;
  const matchedElements = normalizedElements.filter((item) => {
    if (!currentStep?.targetSelector) return false;
    if (item.selector === currentStep.targetSelector) return true;

    const sourceToken = extractStableSelectorToken(currentStep.targetSelector);
    return sourceToken ? extractStableSelectorToken(item.selector) === sourceToken : false;
  });
  const visibleDebugElements = simulationContext?.elements.slice(0, 12) || [];
  const shouldRenderLiveIframe = viewMode === 'preview' && canUseIframe && Boolean(fallbackPageUrl);
  const useLiveIframe = shouldRenderLiveIframe && iframeState !== 'blocked';
  const isCrossOriginLive = useLiveIframe && !canInspectIframeDom;
  const isIframeReady = iframeState === 'ready';
  const isLiveCalibrating =
    useLiveIframe &&
    canInspectIframeDom &&
    isIframeReady &&
    Boolean(currentStep?.targetSelector) &&
    !liveTargetRect &&
    !liveCalibrationTimedOut;
  const isLiveTargetMissing =
    useLiveIframe &&
    canInspectIframeDom &&
    isIframeReady &&
    Boolean(currentStep?.targetSelector) &&
    !liveTargetRect &&
    liveCalibrationTimedOut;

  useEffect(() => {
    if (!useLiveIframe || !canInspectIframeDom || !isIframeReady || !currentStep?.targetSelector || !iframeRef.current || !stageRef.current) {
      setLiveTargetRect((prev) => (prev === null ? prev : null));
      setLiveCalibrationTimedOut((prev) => (prev === false ? prev : false));
      syncLiveTargetRef.current = null;
      return;
    }

    const iframe = iframeRef.current;
    const stage = stageRef.current;
    let targetResolved = false;
    setLiveCalibrationTimedOut((prev) => (prev === false ? prev : false));

    const syncTarget = () => {
      if (!iframe || !stage || !iframe.contentWindow) return;
      let doc: Document | null = null;
      try {
        doc = iframe.contentWindow.document;
      } catch {
        // Cross-origin live preview: iframe can render, but DOM probing is restricted.
        setLiveTargetRect((prev) => (prev === null ? prev : null));
        return;
      }
      if (!doc) return;
      const selector = currentStep.targetSelector;
      if (!selector) {
        setLiveTargetRect((prev) => (prev === null ? prev : null));
        return;
      }

      const target = doc.querySelector(selector) as HTMLElement | null;
      if (!target) {
        setLiveTargetRect((prev) => (prev === null ? prev : null));
        return;
      }

      targetResolved = true;
      setLiveCalibrationTimedOut((prev) => (prev ? false : prev));

      const iframeRect = iframe.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const absoluteTop = iframeRect.top - stageRect.top + targetRect.top;
      const absoluteLeft = iframeRect.left - stageRect.left + targetRect.left;
      const stageWidth = Math.max(1, stageRect.width);
      const stageHeight = Math.max(1, stageRect.height);

      const nextRect: NormalizedRect = {
        // Keep preview highlight/anchor locked to the real selector,
        // even when the selector is partially outside the stage viewport.
        // Use a soft range to avoid tooltip snapping to a corner.
        topPct: clampRange((absoluteTop / stageHeight) * 100, LIVE_RECT_MIN_PCT, LIVE_RECT_MAX_PCT),
        leftPct: clampRange((absoluteLeft / stageWidth) * 100, LIVE_RECT_MIN_PCT, LIVE_RECT_MAX_PCT),
        widthPct: Math.max(2, (targetRect.width / stageWidth) * 100),
        heightPct: Math.max(2, (targetRect.height / stageHeight) * 100),
      };

      setLiveTargetRect((prev) => {
        if (
          prev &&
          Math.abs(prev.topPct - nextRect.topPct) < 0.005 &&
          Math.abs(prev.leftPct - nextRect.leftPct) < 0.005 &&
          Math.abs(prev.widthPct - nextRect.widthPct) < 0.005 &&
          Math.abs(prev.heightPct - nextRect.heightPct) < 0.005
        ) {
          return prev;
        }
        return nextRect;
      });
    };

    syncLiveTargetRef.current = syncTarget;
    syncTarget();

    // Bootstrap sync: iframe content can hydrate after onLoad.
    // Retry briefly so calibration completes even without user scroll.
    let attempts = 0;
    const maxAttempts = 24; // ~6s at 250ms
    let backgroundRetryInterval: number | null = null;

    const bootstrapInterval = window.setInterval(() => {
      attempts += 1;
      syncTarget();

      if (targetResolved && backgroundRetryInterval !== null) {
        window.clearInterval(backgroundRetryInterval);
        backgroundRetryInterval = null;
      }

      if (attempts >= maxAttempts) {
        if (!targetResolved) {
          setLiveCalibrationTimedOut((prev) => (prev ? prev : true));

          // Keep a low-frequency retry running so the first step can recover
          // once the live page finishes late hydration, without requiring user interaction.
          if (backgroundRetryInterval === null) {
            backgroundRetryInterval = window.setInterval(() => {
              syncTarget();
              if (targetResolved && backgroundRetryInterval !== null) {
                window.clearInterval(backgroundRetryInterval);
                backgroundRetryInterval = null;
              }
            }, 1000);
          }
        }
        window.clearInterval(bootstrapInterval);
      }
    }, 250);

    const win = iframe.contentWindow;
    win?.addEventListener('scroll', syncTarget, true);
    window.addEventListener('resize', syncTarget);

    return () => {
      window.clearInterval(bootstrapInterval);
      if (backgroundRetryInterval !== null) {
        window.clearInterval(backgroundRetryInterval);
      }
      win?.removeEventListener('scroll', syncTarget, true);
      window.removeEventListener('resize', syncTarget);
      syncLiveTargetRef.current = null;
    };
  }, [useLiveIframe, canInspectIframeDom, isIframeReady, currentStep?.targetSelector, safeIndex]);

  useEffect(() => {
    if (!useLiveIframe || canInspectIframeDom || !isIframeReady || !currentStep?.targetSelector || !iframeRef.current || !stageRef.current) {
      return;
    }

    const selector = currentStep.targetSelector;
    const iframe = iframeRef.current;
    const stage = stageRef.current;
    const targetWindow = iframe.contentWindow;
    if (!targetWindow) return;

    let resolved = false;
    setLiveCalibrationTimedOut((prev) => (prev ? false : prev));
    setLiveTargetRect((prev) => (prev === null ? prev : null));

    const updateFromRect = (rect: { top: number; left: number; width: number; height: number }) => {
      const iframeRect = iframe.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const stageWidth = Math.max(1, stageRect.width);
      const stageHeight = Math.max(1, stageRect.height);

      const absoluteTop = iframeRect.top - stageRect.top + rect.top;
      const absoluteLeft = iframeRect.left - stageRect.left + rect.left;

      const nextRect: NormalizedRect = {
        // Keep preview highlight/anchor locked to the real selector,
        // even when the selector is partially outside the stage viewport.
        // Use a soft range to avoid tooltip snapping to a corner.
        topPct: clampRange((absoluteTop / stageHeight) * 100, LIVE_RECT_MIN_PCT, LIVE_RECT_MAX_PCT),
        leftPct: clampRange((absoluteLeft / stageWidth) * 100, LIVE_RECT_MIN_PCT, LIVE_RECT_MAX_PCT),
        widthPct: Math.max(2, (rect.width / stageWidth) * 100),
        heightPct: Math.max(2, (rect.height / stageHeight) * 100),
      };

      setLiveTargetRect((prev) => {
        if (
          prev &&
          Math.abs(prev.topPct - nextRect.topPct) < 0.005 &&
          Math.abs(prev.leftPct - nextRect.leftPct) < 0.005 &&
          Math.abs(prev.widthPct - nextRect.widthPct) < 0.005 &&
          Math.abs(prev.heightPct - nextRect.heightPct) < 0.005
        ) {
          return prev;
        }
        return nextRect;
      });
      resolved = true;
      setLiveCalibrationTimedOut((prev) => (prev ? false : prev));
    };

    const requestRect = () => {
      targetWindow.postMessage(
        {
          type: 'TRUSTDEV_PREVIEW_REQUEST_TARGET',
          selector,
        },
        '*',
      );
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== targetWindow) return;
      const data = event.data as PreviewBridgeRectMessage | null;
      if (!data || data.type !== 'TRUSTDEV_PREVIEW_TARGET_RECT' || data.selector !== selector || !data.rect) {
        return;
      }
      updateFromRect(data.rect);
    };

    window.addEventListener('message', onMessage);
    requestRect();
    const pollId = window.setInterval(requestRect, 700);
    const timeoutId = window.setTimeout(() => {
      if (!resolved) {
        setLiveCalibrationTimedOut((prev) => (prev ? prev : true));
      }
    }, 7000);

    return () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(pollId);
      window.clearTimeout(timeoutId);
    };
  }, [useLiveIframe, canInspectIframeDom, isIframeReady, currentStep?.targetSelector, safeIndex]);

  // In live mode, only trust the real iframe DOM measurement.
  // This avoids a stale first pointer from structured snapshot coordinates.
  const targetRectForTooltip = useLiveIframe && isIframeReady ? liveTargetRect : normalizedCurrentRect;
  const tooltipPlacement = targetRectForTooltip
    ? resolveTooltipPlacement(targetRectForTooltip, currentStep?.position)
    : (currentStep?.position || 'BOTTOM');

  // eslint-disable-next-line react-hooks/refs
  const stageRectForTooltip = stageRef.current?.getBoundingClientRect();
  const tooltipStyle = arrowAnchorPixels && stageRectForTooltip
    ? clampTooltipStyle(getTooltipPositionFromArrowAnchor(arrowAnchorPixels.x, arrowAnchorPixels.y, tooltipPlacement, stageRectForTooltip))
    : undefined;
  const previewUiSafeTopPx = 64;
  const previewUiSafeTopPct = stageRectForTooltip
    ? (previewUiSafeTopPx / Math.max(1, stageRectForTooltip.height)) * 100
    : 0;
  const rawHighlightTopPct = targetRectForTooltip?.topPct ?? 0;
  const rawHighlightLeftPct = targetRectForTooltip?.leftPct ?? 0;
  const rawHighlightWidthPct = targetRectForTooltip?.widthPct ?? 0;
  const rawHighlightHeightPct = targetRectForTooltip?.heightPct ?? 0;
  const rawHighlightBottomPct = rawHighlightTopPct + rawHighlightHeightPct;
  const rawHighlightRightPct = rawHighlightLeftPct + rawHighlightWidthPct;
  const clippedHighlightTopPct = Math.max(rawHighlightTopPct, previewUiSafeTopPct);
  const clippedHighlightHeightPct = Math.max(0, rawHighlightBottomPct - clippedHighlightTopPct);
  const canRenderClippedHighlight = clippedHighlightHeightPct > 0.5;
  const clippedEdgeLineLeftPct = clampRange(rawHighlightLeftPct, 0, 100);
  const clippedEdgeLineRightPct = clampRange(rawHighlightRightPct, 0, 100);
  const clippedEdgeLineWidthPct = Math.max(0, clippedEdgeLineRightPct - clippedEdgeLineLeftPct);
  const shouldShowTopEdgeLine = rawHighlightTopPct < previewUiSafeTopPct && clippedEdgeLineWidthPct > 0.5;
  const shouldShowBottomEdgeLine = rawHighlightBottomPct > 100 && clippedEdgeLineWidthPct > 0.5;
  const shouldShowEdgeLine = shouldShowTopEdgeLine || shouldShowBottomEdgeLine;
  const shouldRenderFullHighlight = canRenderClippedHighlight && !shouldShowEdgeLine;

  useEffect(() => {
    if (!stageRef.current || !targetRectForTooltip || viewMode !== 'preview') {
      setConnectorPath((prev) => (prev === null ? prev : null));
      setConnectorStart((prev) => (prev === null ? prev : null));
      setArrowAnchorPixels((prev) => (prev === null ? prev : null));
      return;
    }

    const stageRect = stageRef.current.getBoundingClientRect();

    const clampPointToStage = (point: { x: number; y: number }): { x: number; y: number } => ({
      x: clampRange(point.x, 0, stageRect.width),
      y: clampRange(point.y, previewUiSafeTopPx, stageRect.height),
    });

    // Target-side anchor (the arrow head must point here).
    const targetAnchor = clampPointToStage(
      getArrowAnchorOnTarget(tooltipPlacement, targetRectForTooltip, stageRect),
    );

    // Tooltip-side anchor (tail of the arrow).
    let tooltipAnchor = getTooltipAnchorPoint(tooltipPlacement, targetAnchor.x, targetAnchor.y);
    const tooltipEl = tooltipRef.current;
    if (tooltipEl) {
      const tooltipRect = tooltipEl.getBoundingClientRect();
      tooltipAnchor = getRectBoundaryPoint(
        {
          top: tooltipRect.top - stageRect.top,
          left: tooltipRect.left - stageRect.left,
          width: tooltipRect.width,
          height: tooltipRect.height,
        },
        targetAnchor,
      );
    }
    tooltipAnchor = clampPointToStage(tooltipAnchor);

    // Draw smooth curve from tooltip to target so markerEnd points at selector.
    const dx = targetAnchor.x - tooltipAnchor.x;
    const dy = targetAnchor.y - tooltipAnchor.y;
    const c1 = {
      x: tooltipAnchor.x + dx * 0.28,
      y: tooltipAnchor.y + (Math.abs(dy) > 20 ? dy * 0.1 : (dy >= 0 ? 18 : -18)),
    };
    const c2 = {
      x: tooltipAnchor.x + dx * 0.72,
      y: targetAnchor.y - (Math.abs(dy) > 20 ? dy * 0.16 : (dy >= 0 ? 12 : -12)),
    };

    const nextPath = `M ${tooltipAnchor.x} ${tooltipAnchor.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${targetAnchor.x} ${targetAnchor.y}`;

    setConnectorStart((prev) => {
      if (prev && Math.abs(prev.x - tooltipAnchor.x) < 0.1 && Math.abs(prev.y - tooltipAnchor.y) < 0.1) {
        return prev;
      }
      return tooltipAnchor;
    });

    setConnectorPath((prev) => (prev === nextPath ? prev : nextPath));

    // Store arrow anchor for tooltip positioning
    setArrowAnchorPixels((prev) => {
      if (prev && Math.abs(prev.x - tooltipAnchor.x) < 0.1 && Math.abs(prev.y - tooltipAnchor.y) < 0.1) {
        return prev;
      }
      return tooltipAnchor;
    });
  }, [targetRectForTooltip, tooltipPlacement, safeIndex, viewMode]);

  if (!hasSteps || !currentStep) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/75 p-8 text-center dark:border-white/15 dark:bg-slate-900/45">
        <Icons.info className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Aucune étape à simuler</h3>
        <p className="text-muted-foreground mb-6">Ajoutez des étapes à votre parcours pour pouvoir tester l&apos;expérience utilisateur.</p>
        <Button onClick={onExitPreview}>Retour à l&apos;édition</Button>
      </div>
    );
  }

  if (!isPlaying) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/75 p-8 dark:border-white/15 dark:bg-slate-900/45">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white/95 p-8 text-center shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Icons.play className="h-8 w-8 text-primary ml-1" />
          </div>
          <div>
            <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Pret a simuler ?</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Découvrez exactement ce que verront vos utilisateurs. {steps.length} étape(s) prêtes à être jouées.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={onExitPreview}
              className="transition-transform hover:scale-105 active:scale-[0.99]"
            >
              Quitter
            </Button>
            <Button
              onClick={() => setIsPlaying(true)}
              className="gap-2 transition-transform hover:scale-105 active:scale-[0.99] shadow-[0_0_24px_rgba(255,107,0,0.25)]"
            >
              <Icons.play className="h-4 w-4 fill-current" /> Lancer la simulation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderDebugPanel = () => (
    <div className="absolute left-4 bottom-4 z-40 w-90 max-w-[calc(100%-2rem)] space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 text-slate-700 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-950/85 dark:text-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Debug view</p>
          <h4 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{fallbackPageTitle}</h4>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => setViewMode('preview')}>
          <Icons.close className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400">URL</span>
          <span className="truncate text-right text-slate-700 dark:text-slate-200">{fallbackPageUrl || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400">Route</span>
          <span className="truncate text-right text-slate-700 dark:text-slate-200">{simulationContext?.pathname || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400">Viewport</span>
          <span className="text-slate-700 dark:text-slate-200">{simulationContext ? `${simulationContext.viewport.width} × ${simulationContext.viewport.height}` : '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400">Elements</span>
          <span className="text-slate-700 dark:text-slate-200">{simulationContext?.elements.length ?? 0}</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/55">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-300">
          <span>Current step</span>
          <span>{currentStepIndex + 1}/{steps.length}</span>
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{currentStep.title || 'Sans titre'}</p>
        <p className="mt-1 text-xs text-slate-600 wrap-break-word dark:text-slate-300">{currentStep.targetSelector || 'Aucun sélecteur de cible'}</p>
        <p className="mt-1 text-xs text-slate-600 wrap-break-word dark:text-slate-300">{currentStep.position || 'BOTTOM'}</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>Matched elements</span>
          <span>{matchedElements.length}</span>
        </div>
        {matchedElements.length > 0 ? (
          <div className="max-h-24 space-y-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300">
            {matchedElements.map((item) => (
              <div key={item.selector} className="wrap-break-word">
                <p className="font-medium text-slate-900 dark:text-slate-100">{item.selector}</p>
                <p className="text-slate-600 dark:text-slate-300">{item.tag}{item.intent ? ` · ${item.intent}` : ''}{item.actionable ? ' · actionable' : ''}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-400">
            Aucun élément snapshot ne correspond au sélecteur de cette étape.
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>Aperçu éléments</span>
          <span>{visibleDebugElements.length}</span>
        </div>
        <div className="max-h-28 space-y-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300">
          {visibleDebugElements.length > 0 ? visibleDebugElements.map((item) => (
            <div key={item.selector} className="wrap-break-word">
              <span className="font-medium text-slate-900 dark:text-slate-100">{item.tag}</span>
              <span className="text-slate-500 dark:text-slate-400"> · {item.selector}</span>
              {item.text ? <p className="line-clamp-2 text-slate-500 dark:text-slate-400">{item.text}</p> : null}
            </div>
          )) : (
            <p className="text-slate-400">Aucun snapshot disponible.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={stageRef} className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white/65 dark:border-white/10 dark:bg-slate-900/50">
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-md backdrop-blur dark:border-white/10 dark:bg-slate-950/85">
        <Button
          variant={viewMode === 'preview' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 text-xs text-slate-700 dark:text-slate-200"
          onClick={() => setViewMode('preview')}
        >
          <Icons.eye className="h-3.5 w-3.5 mr-1" /> Preview
        </Button>
        <Button
          variant={viewMode === 'debug' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 text-xs text-slate-700 dark:text-slate-200"
          onClick={() => setViewMode('debug')}
        >
          Debug
        </Button>
        {canUseIframe ? (
          <div className="ml-1 flex items-center gap-1 rounded-md border border-emerald-300/60 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Icons.globe className="h-3 w-3" /> Live iframe
          </div>
        ) : null}
      </div>

      {useLiveIframe ? (
        <div
          className="absolute inset-x-0 bottom-0 top-16 overflow-hidden rounded-xl bg-slate-100/45 dark:bg-slate-950/5"
          onWheel={
            useLiveIframe && canInspectIframeDom
              ? (event) => {
                  event.preventDefault();
                  scrollLiveIframe(event.deltaY, event.deltaMode, event.clientX, event.clientY);
                }
              : undefined
          }
        >
          <iframe
            ref={iframeRef}
            src={iframePageUrl}
            title={tourName || 'Tour preview'}
            className={cn(
              'h-full w-full border-0 bg-white',
              isCrossOriginLive ? 'pointer-events-auto' : 'pointer-events-none',
            )}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            onLoad={() => {
              setIframeState('ready');
              // Ensure a second pass after layout/paint so first arrow position is fresh.
              window.requestAnimationFrame(() => {
                syncLiveTargetRef.current?.();
              });
            }}
            onError={() => setIframeState('blocked')}
          />

          {useLiveIframe && iframePrevStepPageUrl && iframePrevStepPageUrl !== iframePageUrl ? (
            <iframe
              src={iframePrevStepPageUrl}
              title={`${tourName || 'Tour preview'} prev-step-prefetch`}
              className="absolute inset-0 h-full w-full border-0 opacity-0 pointer-events-none"
              aria-hidden="true"
              tabIndex={-1}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
          ) : null}

          {useLiveIframe && iframeNextStepPageUrl && iframeNextStepPageUrl !== iframePageUrl && iframeNextStepPageUrl !== iframePrevStepPageUrl ? (
            <iframe
              src={iframeNextStepPageUrl}
              title={`${tourName || 'Tour preview'} next-step-prefetch`}
              className="absolute inset-0 h-full w-full border-0 opacity-0 pointer-events-none"
              aria-hidden="true"
              tabIndex={-1}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
          ) : null}

          {iframeState === 'loading' ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-100/45 backdrop-blur-[1px]">
              <div className="rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-sm">
                Chargement de l&apos;étape suivante...
              </div>
            </div>
          ) : null}

          {/* Live iframe status bar intentionally hidden for cleaner preview. */}
        </div>
      ) : hasStructuredContext ? (
        <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden">
          <div className="relative h-full w-full rounded-xl border border-slate-200 bg-white/90 shadow-inner">
            {normalizedElements.map((element) => (
              <div
                key={element.selector}
                className={cn(
                  'absolute rounded-md border text-[10px] leading-tight transition-colors',
                  element.actionable ? 'border-sky-300 bg-sky-100/70' : 'border-slate-300 bg-slate-100/80',
                  currentElement?.selector === element.selector ? 'border-primary bg-primary/15 shadow-md' : '',
                )}
                style={{
                  top: `${element.rect.topPct}%`,
                  left: `${element.rect.leftPct}%`,
                  width: `${element.rect.widthPct}%`,
                  height: `${element.rect.heightPct}%`,
                  minHeight: 18,
                  minWidth: 22,
                }}
                title={`${element.selector}${element.text ? ` - ${element.text}` : ''}`}
              >
                <div className="line-clamp-2 p-1 font-medium text-slate-700">{element.text || element.tag}</div>
              </div>
            ))}

            {canUseIframe && iframeState === 'loading' ? (
              <div className="pointer-events-none absolute inset-x-4 top-4 z-30 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
                Chargement live iframe en arrière-plan... bascule auto dès qu&apos;il est prêt.
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 top-16 p-8 flex flex-col gap-6 opacity-50 pointer-events-none">
          <div className="h-12 bg-slate-300 rounded-md w-full flex items-center px-4 gap-4">
            <div className="h-6 w-32 bg-slate-400 rounded-md"></div>
            <div className="h-6 w-16 bg-slate-400 rounded-md ml-auto"></div>
            <div className="h-8 w-8 bg-slate-400 rounded-full"></div>
          </div>
          <div className="flex gap-6 flex-1">
            <div className="w-64 bg-slate-300 rounded-md h-full space-y-4 p-4">
              <div className="h-4 w-full bg-slate-400 rounded-md"></div>
              <div className="h-4 w-3/4 bg-slate-400 rounded-md"></div>
              <div className="h-4 w-5/6 bg-slate-400 rounded-md"></div>
            </div>
            <div className="flex-1 space-y-6">
              <div className="h-64 bg-slate-300 rounded-md" />
              <div className="flex gap-6">
                <div className="h-48 flex-1 bg-slate-300 rounded-md" />
                <div className="h-48 flex-1 bg-slate-300 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spotlight "mettre en evidence" autour de la cible */}
      {currentStep.highlightElement && viewMode === 'preview' && targetRectForTooltip && shouldRenderFullHighlight ? (
        <div
          className="pointer-events-none absolute z-[15] rounded-md border-2 border-primary/90 transition-all duration-300"
          style={{
            top: `${clippedHighlightTopPct}%`,
            left: `${rawHighlightLeftPct}%`,
            width: `${rawHighlightWidthPct}%`,
            height: `${clippedHighlightHeightPct}%`,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.45), 0 0 0 6px rgba(59, 130, 246, 0.2)',
          }}
        />
      ) : null}
      {currentStep.highlightElement && viewMode === 'preview' && targetRectForTooltip && shouldShowTopEdgeLine ? (
        <div
          className="pointer-events-none absolute z-[16]"
          style={{
            top: `${previewUiSafeTopPct}%`,
            left: `${clippedEdgeLineLeftPct}%`,
            width: `${clippedEdgeLineWidthPct}%`,
            height: 2,
            borderRadius: 999,
            background: 'rgba(249, 115, 22, 0.9)',
            boxShadow: '0 0 0 3px rgba(148, 163, 184, 0.38)',
          }}
        />
      ) : null}
      {currentStep.highlightElement && viewMode === 'preview' && targetRectForTooltip && shouldShowBottomEdgeLine ? (
        <div
          className="pointer-events-none absolute z-[16]"
          style={{
            bottom: 0,
            left: `${clippedEdgeLineLeftPct}%`,
            width: `${clippedEdgeLineWidthPct}%`,
            height: 2,
            borderRadius: 999,
            background: 'rgba(249, 115, 22, 0.9)',
            boxShadow: '0 0 0 3px rgba(148, 163, 184, 0.38)',
          }}
        />
      ) : null}

      {connectorPath ? (
        <svg className="pointer-events-none absolute inset-0 z-30" width="100%" height="100%" aria-hidden="true">
          <defs>
            <marker id="tooltipArrowHead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0 L10 5 L0 10 z" fill="#ec4899" />
            </marker>
          </defs>
          <path d={connectorPath} fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#tooltipArrowHead)" />
          {connectorStart ? <circle cx={connectorStart.x} cy={connectorStart.y} r="3.5" fill="#f97316" stroke="rgba(255,255,255,0.72)" strokeWidth="1" /> : null}
        </svg>
      ) : null}

      {/* Cible et Tooltip */}
      <div
        className={cn('relative z-20 flex h-full w-full items-center justify-center', isCrossOriginLive ? 'pointer-events-none' : '')}
        onWheel={
          useLiveIframe && canInspectIframeDom
            ? (event) => {
                event.preventDefault();
                scrollLiveIframe(event.deltaY, event.deltaMode, event.clientX, event.clientY);
              }
            : undefined
        }
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {currentStep.position !== 'CENTER' && !hasStructuredContext && viewMode === 'preview' && !useLiveIframe && (
            <div className={cn(
              "relative bg-white border-2 border-dashed border-primary p-4 rounded-md shadow-sm transition-all duration-300 min-w-62.5 text-center flex items-center justify-center pointer-events-none",
              currentStep.highlightElement ? 'ring-4 ring-primary ring-opacity-50 z-30 bg-white shadow-xl' : ''
            )}>
              <span className="text-primary font-medium flex items-center gap-2">
                <Icons.target className="h-5 w-5" />
                {currentStep.targetSelector ? `Cible : ${currentStep.targetSelector}` : 'Élément cible'}
              </span>
            </div>
          )}

          {hasStructuredContext && targetRectForTooltip && viewMode === 'preview' && !useLiveIframe && shouldRenderFullHighlight ? (
            <div
              className={cn(
                'absolute rounded-md border-2 border-dashed border-primary pointer-events-none',
                currentStep.highlightElement ? 'ring-4 ring-primary/60 shadow-[0_0_0_3px_rgba(59,130,246,0.25)]' : '',
              )}
              style={{
                top: `${clippedHighlightTopPct}%`,
                left: `${rawHighlightLeftPct}%`,
                width: `${rawHighlightWidthPct}%`,
                height: `${clippedHighlightHeightPct}%`,
              }}
            />
          ) : null}

          {/* Conteneur de l'infobulle centré sur la cible, avec positionnement dynamique */}
          {viewMode === 'preview' && !(useLiveIframe && isLiveCalibrating) ? (
            <div
              className={cn(
                'absolute flex transition-all duration-300 pointer-events-auto z-50',
                (hasStructuredContext || useLiveIframe) ? 'origin-center' :
                  currentStep.position === 'TOP' ? 'bottom-full left-1/2 -translate-x-1/2 mb-4 flex-col items-center origin-bottom' :
                  currentStep.position === 'BOTTOM' ? 'top-full left-1/2 -translate-x-1/2 mt-4 flex-col-reverse items-center origin-top' :
                  currentStep.position === 'LEFT' ? 'right-full top-1/2 -translate-y-1/2 mr-4 flex-row items-center origin-right' :
                  currentStep.position === 'RIGHT' ? 'left-full top-1/2 -translate-y-1/2 ml-4 flex-row-reverse items-center origin-left' :
                  currentStep.position === 'TOP_LEFT' ? 'bottom-full right-full mb-4 mr-4 flex-col items-end origin-bottom-right' :
                  currentStep.position === 'TOP_RIGHT' ? 'bottom-full left-full mb-4 ml-4 flex-col items-start origin-bottom-left' :
                  currentStep.position === 'BOTTOM_LEFT' ? 'top-full right-full mt-4 mr-4 flex-col-reverse items-end origin-top-right' :
                  currentStep.position === 'BOTTOM_RIGHT' ? 'top-full left-full mt-4 ml-4 flex-col-reverse items-start origin-top-left' :
                  'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center'
              )}
              style={
                isCrossOriginLive && !targetRectForTooltip
                  ? { right: '16px', bottom: '16px', top: 'auto', left: 'auto', transform: 'none' }
                  : (hasStructuredContext || useLiveIframe)
                    ? (tooltipStyle || { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
                  : undefined
              }
              onWheel={
                useLiveIframe && canInspectIframeDom
                  ? (event) => {
                      event.preventDefault();
                      scrollLiveIframe(event.deltaY, event.deltaMode, event.clientX, event.clientY);
                    }
                  : undefined
              }
            >

            {/* Infobulle */}
            <div ref={tooltipRef} className="bg-white rounded-lg shadow-2xl p-5 w-87.5 text-left border border-slate-100 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
              <div className="mb-2 flex items-start justify-between">
                <h3 className="text-lg font-semibold text-slate-900 leading-tight">{currentStep.title || "Sans titre"}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-1 text-slate-400 hover:text-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkip();
                  }}
                >
                  <Icons.close className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-slate-600 text-sm mb-6 whitespace-pre-wrap leading-relaxed">
                {currentStep.content || "Aucun contenu défini pour cette étape."}
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-1">
                  {steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        idx === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-slate-200"
                      )}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {currentStep.skipAllowed !== false && !isLastStep && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-slate-700 transition-transform hover:scale-105 hover:bg-slate-200 hover:text-slate-900 active:scale-[0.99] dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSkip();
                      }}
                    >
                      Passer
                    </Button>
                  )}
                  {currentIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 border-slate-300 text-slate-700 transition-transform hover:scale-105 hover:bg-slate-200 hover:text-slate-900 active:scale-[0.99] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrev();
                      }}
                    >
                      <Icons.chevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 shadow-sm transition-transform hover:scale-105 hover:shadow-[0_10px_24px_rgba(249,115,22,0.28)] active:scale-[0.99]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                  >
                    {isLastStep ? 'Terminer' : 'Suivant'}
                  </Button>
                </div>
              </div>
            </div>
            </div>
          ) : null}

          {viewMode === 'preview' && useLiveIframe && isLiveCalibrating ? (
            <div className="absolute z-50 max-w-[min(92vw,680px)] rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
              Calibration de la cible en cours...
            </div>
          ) : null}
        </div>
      </div>

      {viewMode === 'debug' ? renderDebugPanel() : null}

      {/* Floating control panel */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-md backdrop-blur animate-in slide-in-from-top-4 dark:border-white/10 dark:bg-slate-950/85">
        <div className="h-8 px-3 rounded-md text-xs font-bold flex items-center gap-1 border border-amber-400/25 bg-amber-500/10 text-amber-300">
          <Icons.eye className="h-3 w-3" /> PREVIEW
        </div>
        {fallbackPageUrl ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-transform hover:scale-105 active:scale-[0.99] dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={() => window.open(fallbackPageUrl, '_blank', 'noopener,noreferrer')}
          >
            <Icons.globe className="h-3.5 w-3.5 mr-1" /> Ouvrir la page
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onExitPreview} className="h-8 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-transform hover:scale-105 active:scale-[0.99] dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white">
          Quitter la simulation
        </Button>
      </div>

    </div>
  );
}