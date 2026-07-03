'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Icons } from '@/components/ui/icons';
import { getSessionUserStorageScope, scopeLocalStorageKey } from '@/lib/session-user';
import { cn } from '@/lib/utils';

/** Durée d'affichage ouvert des infos sandbox avant repli automatique (première visite uniquement). */
export const SANDBOX_HINT_AUTO_COLLAPSE_MS = 8_000;

const SANDBOX_HINT_STORAGE_PREFIX = 'trustdev.sandbox-hint.v1.';

type StoredSandboxHintState = {
	/** Intro auto (timer) terminée ou l'utilisateur a interagi. */
	introShown: boolean;
	open: boolean;
	/** Horodatage du début du timer (première visite). */
	timerStartedAt?: number;
};

function readSandboxHintState(storageKey: string): StoredSandboxHintState | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(SANDBOX_HINT_STORAGE_PREFIX + storageKey);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as StoredSandboxHintState;
		if (typeof parsed.introShown === 'boolean' && typeof parsed.open === 'boolean') {
			return parsed;
		}
	} catch {
		// ignore
	}
	return null;
}

function writeSandboxHintState(storageKey: string, state: StoredSandboxHintState) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(SANDBOX_HINT_STORAGE_PREFIX + storageKey, JSON.stringify(state));
	} catch {
		// ignore
	}
}

function clearSandboxHintTimer(timerRef: MutableRefObject<number | null>) {
	if (timerRef.current !== null) {
		window.clearTimeout(timerRef.current);
		timerRef.current = null;
	}
}

/**
 * Timer auto-repli une seule fois (première visite). Ensuite, l'état ouvert/fermé
 * est mémorisé et respecté à chaque navigation (avant/arrière, créer/modifier).
 */
function usePersistentSandboxHint(baseStorageKey: string, autoCollapseMs: number) {
	const storageKey = scopeLocalStorageKey(baseStorageKey);
	const introShownRef = useRef(false);
	const timerRef = useRef<number | null>(null);
	const [open, setOpenState] = useState(() => {
		const stored = readSandboxHintState(storageKey);
		if (stored) {
			introShownRef.current = stored.introShown;
			return stored.open;
		}
		return true;
	});

	const finishAutoIntro = useCallback(() => {
		introShownRef.current = true;
		setOpenState(false);
		writeSandboxHintState(storageKey, { introShown: true, open: false });
	}, [storageKey]);

	const scheduleAutoCollapse = useCallback(
		(delayMs: number) => {
			clearSandboxHintTimer(timerRef);
			if (introShownRef.current) return;
			if (delayMs <= 0) {
				finishAutoIntro();
				return;
			}
			timerRef.current = window.setTimeout(() => {
				timerRef.current = null;
				if (introShownRef.current) return;
				finishAutoIntro();
			}, delayMs);
		},
		[finishAutoIntro],
	);

	useEffect(() => {
		if (getSessionUserStorageScope() === 'anonymous') return;

		const stored = readSandboxHintState(storageKey);

		if (stored?.introShown) {
			introShownRef.current = true;
			setOpenState(stored.open);
			return;
		}

		if (stored && !stored.introShown) {
			introShownRef.current = false;
			setOpenState(stored.open);
			const startedAt = stored.timerStartedAt ?? Date.now();
			if (!stored.timerStartedAt) {
				writeSandboxHintState(storageKey, {
					introShown: false,
					open: stored.open,
					timerStartedAt: startedAt,
				});
			}
			const elapsed = Date.now() - startedAt;
			scheduleAutoCollapse(autoCollapseMs - elapsed);
			return () => clearSandboxHintTimer(timerRef);
		}

		const startedAt = Date.now();
		introShownRef.current = false;
		setOpenState(true);
		writeSandboxHintState(storageKey, {
			introShown: false,
			open: true,
			timerStartedAt: startedAt,
		});
		scheduleAutoCollapse(autoCollapseMs);

		return () => clearSandboxHintTimer(timerRef);
	}, [storageKey, autoCollapseMs, scheduleAutoCollapse]);

	const setOpen = useCallback(
		(updater: boolean | ((prev: boolean) => boolean)) => {
			clearSandboxHintTimer(timerRef);
			setOpenState((prev) => {
				const nextOpen = typeof updater === 'function' ? updater(prev) : updater;
				introShownRef.current = true;
				writeSandboxHintState(storageKey, { introShown: true, open: nextOpen });
				return nextOpen;
			});
		},
		[storageKey],
	);

	return [open, setOpen] as const;
}

