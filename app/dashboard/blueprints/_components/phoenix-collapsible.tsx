'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { PHOENIX_PANEL_CLASS } from '../blueprint-shared';

export function PhoenixCollapsibleCard({
	title,
	description,
	open,
	onOpenChange,
	children,
}: {
	title: string;
	description: string;
	open: boolean;
	onOpenChange: (value: boolean) => void;
	children: React.ReactNode;
}) {
	const panelId = `phoenix-panel-${title.replace(/\s+/g, '-').toLowerCase()}`;

	return (
		<Card className={cn(PHOENIX_PANEL_CLASS, 'h-fit w-full')}>
			<button
				type="button"
				className={cn(
					'flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-slate-100/50 dark:hover:bg-white/5',
					open && 'border-b border-slate-200/80 dark:border-white/10',
				)}
				onClick={() => onOpenChange(!open)}
				aria-expanded={open}
				aria-controls={panelId}
			>
				<div className="min-w-0 flex-1">
					<p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
					<p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>
				</div>
				<Icons.chevronDown
					className={cn(
						'h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400',
						open && 'rotate-180',
					)}
				/>
			</button>
			{open ? (
				<CardContent id={panelId} className="pt-4">
					{children}
				</CardContent>
			) : null}
		</Card>
	);
}

export function PhoenixSwitch({
	checked,
	onCheckedChange,
	label,
	ariaLabel,
	disabled = false,
}: {
	checked: boolean;
	onCheckedChange: (value: boolean) => void;
	label: string;
	ariaLabel?: string;
	disabled?: boolean;
}) {
	return (
		<div className="inline-flex items-center gap-2">
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				aria-label={ariaLabel ?? label}
				disabled={disabled}
				onClick={() => onCheckedChange(!checked)}
				className={cn(
					'relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-orange-400/35 disabled:cursor-not-allowed disabled:opacity-50',
					checked
						? 'border-orange-500/70 bg-orange-500 shadow-[0_0_22px_rgba(249,115,22,0.35)]'
						: 'border-slate-300/80 bg-slate-300/80 dark:border-white/20 dark:bg-slate-700/70',
				)}
			>
				<span
					className={cn(
						'inline-block h-6 w-6 rounded-full bg-white shadow transition-transform',
						checked ? 'translate-x-7' : 'translate-x-0.5',
					)}
				/>
			</button>
			<span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
		</div>
	);
}
