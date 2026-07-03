import type { UseContextualTourSuggestionsOptions } from '@sdk/hooks/useContextualTourSuggestions';
import type { SDKConfig } from '@sdk/types/sdk';

/** Racine d’analyse : uniquement la zone sujet (mock app), pas le chrome dashboard ni la console SDK. */
export const LAB_ANALYSIS_ROOT_SELECTOR = '[data-sdk-lab-subject]';

/** Sélecteurs du chrome dashboard / lab à exclure du scan. */
export const LAB_NOISE_SELECTORS = [
	'[data-tour-id^="tour-sdk-lab-nav-"]',
	'[data-tour-id="tour-sdk-lab-action-back-dashboard"]',
	'[data-sdk-lab-console]',
	'[aria-label="Console SDK"]',
	'nav a[href^="/dashboard"]',
	'aside a[href^="/dashboard"]',
	'header[role="banner"]',
	'header button',
	'button[aria-label="Basculer le theme"]',
	'.trustdev-contextual-debug-panel',
	'[data-tour-id="contextual-debug-panel"]',
] as const;

/** Classes Select partagées (contrôles SDK). */
export const LAB_SELECT_TRIGGER_CLASS =
	'h-10 w-full rounded-xl border-slate-300 bg-white/90 pl-3 pr-3 text-sm font-medium text-slate-700 transition-colors hover:border-orange-400/40 focus-visible:ring-orange-400/20 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100';

export const LAB_SELECT_CONTENT_CLASS =
	'rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]';

/** Encadré orange–rose du lab (Backend, Runtime, bandeaux console SDK). */
export const LAB_ORANGE_CALLOUT_CLASS =
	'rounded-2xl border-2 border-orange-400/40 bg-gradient-to-br from-orange-500/[0.12] via-card to-pink-500/[0.08] text-xs leading-relaxed text-orange-950 shadow-card dark:border-orange-400/35 dark:from-orange-500/[0.14] dark:via-card dark:to-pink-500/[0.1] dark:text-orange-50';

/** Libellé accent (ex. « Backend : ») dans un encadré lab. */
export const LAB_ORANGE_CALLOUT_LABEL_CLASS =
	'bg-gradient-to-r from-orange-700 to-pink-600 bg-clip-text font-semibold text-transparent dark:from-orange-200 dark:to-pink-300';

/** Token inline — même palette que LAB_ORANGE_CALLOUT_CLASS. */
export const LAB_INLINE_CODE_HIGHLIGHT_CLASS =
	'rounded-md border-2 border-orange-400/40 bg-gradient-to-br from-orange-500/[0.12] via-card to-pink-500/[0.08] px-1.5 py-0.5 font-mono text-xs font-medium text-orange-950 shadow-card dark:border-orange-400/35 dark:from-orange-500/[0.14] dark:via-card dark:to-pink-500/[0.1] dark:text-orange-50';

/** Range progression session — accent Phoenix (aligné bouton primary). */
export const LAB_PROGRESS_RANGE_CLASS =
	'phoenix-range h-2 w-full cursor-pointer rounded-full';

export type LabSessionStage = 'discovery' | 'activation' | 'adoption' | 'retention';

export type LabConflictStrategy = 'highest-confidence' | 'highest-score' | 'intent-priority' | 'hybrid';

/**
 * Note affichée dans le lab : la preview dashboard utilise TourSimulator, pas TourViewer.
 * Les correctifs runtime (seuil sémantique 28, auto-heal 30 min, badge match, throttle rect)
 * ne s’exercent qu’avec TourViewer en intégration hôte ou après activation d’un parcours publié.
 */
export const LAB_RUNTIME_CAPABILITIES_NOTE =
	'Correctifs SDK (validation sémantique seuil 28, auto-heal sessionStorage 30 min + pageHash, badge match sans low-confidence sur sélecteur stable, throttle sync rect 120 ms) — actifs dans TourViewer uniquement, pas dans la preview « Jouer » (TourSimulator).';

const LAB_SUBJECT_INTERACTIVE_PROBE =
	'button, a[href], input, select, textarea, [role="button"], [data-tour-id]';

/**
 * Attend que la zone sujet lab contienne au moins un contrôle interactif
 * (évite un scan à 0 candidat pendant skeleton / navigation Next).
 */
export async function waitForLabSubjectReady(maxWaitMs = 5000): Promise<boolean> {
	if (typeof document === 'undefined') return false;
	const deadline = Date.now() + maxWaitMs;
	while (Date.now() < deadline) {
		const root = document.querySelector(LAB_ANALYSIS_ROOT_SELECTOR);
		if (root instanceof HTMLElement && root.isConnected) {
			if (root.querySelector(LAB_SUBJECT_INTERACTIVE_PROBE)) {
				return true;
			}
		}
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
		});
	}
	return false;
}

/**
 * Integration PAT for lab SDK API calls (publish, semantic-hints).
 * Local/dev: `NEXT_PUBLIC_TRUSTDEV_SDK_TOKEN` (synced by refresh-sdk-token.ps1).
 */