const TONE_STYLES = {
	orange: {
		shell: 'border-orange-300/40 bg-orange-50/80 dark:border-orange-400/25 dark:bg-orange-500/10',
		headerHover: 'hover:bg-orange-100/30 dark:hover:bg-white/[0.04]',
		headerBorder: 'border-orange-300/35 dark:border-orange-400/20',
		title: 'text-orange-950 dark:text-orange-100',
		chevron: 'text-orange-800/80 dark:text-orange-200/80',
		body: 'text-orange-900/85 dark:text-orange-100/85',
		pill: 'border-orange-400/55 bg-orange-100 text-orange-950 hover:bg-orange-200/90 dark:border-orange-500/50 dark:bg-orange-950 dark:text-orange-100 dark:hover:bg-orange-900',
		popover:
			'border-orange-300/80 bg-white text-slate-800 shadow-[0_16px_40px_rgba(2,6,23,0.22)] ring-1 ring-orange-200/80 backdrop-blur-sm dark:border-orange-500/55 dark:bg-slate-950 dark:text-orange-50 dark:shadow-[0_18px_48px_rgba(0,0,0,0.65)] dark:ring-orange-500/25',
	},
	cyan: {
		shell: 'border-cyan-300/40 bg-cyan-50/80 dark:border-cyan-400/25 dark:bg-cyan-500/10',
		headerHover: 'hover:bg-cyan-100/30 dark:hover:bg-white/[0.04]',
		headerBorder: 'border-cyan-300/35 dark:border-cyan-400/20',
		title: 'text-cyan-950 dark:text-cyan-100',
		chevron: 'text-cyan-800/80 dark:text-cyan-200/80',
		body: 'text-cyan-900/85 dark:text-cyan-100/85',
		pill: 'border-cyan-400/55 bg-cyan-100 text-cyan-950 hover:bg-cyan-200/90 dark:border-cyan-500/50 dark:bg-cyan-950 dark:text-cyan-100 dark:hover:bg-cyan-900',
		popover:
			'border-cyan-300/80 bg-white text-slate-800 shadow-[0_16px_40px_rgba(2,6,23,0.22)] ring-1 ring-cyan-200/80 backdrop-blur-sm dark:border-cyan-500/55 dark:bg-slate-950 dark:text-cyan-50 dark:shadow-[0_18px_48px_rgba(0,0,0,0.65)] dark:ring-cyan-500/25',
	},
	sky: {
		shell: 'border-sky-300/40 bg-sky-50/80 dark:border-sky-400/25 dark:bg-sky-500/10',
		headerHover: 'hover:bg-sky-100/30 dark:hover:bg-white/[0.04]',
		headerBorder: 'border-sky-300/35 dark:border-sky-400/20',
		title: 'text-sky-950 dark:text-sky-100',
		chevron: 'text-sky-800/80 dark:text-sky-200/80',
		body: 'text-sky-900/85 dark:text-sky-100/85',
		pill: 'border-sky-400/55 bg-sky-100 text-sky-950 hover:bg-sky-200/90 dark:border-sky-500/50 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900',
		popover:
			'border-sky-300/80 bg-white text-slate-800 shadow-[0_16px_40px_rgba(2,6,23,0.22)] ring-1 ring-sky-200/80 backdrop-blur-sm dark:border-sky-500/55 dark:bg-slate-950 dark:text-sky-50 dark:shadow-[0_18px_48px_rgba(0,0,0,0.65)] dark:ring-sky-500/25',
	},
} as const;

type SandboxHintProps = {
	title: string;
	tone: keyof typeof TONE_STYLES;
	/** Clé logique (suffixée par l'id utilisateur en localStorage). */
	storageKey: string;
	autoCollapseMs?: number;
	children: ReactNode;
};

/** Badge compact à côté du titre (éditeur). */
export function SandboxHintInline({
	title,
	tone,
	storageKey,
	autoCollapseMs = SANDBOX_HINT_AUTO_COLLAPSE_MS,
	children,
}: SandboxHintProps) {
	const [open, setOpen] = usePersistentSandboxHint(storageKey, autoCollapseMs);
	const styles = TONE_STYLES[tone];
	const panelId = `sandbox-hint-inline-${storageKey}`;

	return (
		<div className="relative shrink-0">
			<button
				type="button"
				className={cn(
					'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
					styles.pill,
				)}
				onClick={() => setOpen((prev) => !prev)}
				aria-expanded={open}
				aria-controls={panelId}
				title={title}
			>
				<span>{title}</span>
				<Icons.chevronDown
					className={cn('h-3 w-3 shrink-0 transition-transform duration-200', open && 'rotate-180')}
				/>
			</button>
			{open ? (
				<div
					id={panelId}
					className={cn(
						'absolute left-0 top-full z-[100] mt-1.5 w-[min(calc(100vw-3rem),20rem)] rounded-lg border px-3 py-2.5 text-xs leading-relaxed',
						styles.popover,
					)}
				>
					{children}
				</div>
			) : null}
		</div>
	);
}

/** Bandeau pleine largeur (liste parcours). */
export function SandboxHintCollapsible({
	title,
	tone,
	storageKey,
	autoCollapseMs = SANDBOX_HINT_AUTO_COLLAPSE_MS,
	children,
}: SandboxHintProps) {
	const [open, setOpen] = usePersistentSandboxHint(storageKey, autoCollapseMs);
	const styles = TONE_STYLES[tone];
	const panelId = `sandbox-hint-${storageKey}`;

	return (
		<div className={cn('overflow-hidden rounded-xl border text-sm', styles.shell)}>
			<button
				type="button"
				className={cn(
					'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
					styles.headerHover,
					open && `border-b ${styles.headerBorder}`,
				)}
				onClick={() => setOpen((prev) => !prev)}
				aria-expanded={open}
				aria-controls={panelId}
			>
				<p className={cn('font-medium', styles.title)}>{title}</p>
				<Icons.chevronDown
					className={cn(
						'h-4 w-4 shrink-0 transition-transform duration-200',
						styles.chevron,
						open && 'rotate-180',
					)}
				/>
			</button>
			{open ? (
				<div id={panelId} className="px-4 py-3">
					<div className={cn('text-xs leading-relaxed', styles.body)}>{children}</div>
				</div>
			) : null}
		</div>
	);
}
