import type { User } from '@/lib/types';

export type DashboardRole = 'ADMIN' | 'DEVELOPER' | 'USER';

/** Clés passées à RoleRouteGuard (pas de fonction — compatible Server/Client Components). */
export type DashboardAccessPolicy = 'users' | 'blueprints' | 'tours' | 'sdkLab' | 'organizations';

export function getDashboardRole(user: Pick<User, 'role'> | null | undefined): DashboardRole | null {
	const role = user?.role;
	if (role === 'ADMIN' || role === 'DEVELOPER' || role === 'USER') {
		return role;
	}
	return null;
}

/** Parcours production : concat, audience, replay job, approbation sandbox (ADMIN). */
export function canManageTours(role: DashboardRole | null): boolean {
	return role === 'ADMIN';
}

/** Accès à la page de gestion des parcours (ADMIN + DEVELOPER). */
export function canAccessToursManagement(role: DashboardRole | null): boolean {
	return role === 'ADMIN' || role === 'DEVELOPER';
}

/** Création de parcours : ADMIN (production/sandbox) ; DEVELOPER (sandbox forcé côté API). */
export function canCreateTours(role: DashboardRole | null): boolean {
	return role === 'ADMIN' || role === 'DEVELOPER';
}

/** Publication des drafts contextuels SDK (lab Tests — API ADMIN + DEVELOPER). */
export function canPublishContextualDrafts(role: DashboardRole | null): boolean {
	return role === 'ADMIN' || role === 'DEVELOPER';
}

/** Édition / suppression des parcours lab (voir aussi `canManageTour` dans tour-lab.ts). */
export function canManageLabPublishedTours(role: DashboardRole | null): boolean {
	return role === 'DEVELOPER';
}

/** Blueprints org : consultation liste + détail (ADMIN + DEVELOPER). */
export function canAccessBlueprints(role: DashboardRole | null): boolean {
	return role === 'ADMIN' || role === 'DEVELOPER';
}

/** Blueprints org : CRUD + publication (API @Roles ADMIN). */
export function canManageBlueprints(role: DashboardRole | null): boolean {
	return role === 'ADMIN';
}

/** Liste / détail organisations : ADMIN (toutes) ; DEVELOPER (la sienne uniquement, lecture). */
export function canAccessOrganizations(role: DashboardRole | null): boolean {
	return role === 'ADMIN' || role === 'DEVELOPER';
}

/** Création / suppression / mise à jour organisation (API ADMIN). */
export function canManageOrganizations(role: DashboardRole | null): boolean {
	return role === 'ADMIN';
}

/** Gestion des comptes utilisateurs (API ADMIN). */
export function canManageUsers(role: DashboardRole | null): boolean {
	return role === 'ADMIN';
}

/** Lab SDK Tests (menu réservé aux rôles techniques). */
export function canAccessSdkLab(role: DashboardRole | null): boolean {
	return role === 'ADMIN' || role === 'DEVELOPER';
}

/** Tokens d'intégration SDK (API ADMIN + DEVELOPER avec organisation). */
export function canManageSdkTokens(
	role: DashboardRole | null,
	hasOrganization: boolean,
): boolean {
	return (role === 'ADMIN' || role === 'DEVELOPER') && hasOrganization;
}

/** Parcours : consultation liste, étapes, prévisualisation (tous les rôles avec JWT). */
export function canViewTours(role: DashboardRole | null): boolean {
	return role === 'ADMIN' || role === 'DEVELOPER' || role === 'USER';
}

export function hasDashboardAccess(
	policy: DashboardAccessPolicy,
	role: DashboardRole | null,
): boolean {
	switch (policy) {
		case 'users':
			return canManageUsers(role);
		case 'blueprints':
			return canAccessBlueprints(role);
		case 'tours':
			return canAccessToursManagement(role);
		case 'sdkLab':
			return canAccessSdkLab(role);
		case 'organizations':
			return canAccessOrganizations(role);
		default:
			return false;
	}
}
