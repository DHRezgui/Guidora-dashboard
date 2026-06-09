import type { OrganizationJourneyBlueprintRow } from '@/lib/api';

/** Liste sous le trigger (comme Politique replay dans l’éditeur). */
export const BLUEPRINT_SELECT_CONTENT_CLASS =
	'rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]';

export const BLUEPRINT_SELECT_TRIGGER_CLASS =
	'h-9 w-full rounded-lg border-slate-300 bg-white/90 text-slate-700 transition-colors hover:border-orange-400/40 focus-visible:ring-orange-400/20 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100';

export const PHOENIX_PANEL_CLASS =
	'overflow-hidden border-slate-200/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92)_55%,rgba(241,245,249,0.9))] shadow-[0_12px_28px_rgba(2,6,23,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.88),rgba(15,23,42,0.72)_55%,rgba(2,6,23,0.92))] dark:shadow-[0_12px_28px_rgba(2,6,23,0.36)]';

export const PHOENIX_INSET_PANEL_CLASS =
	'rounded-xl border border-slate-200/80 bg-slate-100/75 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-800/35';

export const PHOENIX_FIELD_CLASS =
	'rounded-xl border border-slate-300/80 bg-white/85 text-slate-800 shadow-sm transition-colors placeholder:text-slate-500 focus-visible:border-orange-400/60 focus-visible:ring-2 focus-visible:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-200';

export const PHOENIX_LABEL_CLASS =
	'text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';

export type StepForm = {
	semanticRole: string;
	title: string;
	description: string;
	required: boolean;
	semanticTokens: string;
	selectorHints: string;
	routePatterns: string;
};

export type BlueprintFormState = {
	id: string;
	name: string;
	description: string;
	vertical: string;
	intent: string;
	minResolvedSteps: string;
	priority: string;
	steps: StepForm[];
};

export const EMPTY_STEP: StepForm = {
	semanticRole: 'saas.dashboard-overview',
	title: '',
	description: '',
	required: false,
	semanticTokens: '',
	selectorHints: '',
	routePatterns: '',
};

export function createEmptyBlueprintForm(): BlueprintFormState {
	return {
		id: 'custom.saas.my-journey',
		name: '',
		description: '',
		vertical: 'saas',
		intent: 'primary-action',
		minResolvedSteps: '2',
		priority: '5',
		steps: [{ ...EMPTY_STEP }],
	};
}

function splitCsv(value: string): string[] {
	return value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

export function buildPayloadFromForm(form: BlueprintFormState): Record<string, unknown> {
	return {
		id: form.id.trim(),
		name: form.name.trim(),
		description: form.description.trim(),
		vertical: form.vertical,
		intent: form.intent,
		minResolvedSteps: Number.parseInt(form.minResolvedSteps, 10) || 2,
		priority: Number.parseInt(form.priority, 10) || 0,
		steps: form.steps.map((step) => ({
			semanticRole: step.semanticRole,
			title: step.title.trim(),
			description: step.description.trim(),
			required: step.required,
			targetHints: {
				semanticTokens: splitCsv(step.semanticTokens),
				selectorHints: splitCsv(step.selectorHints),
				routePatterns: splitCsv(step.routePatterns),
				elementTags: ['a', 'button'],
			},
		})),
	};
}

export function rowToForm(row: OrganizationJourneyBlueprintRow): BlueprintFormState {
	const p = row.payload as Record<string, unknown>;
	const steps = Array.isArray(p.steps) ? p.steps : [];
	return {
		id: String(p.id ?? row.blueprintId),
		name: String(p.name ?? ''),
		description: String(p.description ?? ''),
		vertical: String(p.vertical ?? row.vertical),
		intent: String(p.intent ?? 'primary-action'),
		minResolvedSteps: String(p.minResolvedSteps ?? 2),
		priority: String(p.priority ?? 0),
		steps: steps.map((s: Record<string, unknown>) => {
			const hints = (s.targetHints as Record<string, unknown>) || {};
			return {
				semanticRole: String(s.semanticRole ?? 'saas.dashboard-overview'),
				title: String(s.title ?? ''),
				description: String(s.description ?? ''),
				required: Boolean(s.required),
				semanticTokens: Array.isArray(hints.semanticTokens)
					? (hints.semanticTokens as string[]).join(', ')
					: '',
				selectorHints: Array.isArray(hints.selectorHints)
					? (hints.selectorHints as string[]).join(', ')
					: '',
				routePatterns: Array.isArray(hints.routePatterns)
					? (hints.routePatterns as string[]).join(', ')
					: '',
			};
		}),
	};
}

export function blueprintFormFromRow(row: OrganizationJourneyBlueprintRow): BlueprintFormState {
	const parsed = rowToForm(row);
	return {
		...parsed,
		steps: parsed.steps.length ? parsed.steps : [{ ...EMPTY_STEP }],
	};
}

export type BlueprintStepPreview = {
	semanticRole: string;
	title: string;
	description: string;
	required: boolean;
	semanticTokens: string[];
	selectorHints: string[];
	routePatterns: string[];
};

export function extractBlueprintSteps(row: OrganizationJourneyBlueprintRow): BlueprintStepPreview[] {
	const p = row.payload as Record<string, unknown>;
	const steps = Array.isArray(p.steps) ? p.steps : [];
	return steps.map((s: Record<string, unknown>) => {
		const hints = (s.targetHints as Record<string, unknown>) || {};
		return {
			semanticRole: String(s.semanticRole ?? ''),
			title: String(s.title ?? ''),
			description: String(s.description ?? ''),
			required: Boolean(s.required),
			semanticTokens: Array.isArray(hints.semanticTokens) ? (hints.semanticTokens as string[]) : [],
			selectorHints: Array.isArray(hints.selectorHints) ? (hints.selectorHints as string[]) : [],
			routePatterns: Array.isArray(hints.routePatterns) ? (hints.routePatterns as string[]) : [],
		};
	});
}

/** Ancre DOM pour scroll depuis le modal « étapes » (index 0-based, aligné sur ?step=). */
export function blueprintStepAnchorId(index: number): string {
	return `blueprint-step-${index}`;
}

export function blueprintDisplayMeta(row: OrganizationJourneyBlueprintRow) {
	const p = row.payload;
	const steps = Array.isArray(p.steps) ? p.steps : [];
	return {
		name: String(p.name ?? row.blueprintId),
		description: String(p.description ?? ''),
		intent: String(p.intent ?? '—'),
		stepCount: steps.length,
	};
}
