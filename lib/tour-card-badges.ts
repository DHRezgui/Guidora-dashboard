import type { GuidedTour } from '@/lib/types';
import type { DashboardRole } from '@/lib/dashboard-roles';
import { buildTourListIndex, type TourListEntryMeta } from '@/lib/tour-list-index';
import type { TourCreatorRoleLookup } from '@/lib/tour-sandbox';

export type TourCardStatusBadge = {
	key: string;
	label: string;
	className: string;
};

const STYLE = {
	inactive:
		'border-slate-300/55 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-slate-800/55 dark:text-slate-400',
	active:
		'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200',
	lab: 'border-orange-300/50 bg-orange-50/90 text-orange-800 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200',
	autogen:
		'border-cyan-300/50 bg-cyan-50/90 text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-200',
	sandbox:
		'border-orange-300/50 bg-orange-50/90 text-orange-800 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200',
	lecture:
		'border-sky-300/55 bg-sky-50/90 text-sky-900 dark:border-sky-400/35 dark:bg-sky-500/10 dark:text-sky-200',
	collab:
		'border-emerald-300/55 bg-emerald-50/90 text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-200',
	prive:
		'border-violet-300/50 bg-violet-50/90 text-violet-800 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200',
	owner:
		'border-amber-300/55 bg-amber-50/90 text-amber-950 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-100',
	pending:
		'border-amber-300/50 bg-amber-50/90 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200',
	rejected:
		'border-rose-300/50 bg-rose-50/90 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200',
	transferred:
		'border-emerald-300/55 bg-emerald-50/90 text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-100',
	returned:
		'border-amber-300/50 bg-amber-50/90 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100',
	approved:
		'border-emerald-300/50 bg-emerald-50/90 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200',
} as const;

/** Badges de statut alignés sur les cartes `/dashboard/tours`. */
export function metaToTourCardStatusBadges(meta: TourListEntryMeta): TourCardStatusBadge[] {
	const badges: TourCardStatusBadge[] = [];
	const deploymentActive = meta.isSandbox ? meta.sandboxTestActive : meta.productionActive;

	if (!meta.showEnvironmentSwitcher) {
		badges.push({
			key: 'activity',
			label: deploymentActive
				? meta.isActiveTestLabel
					? 'Actif (test)'
					: 'Actif'
				: 'Inactif',
			className: deploymentActive ? STYLE.active : STYLE.inactive,
		});
	}

	if (meta.isLab) {
		badges.push({ key: 'lab', label: 'Lab SDK', className: STYLE.lab });
	}
	if (meta.isAutogen) {
		badges.push({ key: 'autogen', label: 'Autogénéré', className: STYLE.autogen });
	}
	if (meta.isSandbox && !meta.showEnvironmentSwitcher) {
		badges.push({ key: 'sandbox', label: 'Sandbox', className: STYLE.sandbox });
	}
	if (meta.showSharingLectureBadge) {
		badges.push({ key: 'lecture', label: 'Lecture', className: STYLE.lecture });
	}
	if (meta.showSharingCollabBadge) {
		badges.push({ key: 'collab', label: 'Collab', className: STYLE.collab });
	}
	if (meta.showPrivateOwnerBadge) {
		badges.push({ key: 'prive', label: 'Privé', className: STYLE.prive });
	}
	if (meta.showOwnerRoleBadge) {
		badges.push({ key: 'owner', label: 'Owner', className: STYLE.owner });
	}
	if (meta.isDeveloperModerationPending) {
		badges.push({ key: 'pending', label: 'En attente', className: STYLE.pending });
	}
	if (meta.isDeveloperModerationRejected) {
		badges.push({ key: 'rejected', label: 'Rejeté', className: STYLE.rejected });
	}
	if (meta.showTransferredBadgePreviousOwner || meta.showTransferredBadgeNewOwner) {
		badges.push({ key: 'transferred', label: 'Transféré', className: STYLE.transferred });
	}
	if (meta.isDeveloperModerationReturned) {
		badges.push({ key: 'returned', label: 'Retour', className: STYLE.returned });
	}
	if (meta.isApprovedSandbox) {
		badges.push({ key: 'approved', label: 'Approuvé', className: STYLE.approved });
	}

	return badges;
}

export function getTourCardStatusBadges(
	tour: GuidedTour,
	role: DashboardRole | null,
	userId?: string,
	creatorRoleByUserId?: TourCreatorRoleLookup,
): TourCardStatusBadge[] {
	const { entries } = buildTourListIndex(
		[tour],
		role,
		userId,
		role === 'ADMIN',
		creatorRoleByUserId,
	);
	const meta = entries[0]?.meta;
	if (!meta) {
		return [];
	}
	return metaToTourCardStatusBadges(meta);
}
