'use client';

import dynamic from 'next/dynamic';
import { useEffect, type ComponentProps } from 'react';
import { Icons } from '@/components/ui/icons';

const TourSimulator = dynamic(() => import('@/components/editor/TourSimulator'), {
	loading: () => (
		<div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 dark:border-white/15 dark:bg-slate-900/40">
			<div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
				<Icons.spinner className="h-4 w-4 animate-spin" />
				Chargement de la prévisualisation…
			</div>
		</div>
	),
	ssr: false,
});

export default function TourPreviewSimulator(props: ComponentProps<typeof TourSimulator>) {
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const preload = () => {
			void import('@/components/editor/TourSimulator');
		};
		const idleId = window.requestIdleCallback?.(preload);
		if (idleId !== undefined) {
			return () => window.cancelIdleCallback?.(idleId);
		}
		const timeoutId = window.setTimeout(preload, 1200);
		return () => window.clearTimeout(timeoutId);
	}, []);

	return <TourSimulator prefetchAdjacentIframes={false} {...props} />;
}