export function getLabSdkToken(): string | null {
  const token = process.env.NEXT_PUBLIC_TRUSTDEV_SDK_TOKEN?.trim();
  if (!token) return null;
  return token.startsWith('td_sdk_') ? token : null;
}

let cachedBffSession: { token: string; expiresAtMs: number } | null = null;

/**
 * Production pattern: fetch short-lived `td_sess_...` from Next.js BFF route.
 * Requires server env `TRUSTDEV_SDK_TOKEN` (PAT) — never expose PAT in NEXT_PUBLIC.
 */
export async function fetchBffSdkSessionToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  const now = Date.now();
  if (cachedBffSession && cachedBffSession.expiresAtMs - 60_000 > now) {
    return cachedBffSession.token;
  }
  try {
    const response = await fetch('/api/trustdev/sdk-session', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { sessionToken?: string; expiresAt?: string };
    if (!payload.sessionToken?.startsWith('td_sess_')) {
      return null;
    }
    cachedBffSession = {
      token: payload.sessionToken,
      expiresAtMs: payload.expiresAt ? new Date(payload.expiresAt).getTime() : now + 14 * 60_000,
    };
    return payload.sessionToken;
  } catch {
    return null;
  }
}

export function getLabPublishConfig(): Partial<SDKConfig> {
  const sdkToken = getLabSdkToken();
  const config: Partial<SDKConfig> = {
    apiKey: process.env.NEXT_PUBLIC_SDK_API_KEY || 'trustdev-sdk-tests',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020/api/v1',
    sdkToken: sdkToken ?? undefined,
    organizationId: process.env.NEXT_PUBLIC_TRUSTDEV_ORGANIZATION_ID,
    debug: true,
  };

  // BFF opt-in uniquement (prod). Lab / soutenance / e2e : NEXT_PUBLIC_TRUSTDEV_SDK_TOKEN suffit.
  if (
    !sdkToken &&
    process.env.NEXT_PUBLIC_TRUSTDEV_USE_BFF_SDK_SESSION === 'true'
  ) {
    config.getSdkToken = fetchBffSdkSessionToken;
  }

  return config;
}

/** Config prod : PAT serveur via BFF (sans NEXT_PUBLIC). */
export function getBffSdkPublishConfig(): Partial<SDKConfig> {
  return {
    apiKey: process.env.NEXT_PUBLIC_SDK_API_KEY || 'trustdev-sdk-tests',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020/api/v1',
    getSdkToken: fetchBffSdkSessionToken,
    organizationId: process.env.NEXT_PUBLIC_TRUSTDEV_ORGANIZATION_ID,
    debug: false,
  };
}

/**
 * Couche sémantique hybride (labs-first).
 * Fix: active la fusion locale + hints backend ; défaut SDK client = false.
 */
export const LAB_SEMANTIC_ENHANCEMENT_ENABLED = true;

/**
 * Mode moteur sémantique. `hybrid` = round-trip `/semantic-hints` avec fallback local.
 */
export const LAB_SEMANTIC_ENGINE_MODE: 'local' | 'hybrid' | 'backend' = 'hybrid';

/** Chemin relatif de l’endpoint semantic-hints (concaténé à NEXT_PUBLIC_API_URL). */
export const LAB_SEMANTIC_BACKEND_PATH = '/tours/contextual/semantic-hints';

/**
 * Timeout semantic-hints (ms). Doit dépasser le timeout backend (~8 s) + marge réseau.
 */
export const LAB_SEMANTIC_BACKEND_TIMEOUT_MS = 12000;

/**
 * DOM settle avant couche sémantique (ms). Aligné sur MIN_MUTATION_BATCH_WINDOW_MS du SDK (300).
 * Fix perf: évite fusion sémantique pendant rafales MutationObserver.
 */
export const LAB_SEMANTIC_DOM_SETTLE_MS = 300;

/**
 * Plancher MutationObserver côté générateur (tour-suggestion-generator.ts).
 * Toute valeur inférieure passée par un scénario est relevée à 300 ms par le SDK.
 */
export const LAB_MUTATION_BATCH_WINDOW_MS = 300;

/**
 * Seuil minimal de confiance pour accepter un draft « sequence ».
 * Fix: abaisse le plancher (défaut SDK séquence ~45) pour garder les parcours multi-étapes en lab.
 */
export const LAB_SEQUENCE_MIN_CONFIDENCE = 35;

/**
 * Nombre max d’étapes par draft (séquence et heuristiques multi-step).
 */
export const LAB_GENERATOR_MAX_STEPS = 7;

/** Profil singlePageTour (chaîne générique 7 slots, 1 draft). */
export const LAB_SINGLE_PAGE_TOUR_DEFAULTS = {
	singlePageTour: true,
	maxDrafts: 1,
	maxSteps: LAB_GENERATOR_MAX_STEPS,
	sequenceMinConfidence: LAB_SEQUENCE_MIN_CONFIDENCE,
	minConfidence: 45,
	includeSupportDraft: false,
	includeNavigationDraft: false,
	includeFormDraft: false,
} as const satisfies Partial<UseContextualTourSuggestionsOptions>;

