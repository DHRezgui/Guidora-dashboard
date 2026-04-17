import { SimulationContext, SimulationElementSnapshot } from '@/lib/types';

const MAX_ELEMENTS = 80;
const LOAD_TIMEOUT_MS = 7000;
const CAPTURE_POLL_ATTEMPTS = 30;
const CAPTURE_POLL_DELAY_MS = 250;

type CaptureOptions = {
  preferredSelectors?: string[];
};

function inferIntent(element: Element): SimulationElementSnapshot['intent'] {
  const tag = element.tagName.toLowerCase();
  const role = (element.getAttribute('role') || '').toLowerCase();

  if (/^(button|input|select|textarea)$/.test(tag)) return 'primary-action';
  if (tag === 'a' || role === 'link' || role === 'navigation') return 'support-navigation';
  if (/^(h1|h2|h3)$/.test(tag)) return 'discovery';
  return 'discovery';
}

function isActionable(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase();
  const role = (element.getAttribute('role') || '').toLowerCase();
  const clickable = typeof (element as any).onclick === 'function' || element.hasAttribute('onclick');
  return clickable || /^(button|a|input|select|textarea)$/.test(tag) || ['button', 'link', 'checkbox', 'menuitem', 'option', 'switch'].includes(role);
}

function buildSelector(element: HTMLElement): string {
  const dataTourId = element.getAttribute('data-tour-id');
  if (dataTourId) return `${element.tagName.toLowerCase()}[data-tour-id="${dataTourId}"]`;

  const dataTestId = element.getAttribute('data-testid');
  if (dataTestId) return `${element.tagName.toLowerCase()}[data-testid="${dataTestId}"]`;

  if (element.id) return `#${element.id}`;

  const className = (element.className || '').trim();
  const firstClass = className.split(/\s+/).find((item) => item && !item.includes(':'));
  if (firstClass) return `${element.tagName.toLowerCase()}.${firstClass}`;

  return element.tagName.toLowerCase();
}

function collectElements(doc: Document, viewportWidth: number, viewportHeight: number): SimulationElementSnapshot[] {
  const candidates = Array.from(
    doc.querySelectorAll<HTMLElement>(
      '[data-tour-id], [data-testid], button, a, input, select, textarea, h1, h2, h3, [role], [aria-label]',
    ),
  );

  const seenSelectors = new Set<string>();
  const snapshots: SimulationElementSnapshot[] = [];

  for (const element of candidates) {
    if (snapshots.length >= MAX_ELEMENTS) break;

    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;

    const style = doc.defaultView?.getComputedStyle(element);
    if (!style || style.visibility === 'hidden' || style.display === 'none') continue;

    if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) continue;

    const selector = buildSelector(element);
    if (!selector || seenSelectors.has(selector)) continue;
    seenSelectors.add(selector);

    const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();

    snapshots.push({
      selector,
      text: text ? text.slice(0, 140) : undefined,
      role: element.getAttribute('role') || undefined,
      tag: element.tagName.toLowerCase(),
      intent: inferIntent(element),
      actionable: isActionable(element),
      bbox: {
        top: Math.max(0, rect.top),
        left: Math.max(0, rect.left),
        width: rect.width,
        height: rect.height,
      },
    });
  }

  return snapshots;
}

function snapshotFromElement(element: HTMLElement): SimulationElementSnapshot | null {
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;

  const doc = element.ownerDocument;
  const style = doc.defaultView?.getComputedStyle(element);
  if (!style || style.visibility === 'hidden' || style.display === 'none') return null;

  const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();

  return {
    selector: buildSelector(element),
    text: text ? text.slice(0, 140) : undefined,
    role: element.getAttribute('role') || undefined,
    tag: element.tagName.toLowerCase(),
    intent: inferIntent(element),
    actionable: isActionable(element),
    bbox: {
      top: Math.max(0, rect.top),
      left: Math.max(0, rect.left),
      width: rect.width,
      height: rect.height,
    },
  };
}

