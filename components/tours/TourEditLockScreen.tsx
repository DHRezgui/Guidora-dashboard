'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';

type TourEditLockScreenProps = {
	tourName?: string;
	message: string;
	heldByDisplayName?: string;
	onBack: () => void;
	onRetry: () => void;
	isRetrying?: boolean;
};

export function TourEditLockScreen({
	tourName,
	message,
	heldByDisplayName,
	onBack,
	onRetry,
	isRetrying = false,
}: TourEditLockScreenProps) {
	const editorLabel = heldByDisplayName?.trim() || 'un autre collaborateur';

	return (
		<div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-10">
			<div
				className={cn(
					'w-full max-w-lg rounded-2xl border p-8 text-center shadow-xl backdrop-blur-xl',
					'border-rose-200/80 bg-gradient-to-b from-rose-50/95 to-white/90',
					'dark:border-rose-900/40 dark:from-rose-950/50 dark:to-slate-950/90',
				)}
			>
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-300/60 bg-rose-100/80 dark:border-rose-800/50 dark:bg-rose-950/60">
					<Icons.admin className="h-8 w-8 text-rose-600 dark:text-rose-300" />
				</div>

				<h1 className="mt-6 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
					Édition verrouillée
				</h1>

				{tourName ? (
					<p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
						<span className="text-slate-500 dark:text-slate-400">Parcours :</span> {tourName}
					</p>
				) : null}

				<p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{message}</p>

				<div className="mt-5 inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-rose-900 dark:border-rose-800/50 dark:bg-slate-900/60 dark:text-rose-100">
					<span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
					En cours d&apos;édition par {editorLabel}
				</div>

				<p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
					L&apos;éditeur reste masqué tant que le verrou est actif. Réessayez après la fermeture de la
					session de l&apos;autre utilisateur.
				</p>

				<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button type="button" variant="outline" onClick={onBack} disabled={isRetrying}>
						<Icons.arrowLeft className="mr-2 h-4 w-4" />
						Retour aux parcours
					</Button>
					<Button
						type="button"
						onClick={onRetry}
						disabled={isRetrying}
						className={PHOENIX_PRIMARY_BUTTON_CLASS}
					>
						{isRetrying ? (
							<>
								<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
								Vérification…
							</>
						) : (
							<>
								<Icons.refresh className="mr-2 h-4 w-4" />
								Réessayer
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
