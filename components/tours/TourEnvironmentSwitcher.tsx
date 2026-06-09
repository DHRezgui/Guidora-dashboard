'use client';

import type { GuidedTour } from '@/lib/types';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export type TourDeploymentTarget = 'sandbox' | 'production';

type TourEnvironmentSwitcherProps = {
	tour: GuidedTour;
	disabled?: boolean;
	/** False when a developer-submitted tour is rejected or still pending approval. */
	canTransferToProduction?: boolean;
	/** False when a non-owner admin views an admin-originated production tour. */
	canTransferToSandbox?: boolean;
	onTransfer: (target: TourDeploymentTarget) => void;
};

export function TourEnvironmentSwitcher({
	tour,
	disabled = false,
	canTransferToProduction = true,
	canTransferToSandbox = true,
	onTransfer,
}: TourEnvironmentSwitcherProps) {
	const current: TourDeploymentTarget =
		tour.environment === 'production' ? 'production' : 'sandbox';

	return (
		<div
			className="inline-flex rounded-lg border border-orange-300/45 bg-orange-50/50 p-0.5 shadow-sm dark:border-orange-400/25 dark:bg-orange-500/10"
			role="group"
			aria-label="Environnement de déploiement du parcours"
		>
			<button
				type="button"
				disabled={disabled || current === 'sandbox' || !canTransferToSandbox}
				onClick={() => onTransfer('sandbox')}
				className={cn(
					'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors',
					current === 'sandbox'
						? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm'
						: 'text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-900/60',
					(disabled || !canTransferToSandbox) && 'cursor-not-allowed opacity-60',
				)}
				title={
					canTransferToSandbox
						? 'Parcours en phase de test (sandbox)'
						: 'Seul le créateur administrateur peut repasser ce parcours en sandbox'
				}
			>
				<Icons.sandbox className="h-3 w-3" />
				Sandbox
			</button>
			<button
				type="button"
				disabled={disabled || current === 'production' || !canTransferToProduction}
				onClick={() => onTransfer('production')}
				className={cn(
					'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors',
					current === 'production'
						? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm'
						: 'text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-900/60',
					(disabled || !canTransferToProduction) && 'cursor-not-allowed opacity-60',
				)}
				title={
					canTransferToProduction
						? 'Parcours publiable pour les utilisateurs finaux'
						: 'Indisponible : parcours rejeté ou en attente — approuvez après correction du développeur'
				}
			>
				<Icons.globe className="h-3 w-3" />
				Prod
			</button>
		</div>
	);
}