function collectPreferredSelectors(doc: Document, selectors: string[]): SimulationElementSnapshot[] {
  const snapshots: SimulationElementSnapshot[] = [];
  const seen = new Set<string>();

  for (const selector of selectors) {
    const trimmed = (selector || '').trim();
    if (!trimmed || seen.has(trimmed)) continue;

    let element: HTMLElement | null = null;
    try {
      element = doc.querySelector(trimmed) as HTMLElement | null;
    } catch {
      element = null;
    }

    if (!element) continue;

    const snapshot = snapshotFromElement(element);
    if (!snapshot) continue;

    snapshots.push({ ...snapshot, selector: trimmed });
    seen.add(trimmed);
    if (snapshots.length >= MAX_ELEMENTS) break;
  }

  return snapshots;
}

function mergeSnapshots(
  primary: SimulationElementSnapshot[],
  secondary: SimulationElementSnapshot[],
): SimulationElementSnapshot[] {
  const seen = new Set<string>();
  const merged: SimulationElementSnapshot[] = [];

  for (const item of [...primary, ...secondary]) {
    const key = item.selector;
    if (!key || seen.has(key)) continue;
    merged.push(item);
    seen.add(key);
    if (merged.length >= MAX_ELEMENTS) break;
  }

  return merged;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function captureSimulationContextFromUrl(
  targetUrl?: string,
  options?: CaptureOptions,
): Promise<SimulationContext | null> {
  if (!targetUrl || typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  let resolved: URL;
  try {
    resolved = new URL(targetUrl, window.location.origin);
  } catch {
    return null;
  }

  if (resolved.origin !== window.location.origin) {
    return null;
  }

  const iframe = document.createElement('iframe');
  iframe.src = resolved.toString();
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.className = 'pointer-events-none';
  iframe.style.position = 'fixed';
  iframe.style.width = '1280px';
  iframe.style.height = '720px';
  iframe.style.left = '-99999px';
  iframe.style.top = '-99999px';
  iframe.style.opacity = '0';
  iframe.style.border = '0';

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  try {
    const loaded = await new Promise<boolean>((resolvePromise) => {
      const timeoutId = window.setTimeout(() => resolvePromise(false), LOAD_TIMEOUT_MS);

      iframe.onload = () => {
        window.clearTimeout(timeoutId);
        resolvePromise(true);
      };

      iframe.onerror = () => {
        window.clearTimeout(timeoutId);
        resolvePromise(false);
      };

      document.body.appendChild(iframe);
    });

    if (!loaded || !iframe.contentWindow?.document) {
      const fallbackContext: SimulationContext = {
        pageUrl: resolved.toString(),
        pathname: resolved.pathname,
        pageTitle: resolved.pathname,
        capturedAt: new Date().toISOString(),
        viewport: {
          width: Math.max(1, window.innerWidth || 1280),
          height: Math.max(1, window.innerHeight || 720),
        },
        elements: [],
      };
      cleanup();
      return fallbackContext;
    }

    await new Promise<void>((resolvePromise) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolvePromise());
      });
    });

    const doc = iframe.contentWindow.document;
    const win = iframe.contentWindow;
    const viewportWidth = Math.max(1, win.innerWidth || doc.documentElement.clientWidth || iframe.clientWidth || 1280);
    const viewportHeight = Math.max(1, win.innerHeight || doc.documentElement.clientHeight || iframe.clientHeight || 720);

    const preferredSelectors = (options?.preferredSelectors || []).filter((value): value is string => Boolean(value && value.trim()));

    let preferred = collectPreferredSelectors(doc, preferredSelectors);
    let generic = collectElements(doc, viewportWidth, viewportHeight);
    let elements = mergeSnapshots(preferred, generic);

    // Dynamic pages often hydrate after load; poll briefly to capture real nodes.
    for (let i = 0; i < CAPTURE_POLL_ATTEMPTS && elements.length === 0; i += 1) {
      await delay(CAPTURE_POLL_DELAY_MS);
      preferred = collectPreferredSelectors(doc, preferredSelectors);
      generic = collectElements(doc, viewportWidth, viewportHeight);
      elements = mergeSnapshots(preferred, generic);
    }

    const context: SimulationContext = {
      pageUrl: resolved.toString(),
      pathname: resolved.pathname,
      pageTitle: doc.title || resolved.pathname,
      capturedAt: new Date().toISOString(),
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
      },
      elements,
    };

    cleanup();
    return context;
  } catch {
    cleanup();
    return null;
  }
}