function resolveSemanticBackendUrl(): string | undefined {
	if (!LAB_SEMANTIC_BACKEND_PATH) return undefined;
	if (LAB_SEMANTIC_ENGINE_MODE === 'local') return undefined;
	const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020/api/v1';
	return `${base.replace(/\/$/, '')}${LAB_SEMANTIC_BACKEND_PATH}`;
}

/**
 * Options communes pour tous les scénarios lab (simple, medium, dynamic, stress, integration).
 * Les pages peuvent surcharger via `...overrides` sans changer leur scénario métier.
 *
 * Performance (toujours actives via le code SDK lié en source) :
 * - MutationObserver debounce ≥ 300 ms (mutationBatchWindowMs, plancher SDK)
 * - Cache sémantique 512 entrées (WeakMap, semantic-step-intelligence.ts)
 * - Heals sessionStorage chargés une fois au mount TourViewer
 * - scheduleTargetRectSync throttle 120 ms + skip onglet caché (TourViewer)
 */
export function labContextualDefaults(
	overrides: UseContextualTourSuggestionsOptions,
): UseContextualTourSuggestionsOptions {
	return {
		enabled: true,
		autoGenerate: false,
		autoPublish: true,
		autoActivatePublishedDrafts: false,
		feedbackEnabled: true,
		publishConfig: getLabPublishConfig(),
		noiseFilteringEnabled: true,
		ignoreTransientUi: true,
		noiseSelectors: [...LAB_NOISE_SELECTORS],
		analysisRootSelector: LAB_ANALYSIS_ROOT_SELECTOR,
		useSemanticRanking: true,
		/** Fix: drafts séquentiels (navigation interne, enchaînement CTA). */
		enableSequenceDetection: true,
		/** Fix: seuil séquence abaissé pour lab (voir LAB_SEQUENCE_MIN_CONFIDENCE). */
		sequenceMinConfidence: LAB_SEQUENCE_MIN_CONFIDENCE,
		/** Fix: jusqu’à 7 étapes par draft généré. */
		maxSteps: LAB_GENERATOR_MAX_STEPS,
		/**
		 * Fix perf: debounce scan DOM ≥ 300 ms (plancher SDK).
		 * Les scénarios qui passent une valeur plus basse sont relevés automatiquement.
		 */
		mutationBatchWindowMs: LAB_MUTATION_BATCH_WINDOW_MS,
		explainabilityEnabled: true,
		flowVersioningEnabled: true,
		flowCompatibilityMode: 'lenient',
		/** Fix: fusion sémantique hybride (voir LAB_SEMANTIC_*). */
		semanticEnhancementEnabled: LAB_SEMANTIC_ENHANCEMENT_ENABLED,
		semanticEngineMode: LAB_SEMANTIC_ENGINE_MODE,
		/** Fix: endpoint Phase 2 sentence-transformers + fallback local. */
		semanticBackendUrl: resolveSemanticBackendUrl(),
		semanticBackendTimeoutMs: LAB_SEMANTIC_BACKEND_TIMEOUT_MS,
		semanticBackendAccessToken: getLabSdkToken,
		semanticRoleWeights: { role: 0.6, order: 0.4, copy: 0.5 },
		/** Fix: aligné sur debounce MutationObserver (300 ms). */
		semanticSnapshotMinDomAgeMs: LAB_SEMANTIC_DOM_SETTLE_MS,
		/** Plus permissif en lab pour pouvoir republier lors des tests (dédup navigateur). */
		maxAutoPublishedTours: 12,
		...overrides,
	};
}

/** Defaults lab + profil singlePageTour (7 slots, 1 draft). */
export function labSinglePageTourDefaults(
	overrides: UseContextualTourSuggestionsOptions,
): UseContextualTourSuggestionsOptions {
	return labContextualDefaults({
		...LAB_SINGLE_PAGE_TOUR_DEFAULTS,
		publishScenario: 'simple',
		persona: 'admin',
		businessObjectives: [
			'discover and use the main features',
			'complete the primary action on this page',
			'navigate between sections',
			'search and filter content',
			'manage account and settings',
		],
		semanticHints: [
			'search',
			'add',
			'create',
			'save',
			'submit',
			'dashboard',
			'settings',
			'profile',
			'navigation',
			'filter',
			'analytics',
		],
		customKeywords: {
			'primary-action': ['Add', 'Create', 'New', 'Save', 'Submit', 'Import'],
			'support-navigation': ['Dashboard', 'Home', 'Overview', 'Tasks', 'Analytics', 'Settings', 'Help'],
			discovery: ['Analytics', 'Reports', 'Insights', 'Overview', 'Summary', 'Activity', 'KPI'],
		},
		...overrides,
	});
}
