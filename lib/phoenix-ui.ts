/** Cases à cocher — dégradé orange/rose quand cochées (style dashboard Phoenix). */
export const PHOENIX_CHECKBOX_CLASS =
	'size-4 shrink-0 rounded-[4px] border-slate-300 bg-white/90 shadow-sm transition-all hover:border-orange-400/55 data-checked:border-orange-500 data-checked:bg-gradient-to-br data-checked:from-orange-500 data-checked:to-pink-600 data-checked:text-white focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-400/35 disabled:opacity-50 dark:border-white/20 dark:bg-slate-900/50 dark:data-checked:border-orange-400';

/** Bouton d’action principal orange (hover scale + glow). */
export const PHOENIX_PRIMARY_BUTTON_CLASS =
	'rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-[0_0_24px_rgba(255,107,0,0.25)] transition-all duration-200 hover:scale-[1.03] hover:from-orange-400 hover:to-pink-500 hover:shadow-[0_0_32px_rgba(249,115,22,0.38)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-orange-400/45 disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-[0_0_24px_rgba(255,107,0,0.25)]';

/** Overlay modale Phoenix (flou + assombrissement). */
export const PHOENIX_MODAL_OVERLAY_CLASS = 'absolute inset-0 bg-black/55 backdrop-blur-sm';

/** Panneau modale Phoenix Glass (dégradé translucide + bordure accent). */
export const PHOENIX_MODAL_PANEL_CLASS =
	'relative z-10 w-full rounded-2xl border border-orange-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(248,250,252,0.95)_58%,rgba(241,245,249,0.96))] p-6 shadow-[0_14px_34px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-orange-400/25 dark:bg-[linear-gradient(165deg,rgba(20,28,42,0.95),rgba(10,16,28,0.94)_58%,rgba(5,10,20,0.98))] dark:shadow-[0_18px_45px_rgba(2,6,23,0.62)]';

/** Panneau modale Phoenix — variante alerte (suppression / danger). */
export const PHOENIX_MODAL_PANEL_DANGER_CLASS =
	'relative z-10 w-full rounded-2xl border border-rose-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(255,247,247,0.95)_58%,rgba(248,250,252,0.96))] p-6 shadow-[0_14px_34px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-rose-400/30 dark:bg-[linear-gradient(165deg,rgba(28,20,24,0.95),rgba(20,10,16,0.94)_58%,rgba(5,10,20,0.98))] dark:shadow-[0_18px_45px_rgba(2,6,23,0.62)]';

/** Bouton secondaire modale Phoenix. */
export const PHOENIX_MODAL_CANCEL_BUTTON_CLASS =
	'rounded-xl border border-slate-300/80 bg-white/90 text-slate-700 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:border-orange-400/40 hover:bg-white active:scale-[0.98] dark:border-white/20 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900/80';

/** Bouton destructif Phoenix (hover scale + glow rose). */
export const PHOENIX_DESTRUCTIVE_BUTTON_CLASS =
	'inline-flex h-10 items-center justify-center rounded-xl border border-rose-400/45 bg-gradient-to-r from-rose-500 to-red-600 px-4 text-sm font-semibold text-white shadow-[0_0_20px_rgba(244,63,94,0.28)] transition-all duration-200 hover:scale-[1.03] hover:from-rose-400 hover:to-red-500 hover:shadow-[0_0_28px_rgba(244,63,94,0.42)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rose-400/45 disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-[0_0_20px_rgba(244,63,94,0.28)]';

/** Alerte erreur dans une modale Phoenix. */
export const PHOENIX_MODAL_ERROR_CLASS =
	'rounded-xl border border-rose-300/50 bg-rose-50/80 px-3 py-2.5 text-sm text-rose-800 backdrop-blur-sm dark:border-rose-500/35 dark:bg-rose-950/40 dark:text-rose-100';
