'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ToursListEmptyStateProps = {
	icon: ReactNode;
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
	minHeightClassName?: string;
};

/** Bloc vide centré (filtre, chargement, liste vide) — évite le décalage dû au `pt-0` de CardContent. */
export function ToursListEmptyState({
	icon,
	title,
	description,
	action,
	className,
	minHeightClassName = 'min-h-[min(40vh,360px)]',
}: ToursListEmptyStateProps) {
	return (
		<Card
			className={cn(
				'w-full border-slate-300 border-dashed bg-white/85 shadow-sm dark:border-white/15 dark:bg-slate-900/45',
				className,
			)}
		>
			<CardContent className="p-0">
				<div
					className={cn(
						'flex w-full flex-col items-center justify-center px-6 py-16 text-center',
						minHeightClassName,
					)}
				>
					<div className="flex flex-col items-center justify-center gap-4">
						<div className="flex shrink-0 items-center justify-center">{icon}</div>
						<div className="flex max-w-lg flex-col items-center gap-2 text-center">
							<h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
							{description ? (
								<div className="text-sm text-slate-600 dark:text-slate-400">{description}</div>
							) : null}
						</div>
						{action ? <div className="flex items-center justify-center">{action}</div> : null}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
