'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import type { OrganizationJourneyBlueprintRow } from '@/lib/api';
import { BlueprintAccessGrantsMenu } from '@/components/blueprints/BlueprintAccessGrantsMenu';
import { DEFAULT_FAQ_PROJECT_KEY } from '@/lib/faq-project';
import { formatProjectTitle } from '@/lib/project';
import { cn } from '@/lib/utils';
import { blueprintDisplayMeta } from '../blueprint-shared';

function formatUpdatedAt(iso: string) {
	return new Date(iso).toLocaleString('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

type BlueprintListCardProps = {
	row: OrganizationJourneyBlueprintRow;
	canModify: boolean;
	canPublish: boolean;
	canManageSharing: boolean;
	canDelete: boolean;
	ownerUserId?: string;
	onTogglePublish: (row: OrganizationJourneyBlueprintRow) => void;
	onDelete: (row: OrganizationJourneyBlueprintRow) => void;
	onShowSteps: (row: OrganizationJourneyBlueprintRow) => void;
	onGrantsUpdated: () => void | Promise<void>;
	showProjectKey?: boolean;
};

export function BlueprintListCard({
	row,
	canModify,
	canPublish,
	canManageSharing,
	canDelete,
	ownerUserId,
	onTogglePublish,
	onDelete,
	onShowSteps,
	onGrantsUpdated,
	showProjectKey = false,
}: BlueprintListCardProps) {
	const meta = blueprintDisplayMeta(row);
	const projectKeyLabel = row.projectKey?.trim() || DEFAULT_FAQ_PROJECT_KEY;
	const hasActiveEditLock =
		Boolean(row.editLock?.required) && Boolean(row.editLock?.heldByUserId);
	const isLockedByOther = hasActiveEditLock && !row.editLock?.isHeldByMe;
	const showAdminActions = canModify || canPublish || canManageSharing;

	return (
		<article
			className={cn(
				'group relative flex flex-col overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300',
				'hover:-translate-y-0.5',
				row.isPublished
					? 'border-emerald-300/50 bg-[linear-gradient(155deg,rgba(16,185,129,0.1),rgba(255,255,255,0.95)_50%,rgba(248,250,252,0.92))] shadow-[0_12px_28px_rgba(2,6,23,0.1)] hover:border-emerald-400/55 hover:shadow-[0_20px_45px_rgba(16,185,129,0.15)] dark:border-emerald-400/25 dark:bg-[linear-gradient(155deg,rgba(16,185,129,0.08),rgba(15,23,42,0.92)_45%,rgba(2,6,23,0.95))] dark:hover:shadow-[0_20px_45px_rgba(16,185,129,0.12)]'
					: 'border-orange-300/45 bg-[linear-gradient(155deg,rgba(249,115,22,0.08),rgba(255,255,255,0.95)_50%,rgba(248,250,252,0.92))] shadow-[0_12px_28px_rgba(2,6,23,0.1)] hover:border-orange-400/50 hover:shadow-[0_20px_45px_rgba(249,115,22,0.12)] dark:border-orange-400/20 dark:bg-[linear-gradient(155deg,rgba(249,115,22,0.07),rgba(15,23,42,0.92)_45%,rgba(2,6,23,0.95))] dark:hover:shadow-[0_20px_45px_rgba(249,115,22,0.1)]',
			)}
		>
			<div
				className={cn(
					'h-1 w-full',
					row.isPublished
						? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500'
						: 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600',
				)}
			/>
			{row.isPublished ? (
				<>
					<div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-500/10 opacity-60 blur-3xl transition-opacity group-hover:opacity-100" />
					<div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-pink-500/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-80" />
				</>
			) : null}

			<div className="relative flex flex-1 flex-col gap-4 p-5">
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 items-start gap-3">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-400/30 bg-gradient-to-br from-orange-500/25 to-pink-600/15">
							<Icons.blueprints className="h-5 w-5 text-orange-600 dark:text-orange-300" />
						</div>
						<div className="min-w-0 space-y-1">
							<h3
								className="line-clamp-1 text-base font-bold tracking-tight text-slate-900 dark:text-white"
								title={meta.name}
							>
								{meta.name}
							</h3>
							<p
								className="truncate font-mono text-[11px] text-orange-700/90 dark:text-orange-200/80"
								title={row.blueprintId}
							>
								{row.blueprintId}
							</p>
							{showProjectKey ? (
								<p className="text-[10px] font-semibold text-violet-700 dark:text-violet-200/90">
									Projet : {formatProjectTitle(projectKeyLabel)}
									{projectKeyLabel !== DEFAULT_FAQ_PROJECT_KEY ? (
										<span className="ml-1 font-mono font-normal text-violet-600/80 dark:text-violet-300/70">
											({projectKeyLabel})
										</span>
									) : null}
								</p>
							) : null}
						</div>
					</div>
					<Badge
						variant="outline"
						className={cn(
							'shrink-0 gap-1.5 border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
							row.isPublished
								? 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200'
								: 'border-orange-300/60 bg-orange-50 text-orange-800 dark:border-orange-400/35 dark:bg-orange-500/10 dark:text-orange-200',
						)}
					>
						<span
							className={cn(
								'h-1.5 w-1.5 rounded-full',
								row.isPublished
									? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
									: 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.7)]',
							)}
						/>
						{row.isPublished ? 'Publié' : 'Brouillon'}
					</Badge>
				</div>

				{hasActiveEditLock ? (
					<p className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-2.5 py-1.5 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
						{isLockedByOther
							? `En édition par ${row.editLock?.heldByDisplayName?.trim() || 'un autre administrateur'} — publication et suppression désactivées`
							: 'Session d’édition en cours — publication et suppression désactivées depuis la liste'}
					</p>
				) : null}

				{(row.sharingHasModify || row.sharingHasPublish) && (
					<p className="rounded-lg border border-indigo-200/80 bg-indigo-50/90 px-2.5 py-1.5 text-xs text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-100">
						{row.sharingHasModify ? 'Modification déléguée' : ''}
						{row.sharingHasModify && row.sharingHasPublish ? ' · ' : ''}
						{row.sharingHasPublish ? 'Publication déléguée' : ''}
					</p>
				)}

				<p className="line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-slate-600 dark:text-slate-400">
					{meta.description || (
						<span className="italic text-slate-500 dark:text-slate-500">Aucune description</span>
					)}
				</p>

				<div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-100/80 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-800/35">
					<div className="flex flex-wrap gap-2">
						<span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/50 bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-200">
							<Icons.verticalCatalog className="h-3 w-3 opacity-80" />
							{row.vertical}
						</span>
						<span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300/50 bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-800 dark:border-purple-400/20 dark:bg-purple-500/10 dark:text-purple-200">
							<Icons.intent className="h-3 w-3 opacity-80" />
							{meta.intent}
						</span>
					</div>
					<div className="h-px w-full bg-slate-200 dark:bg-white/10" />
					<button
						type="button"
						onClick={() => onShowSteps(row)}
						className="group/btn flex w-fit items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-orange-500 dark:text-slate-200 dark:hover:text-orange-300"
						title="Voir les étapes du blueprint"
					>
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-sm transition-colors group-hover/btn:bg-primary group-hover/btn:text-white dark:bg-indigo-500/20 dark:text-indigo-300">
							<Icons.list className="h-3 w-3" />
						</div>
						<span>
							{meta.stepCount} étape{meta.stepCount !== 1 ? 's' : ''}
						</span>
					</button>
				</div>

				<p className="text-[11px] text-slate-500 dark:text-slate-500">
					Mis à jour {formatUpdatedAt(row.updatedAt)}
				</p>

				{showAdminActions && (
					<div className="mt-auto flex items-center gap-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
						{canModify ? (
							<Link href={`/dashboard/blueprints/create?id=${row.id}`} className="min-w-0 flex-1">
								<Button
									variant="outline"
									className="h-9 w-full border-slate-300 bg-white/90 text-sm text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white"
								>
									<Icons.edit className="mr-2 h-3.5 w-3.5" />
									Modifier
								</Button>
							</Link>
						) : null}
						{canPublish ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!canPublish}
								title={
									!canPublish && hasActiveEditLock
										? 'Publication indisponible pendant une session d’édition'
										: undefined
								}
								className={cn(
									'h-9 shrink-0 border-slate-300 bg-white/90 text-sm shadow-sm transition-colors dark:border-white/15 dark:bg-slate-900/55',
									row.isPublished
										? 'text-slate-600 hover:bg-amber-100 hover:text-amber-700 hover:border-amber-300/70 focus:ring-amber-500/20 dark:text-slate-300 dark:hover:bg-amber-500/15 dark:hover:text-amber-300 dark:hover:border-amber-400/30'
										: 'text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300/70 focus:ring-emerald-500/20 dark:text-slate-300 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300 dark:hover:border-emerald-400/30',
								)}
								onClick={() => onTogglePublish(row)}
							>
								{row.isPublished ? 'Dépublier' : 'Publier'}
							</Button>
						) : null}
						{canManageSharing ? (
							<BlueprintAccessGrantsMenu
								row={row}
								ownerUserId={ownerUserId}
								onUpdated={onGrantsUpdated}
							/>
						) : null}
						{canManageSharing ? (
							<Button
								type="button"
								variant="outline"
								size="icon"
								disabled={!canDelete}
								className="h-9 w-9 shrink-0 border-slate-300 bg-white/90 text-slate-600 transition-colors hover:border-rose-300/70 hover:bg-rose-100 hover:text-rose-700 focus:ring-2 focus:ring-rose-500/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:border-rose-400/30 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 disabled:opacity-40"
								onClick={() => onDelete(row)}
								title={
									!canDelete && hasActiveEditLock
										? 'Suppression indisponible pendant une session d’édition'
										: 'Supprimer'
								}
								aria-label={`Supprimer ${row.blueprintId}`}
							>
								<Icons.trash className="h-4 w-4" />
							</Button>
						) : null}
					</div>
				)}
			</div>
		</article>
	);
}
