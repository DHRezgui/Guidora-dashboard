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

function getTooltipStyle(rect: NormalizedRect, position?: Step['position']) {
  const pos = resolveTooltipPlacement(rect, position);
  const left = rect.leftPct;
  const right = rect.leftPct + rect.widthPct;
  const top = rect.topPct;
  const bottom = rect.topPct + rect.heightPct;

  if (pos === 'CENTER') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    } as const;
  }

  const centerX = left + rect.widthPct / 2;
  const centerY = top + rect.heightPct / 2;
  const gap = 2;

  switch (pos) {
    case 'TOP':
      return { top: `${top - gap}%`, left: `${centerX}%`, transform: 'translate(-50%, -100%)' } as const;
    case 'LEFT':
      return { top: `${centerY}%`, left: `${left - gap}%`, transform: 'translate(-100%, -50%)' } as const;
    case 'RIGHT':
      return { top: `${centerY}%`, left: `${right + gap}%`, transform: 'translate(0, -50%)' } as const;
    case 'TOP_LEFT':
      return { top: `${top - gap}%`, left: `${left}%`, transform: 'translate(0, -100%)' } as const;
    case 'TOP_RIGHT':
      return { top: `${top - gap}%`, left: `${right}%`, transform: 'translate(-100%, -100%)' } as const;
    case 'BOTTOM_LEFT':
      return { top: `${bottom + gap}%`, left: `${left}%`, transform: 'translate(0, 0)' } as const;
    case 'BOTTOM_RIGHT':
      return { top: `${bottom + gap}%`, left: `${right}%`, transform: 'translate(-100%, 0)' } as const;
    case 'BOTTOM':
    default:
      return { top: `${bottom + gap}%`, left: `${centerX}%`, transform: 'translate(-50%, 0)' } as const;
  }
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
  // Arrow length in pixels
  const arrowLength = 60;
  
  switch (placement) {
    case 'LEFT':
    case 'TOP_LEFT':
    case 'BOTTOM_LEFT':
      return {
        x: arrowStartX - arrowLength,
        y: arrowStartY,
      };
    case 'RIGHT':
    case 'TOP_RIGHT':
    case 'BOTTOM_RIGHT':
      return {
        x: arrowStartX + arrowLength,
        y: arrowStartY,
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
  const [liveTargetRect, setLiveTargetRect] = useState<NormalizedRect | null>(null);
  const [liveCalibrationTimedOut, setLiveCalibrationTimedOut] = useState(false);
  const [connectorPath, setConnectorPath] = useState<string | null>(null);
  const [connectorStart, setConnectorStart] = useState<{ x: number; y: number } | null>(null);
  const [arrowAnchorPixels, setArrowAnchorPixels] = useState<{ x: number; y: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const syncLiveTargetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  const hasStructuredContext =
    Boolean(simulationContext?.viewport?.width) &&
    Boolean(simulationContext?.viewport?.height) &&
    Boolean(simulationContext?.elements?.length);

  useEffect(() => {
    if (!targetUrl || typeof window === 'undefined') {
      setCanUseIframe(false);
      return;
    }

    try {
      const resolvedUrl = new URL(targetUrl, window.location.origin);
      setCanUseIframe(resolvedUrl.origin === window.location.origin);
    } catch {
      setCanUseIframe(false);
    }
  }, [targetUrl]);

  useEffect(() => {
    if (viewMode !== 'preview' || !isPlaying || !canUseIframe || !targetUrl) {
      setIframeState('idle');
      return;
    }

    setIframeState('loading');
    const timeoutId = window.setTimeout(() => {
      setIframeState((currentState) => (currentState === 'ready' ? currentState : 'blocked'));
    }, 12000);

    return () => window.clearTimeout(timeoutId);
  }, [viewMode, isPlaying, canUseIframe, targetUrl]);

  const hasSteps = steps.length > 0;
  const safeIndex = hasSteps ? Math.min(currentIndex, steps.length - 1) : 0;
  const currentStep = hasSteps ? steps[safeIndex] : null;
  const isLastStep = hasSteps ? safeIndex === steps.length - 1 : false;

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
    if (!iframe?.contentWindow?.document) {
      return;
    }

    const win = iframe.contentWindow;
    const doc = win.document;

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
  const fallbackPageUrl = simulationContext?.pageUrl || targetUrl;
  const fallbackMainSelector = currentStep?.targetSelector || steps.find((step) => step.targetSelector)?.targetSelector;
  const currentStepIndex = currentStep ? steps.findIndex((step) => step.id === currentStep.id) : 0;
  const matchedElements = normalizedElements.filter((item) => {
    if (!currentStep?.targetSelector) return false;
    if (item.selector === currentStep.targetSelector) return true;

    const sourceToken = extractStableSelectorToken(currentStep.targetSelector);
    return sourceToken ? extractStableSelectorToken(item.selector) === sourceToken : false;
  });
  const visibleDebugElements = simulationContext?.elements.slice(0, 12) || [];
  const useLiveIframe = viewMode === 'preview' && canUseIframe && iframeState === 'ready' && Boolean(fallbackPageUrl);
  const isLiveCalibrating = useLiveIframe && Boolean(currentStep?.targetSelector) && !liveTargetRect && !liveCalibrationTimedOut;
  const isLiveTargetMissing = useLiveIframe && Boolean(currentStep?.targetSelector) && !liveTargetRect && liveCalibrationTimedOut;

  useEffect(() => {
    if (!useLiveIframe || !currentStep?.targetSelector || !iframeRef.current || !stageRef.current) {
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
      if (!iframe || !stage || !iframe.contentWindow?.document) {
        return;
      }

      const doc = iframe.contentWindow.document;
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
        topPct: clampPercent((absoluteTop / stageHeight) * 100),
        leftPct: clampPercent((absoluteLeft / stageWidth) * 100),
        widthPct: Math.max(2, clampPercent((targetRect.width / stageWidth) * 100)),
        heightPct: Math.max(2, clampPercent((targetRect.height / stageHeight) * 100)),
      };

      setLiveTargetRect((prev) => {
        if (
          prev &&
          Math.abs(prev.topPct - nextRect.topPct) < 0.05 &&
          Math.abs(prev.leftPct - nextRect.leftPct) < 0.05 &&
          Math.abs(prev.widthPct - nextRect.widthPct) < 0.05 &&
          Math.abs(prev.heightPct - nextRect.heightPct) < 0.05
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
  }, [useLiveIframe, currentStep?.targetSelector, safeIndex]);

  // In live mode, only trust the real iframe DOM measurement.
  // This avoids a stale first pointer from structured snapshot coordinates.
  const targetRectForTooltip = useLiveIframe ? liveTargetRect : normalizedCurrentRect;
  const tooltipPlacement = targetRectForTooltip
    ? resolveTooltipPlacement(targetRectForTooltip, currentStep?.position)
    : (currentStep?.position || 'BOTTOM');

  const tooltipStyle = arrowAnchorPixels && stageRef.current
    ? clampTooltipStyle(getTooltipPositionFromArrowAnchor(arrowAnchorPixels.x, arrowAnchorPixels.y, tooltipPlacement, stageRef.current.getBoundingClientRect()))
    : undefined;

  useEffect(() => {
    if (!stageRef.current || !targetRectForTooltip || viewMode !== 'preview') {
      setConnectorPath((prev) => (prev === null ? prev : null));
      setConnectorStart((prev) => (prev === null ? prev : null));
      setArrowAnchorPixels((prev) => (prev === null ? prev : null));
      return;
    }

    const stageRect = stageRef.current.getBoundingClientRect();

    // Target-side anchor (the arrow head must point here).
    const targetAnchor = getArrowAnchorOnTarget(tooltipPlacement, targetRectForTooltip, stageRect);

    // Tooltip-side anchor (tail of the arrow).
    const tooltipAnchor = getTooltipAnchorPoint(tooltipPlacement, targetAnchor.x, targetAnchor.y);

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
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 w-full rounded-2xl border-2 border-dashed border-slate-200">
        <Icons.info className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Aucune étape à simuler</h3>
        <p className="text-muted-foreground mb-6">Ajoutez des étapes à votre parcours pour pouvoir tester l'expérience utilisateur.</p>
        <Button onClick={onExitPreview}>Retour à l'édition</Button>
      </div>
    );
  }

  if (!isPlaying) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 w-full rounded-2xl border-2 border-dashed border-slate-200">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-slate-100 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Icons.play className="h-8 w-8 text-primary ml-1" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Prêt à simuler ?</h2>
            <p className="text-muted-foreground text-sm">
              Découvrez exactement ce que verront vos utilisateurs. {steps.length} étape(s) prêtes à être jouées.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onExitPreview}>Quitter</Button>
            <Button onClick={() => setIsPlaying(true)} className="gap-2">
              <Icons.play className="h-4 w-4 fill-current" /> Lancer la simulation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderDebugPanel = () => (
    <div className="absolute left-4 bottom-4 z-40 w-90 max-w-[calc(100%-2rem)] rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Debug view</p>
          <h4 className="mt-1 text-base font-semibold text-slate-900">{fallbackPageTitle}</h4>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1" onClick={() => setViewMode('preview')}>
          <Icons.close className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 text-xs text-slate-600">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">URL</span>
          <span className="truncate text-right text-slate-700">{fallbackPageUrl || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Route</span>
          <span className="truncate text-right text-slate-700">{simulationContext?.pathname || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Viewport</span>
          <span className="text-slate-700">{simulationContext ? `${simulationContext.viewport.width} × ${simulationContext.viewport.height}` : '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Elements</span>
          <span className="text-slate-700">{simulationContext?.elements.length ?? 0}</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-2">
          <span>Current step</span>
          <span>{currentStepIndex + 1}/{steps.length}</span>
        </div>
        <p className="text-sm font-semibold text-slate-900">{currentStep.title || 'Sans titre'}</p>
        <p className="mt-1 text-xs text-slate-600 wrap-break-word">{currentStep.targetSelector || 'Aucun sélecteur de cible'}</p>
        <p className="mt-1 text-xs text-slate-600 wrap-break-word">{currentStep.position || 'BOTTOM'}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 text-xs font-medium text-slate-600">
          <span>Matched elements</span>
          <span>{matchedElements.length}</span>
        </div>
        {matchedElements.length > 0 ? (
          <div className="max-h-24 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 space-y-2">
            {matchedElements.map((item) => (
              <div key={item.selector} className="wrap-break-word">
                <p className="font-medium text-slate-800">{item.selector}</p>
                <p>{item.tag}{item.intent ? ` · ${item.intent}` : ''}{item.actionable ? ' · actionable' : ''}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            Aucun élément snapshot ne correspond au sélecteur de cette étape.
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 text-xs font-medium text-slate-600">
          <span>Aperçu éléments</span>
          <span>{visibleDebugElements.length}</span>
        </div>
        <div className="max-h-28 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600 space-y-2">
          {visibleDebugElements.length > 0 ? visibleDebugElements.map((item) => (
            <div key={item.selector} className="wrap-break-word">
              <span className="font-medium text-slate-800">{item.tag}</span>
              <span className="text-slate-500"> · {item.selector}</span>
              {item.text ? <p className="text-slate-500 line-clamp-2">{item.text}</p> : null}
            </div>
          )) : (
            <p className="text-slate-500">Aucun snapshot disponible.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={stageRef} className="relative w-full h-full bg-slate-50 overflow-hidden flex items-center justify-center rounded-xl border border-slate-200">
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-md backdrop-blur">
        <Button
          variant={viewMode === 'preview' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setViewMode('preview')}
        >
          <Icons.eye className="h-3.5 w-3.5 mr-1" /> Preview
        </Button>
        <Button
          variant={viewMode === 'debug' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setViewMode('debug')}
        >
          Debug
        </Button>
        {canUseIframe ? (
          <div className="ml-1 flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            <Icons.globe className="h-3 w-3" /> Live iframe
          </div>
        ) : null}
      </div>

      {!useLiveIframe && canUseIframe && iframeState === 'loading' && fallbackPageUrl ? (
        <iframe
          key={`preload-${fallbackPageUrl}`}
          src={fallbackPageUrl}
          title={`${tourName || 'Tour preview'} preload`}
          className="absolute inset-0 h-full w-full border-0 opacity-0 pointer-events-none"
          aria-hidden="true"
          tabIndex={-1}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          onLoad={() => setIframeState('ready')}
          onError={() => setIframeState('blocked')}
        />
      ) : null}

      {useLiveIframe ? (
        <div
          className="absolute inset-0 overflow-hidden rounded-xl bg-slate-950/5"
          onWheel={(event) => {
            event.preventDefault();
            scrollLiveIframe(event.deltaY, event.deltaMode, event.clientX, event.clientY);
          }}
        >
          <iframe
            ref={iframeRef}
            key={fallbackPageUrl}
            src={fallbackPageUrl}
            title={tourName || 'Tour preview'}
            className="h-full w-full border-0 bg-white pointer-events-none"
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

          <div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
            <span className="font-medium text-slate-800">Mode live iframe actif</span>
            <span className={isLiveTargetMissing ? 'text-amber-700 font-medium' : ''}>
              {isLiveCalibrating ? 'Calibrage...' : isLiveTargetMissing ? 'Cible introuvable' : 'Prêt'}
            </span>
          </div>
        </div>
      ) : hasStructuredContext ? (
        <div className="absolute inset-0 overflow-hidden">
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
                Chargement live iframe en arrière-plan... bascule auto dès qu'il est prêt.
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 p-8 flex flex-col gap-6 opacity-50 pointer-events-none">
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

      {/* Backdrop sombre si activé */}
      {currentStep.highlightElement && viewMode === 'preview' && !useLiveIframe && (
        <div className="absolute inset-0 bg-black/50 z-10 transition-opacity duration-300 pointer-events-none" />
      )}

      {connectorPath ? (
        <svg className="pointer-events-none absolute inset-0 z-30" width="100%" height="100%" aria-hidden="true">
          <defs>
            <marker id="tooltipArrowHead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
            </marker>
          </defs>
          <path d={connectorPath} stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900/90 drop-shadow-[0_1px_1px_rgba(255,255,255,0.55)]" markerEnd="url(#tooltipArrowHead)" />
          {connectorStart ? <circle cx={connectorStart.x} cy={connectorStart.y} r="3.5" className="fill-slate-900/90" /> : null}
        </svg>
      ) : null}

      {/* Cible et Tooltip */}
      <div
        className="relative z-20 flex items-center justify-center w-full h-full"
        onWheel={useLiveIframe ? (event) => {
          event.preventDefault();
          scrollLiveIframe(event.deltaY, event.deltaMode, event.clientX, event.clientY);
        } : undefined}
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

          {hasStructuredContext && targetRectForTooltip && viewMode === 'preview' && !useLiveIframe ? (
            <div
              className={cn(
                'absolute rounded-md border-2 border-dashed border-primary pointer-events-none',
                currentStep.highlightElement ? 'ring-4 ring-primary/35 shadow-lg' : '',
              )}
              style={{
                top: `${targetRectForTooltip.topPct}%`,
                left: `${targetRectForTooltip.leftPct}%`,
                width: `${targetRectForTooltip.widthPct}%`,
                height: `${targetRectForTooltip.heightPct}%`,
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
                (hasStructuredContext || useLiveIframe)
                  ? (tooltipStyle || { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
                  : undefined
              }
              onWheel={useLiveIframe ? (event) => {
                event.preventDefault();
                scrollLiveIframe(event.deltaY, event.deltaMode, event.clientX, event.clientY);
              } : undefined}
            >

            {/* Infobulle */}
            <div className="bg-white rounded-lg shadow-2xl p-5 w-87.5 text-left border border-slate-100 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
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

              {!hasStructuredContext && (!useLiveIframe || isLiveTargetMissing) ? (
                <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                  {isLiveTargetMissing ? (
                    <div className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-800">
                      <p className="font-medium">Cible introuvable dans la page live.</p>
                      {currentStep?.targetSelector ? <p className="mt-0.5 truncate">Sélecteur: {currentStep.targetSelector}</p> : null}
                    </div>
                  ) : null}
                  <p className="font-medium text-slate-700">Mode fallback</p>
                  <p className="mt-1">Page: {fallbackPageTitle}</p>
                  {fallbackPageUrl ? <p className="truncate">URL: {fallbackPageUrl}</p> : null}
                  {fallbackMainSelector ? <p className="truncate">Selector principal: {fallbackMainSelector}</p> : null}
                </div>
              ) : null}

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
                  {currentIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
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
                    className="h-8 shadow-sm"
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
      <div className="absolute top-4 right-4 z-50 bg-white p-2 rounded-lg shadow-md border border-slate-200 flex gap-3 items-center animate-in slide-in-from-top-4">
        <div className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold flex items-center gap-1">
          <Icons.eye className="h-3 w-3" /> PREVIEW
        </div>
        {fallbackPageUrl ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => window.open(fallbackPageUrl, '_blank', 'noopener,noreferrer')}
          >
            <Icons.globe className="h-3.5 w-3.5 mr-1" /> Ouvrir la page
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onExitPreview} className="hover:bg-slate-100 h-8 text-xs">
          Quitter la simulation
        </Button>
      </div>

    </div>
  );
}