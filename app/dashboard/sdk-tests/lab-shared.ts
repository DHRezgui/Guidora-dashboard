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

/** Range progression session — accent Phoenix (aligné bouton primary). */
export const LAB_PROGRESS_RANGE_CLASS =
	'phoenix-range h-2 w-full cursor-pointer rounded-full';

export type LabSessionStage = 'discovery' | 'activation' | 'adoption' | 'retention';

export type LabConflictStrategy = 'highest-confidence' | 'highest-score' | 'intent-priority' | 'hybrid';

export function getLabPublishConfig(): Partial<SDKConfig> {
	return {
		apiKey: process.env.NEXT_PUBLIC_SDK_API_KEY || 'trustdev-sdk-tests',
		apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1',
		getAccessToken: () => (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null),
	};
}

/**
 * Couche sémantique hybride (labs-first).
 *
 * Activée par défaut dans le lab pour valider la fusion sémantique +
 * heuristique. Reste désactivée pour toutes les intégrations clientes
 * (la valeur par défaut côté SDK est `false`). Ne change pas le contrat
 * de publication : les filtres qualité backend restent souverains et la
 * fusion applique un delta borné (cf. `semantic-step-intelligence.ts`).
 */
export const LAB_SEMANTIC_ENHANCEMENT_ENABLED = true;

/**
 * Mode du moteur sémantique en lab. `hybrid` exerce le round-trip
 * backend (Phase 2 — sentence-transformers) avec fallback automatique
 * vers le moteur local en cas de timeout/erreur. Passer à `local`
 * pour rester en Phase 1 purement déterministe sans appel réseau.
 */
export const LAB_SEMANTIC_ENGINE_MODE: 'local' | 'hybrid' | 'backend' = 'hybrid';

/**
 * URL de l'endpoint backend `/v1/tours/contextual/semantic-hints`.
 * Concaténée au-dessus de `NEXT_PUBLIC_API_URL` quand le mode est
 * hybride. Laisser `null` pour désactiver l'appel backend sans changer
 * le mode (le SDK fera fallback automatiquement).
 */
export const LAB_SEMANTIC_BACKEND_PATH = '/tours/contextual/semantic-hints';

/**
 * Timeout de l'appel backend semantic-hints (ms). Phase 2 utilise
 * sentence-transformers côté backend dont le cold-start (chargement
 * modèle + import lib) peut prendre quelques secondes. 5000ms laisse
 * la marge pour cette latence; en cas de dépassement le SDK fallback
 * sur le moteur local.
 */
export const LAB_SEMANTIC_BACKEND_TIMEOUT_MS = 5000;

/**
 * Durée minimale d'inactivité du DOM (en ms) avant que la couche
 * sémantique soit autorisée à s'exécuter. Le SDK installe un
 * `MutationObserver` partagé et bypasse la couche tant que le DOM n'a
 * pas été silencieux pendant cette fenêtre. Si le DOM se stabilise
 * trop tard, le panneau debug indique `DOM instable` et garde le
 * résultat heuristique inchangé.
 */
export const LAB_SEMANTIC_DOM_SETTLE_MS = 300;

function resolveSemanticBackendUrl(): string | undefined {
	if (!LAB_SEMANTIC_BACKEND_PATH) return undefined;
	if (LAB_SEMANTIC_ENGINE_MODE === 'local') return undefined;
	const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';
	return `${base.replace(/\/$/, '')}${LAB_SEMANTIC_BACKEND_PATH}`;
}

/** Options communes pour rapprocher le lab du comportement intégration réelle. */
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
		enableSequenceDetection: true,
		explainabilityEnabled: true,
		flowVersioningEnabled: true,
		flowCompatibilityMode: 'lenient',
		semanticEnhancementEnabled: LAB_SEMANTIC_ENHANCEMENT_ENABLED,
		semanticEngineMode: LAB_SEMANTIC_ENGINE_MODE,
		semanticBackendUrl: resolveSemanticBackendUrl(),
		semanticBackendTimeoutMs: LAB_SEMANTIC_BACKEND_TIMEOUT_MS,
		semanticRoleWeights: { role: 0.6, order: 0.4, copy: 0.5 },
		semanticSnapshotMinDomAgeMs: LAB_SEMANTIC_DOM_SETTLE_MS,
		/** Plus permissif en lab pour pouvoir republier lors des tests (dédup navigateur). */
		maxAutoPublishedTours: 12,
		...overrides,
	};
}