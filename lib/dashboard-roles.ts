import type { User } from '@/lib/types';



export type DashboardRole = 'SUPER_ADMIN' | 'ADMIN' | 'DEVELOPER' | 'USER';



/** Clés passées à RoleRouteGuard (pas de fonction — compatible Server/Client Components). */

export type DashboardAccessPolicy =

	| 'users'

	| 'platformAdmins'

	| 'blueprints'

	| 'faq'

	| 'support'

	| 'projects'

	| 'tours'

	| 'sdkLab'

	| 'organizations'

	| 'platform';



export function getDashboardRole(user: Pick<User, 'role'> | null | undefined): DashboardRole | null {

	const role = user?.role;

	if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'DEVELOPER' || role === 'USER') {

		return role;

	}

	return null;

}



export function isSuperAdmin(role: DashboardRole | null): boolean {

	return role === 'SUPER_ADMIN';

}



export function isOrgAdmin(role: DashboardRole | null): boolean {

	return role === 'ADMIN';

}



/** Parcours production : concat, audience, replay job, approbation sandbox (ADMIN org). */

export function canManageTours(role: DashboardRole | null): boolean {

	return role === 'ADMIN';

}



/** Accès à la page de gestion des parcours (ADMIN org + DEVELOPER). */

export function canAccessToursManagement(role: DashboardRole | null): boolean {

	return role === 'ADMIN' || role === 'DEVELOPER';

}



export function canCreateTours(role: DashboardRole | null): boolean {

	return role === 'ADMIN' || role === 'DEVELOPER';

}



export function canPublishContextualDrafts(role: DashboardRole | null): boolean {

	return role === 'ADMIN' || role === 'DEVELOPER';

}



export function canManageLabPublishedTours(role: DashboardRole | null): boolean {

	return role === 'DEVELOPER';

}



export function canAccessBlueprints(role: DashboardRole | null): boolean {

	return role === 'ADMIN' || role === 'DEVELOPER';

}



export function canManageBlueprints(role: DashboardRole | null): boolean {

	return role === 'ADMIN';

}



export function canAccessFaq(role: DashboardRole | null): boolean {

	return role === 'ADMIN' || role === 'DEVELOPER';

}

export function canAccessSupportTickets(role: DashboardRole | null): boolean {
	return role === 'ADMIN' || role === 'DEVELOPER';
}

/** Suppression définitive (soft delete) d’un ticket — admin d’organisation uniquement. */
export function canDeleteSupportTickets(role: DashboardRole | null): boolean {
	return role === 'ADMIN';
}



export function canAccessProjects(role: DashboardRole | null): boolean {

	return role === 'ADMIN' || role === 'DEVELOPER';

}



export function canManageFaq(role: DashboardRole | null): boolean {

	return role === 'ADMIN';

}

/** Suppression complète du scope SDK (FAQ + parcours + blueprints). */
export function canManageProjectScope(role: DashboardRole | null): boolean {
	return role === 'ADMIN';
}



/** Lecture de sa propre organisation (DEVELOPER). */

export function canAccessOrganizations(role: DashboardRole | null): boolean {

	return role === 'DEVELOPER';

}



/** Console plateforme : création / édition / suppression d’organisations. */

export function canManagePlatformOrganizations(role: DashboardRole | null): boolean {

	return role === 'SUPER_ADMIN';

}



/** @deprecated Utiliser canManagePlatformOrganizations */

export function canManageOrganizations(role: DashboardRole | null): boolean {

	return canManagePlatformOrganizations(role);

}



/** Super admin : comptes administrateur rattachés aux organisations clientes. */

export function canManagePlatformAdmins(role: DashboardRole | null): boolean {

	return role === 'SUPER_ADMIN';

}



/** Admin organisation : développeurs et utilisateurs de son équipe. */

export function canManageTeamMembers(role: DashboardRole | null): boolean {

	return role === 'ADMIN';

}



/** @deprecated Utiliser canManagePlatformAdmins ou canManageTeamMembers */

export function canManageUsers(role: DashboardRole | null): boolean {

	return canManagePlatformAdmins(role) || canManageTeamMembers(role);

}



export function canAccessSdkLab(role: DashboardRole | null): boolean {

	return role === 'ADMIN' || role === 'DEVELOPER';

}



export function canManageSdkTokens(

	role: DashboardRole | null,

	hasOrganization: boolean,

): boolean {

	return (role === 'ADMIN' || role === 'DEVELOPER') && hasOrganization;

}



export function canViewTours(role: DashboardRole | null): boolean {

	return role === 'ADMIN' || role === 'DEVELOPER' || role === 'USER';

}



export function canAccessPlatformConsole(role: DashboardRole | null): boolean {

	return role === 'SUPER_ADMIN';

}

/** Page d’accueil après connexion selon le rôle. */
export function getDashboardHomeHref(role: DashboardRole | null): string {
	return role === 'SUPER_ADMIN' ? '/dashboard/platform' : '/dashboard';
}

export function hasDashboardAccess(

	policy: DashboardAccessPolicy,

	role: DashboardRole | null,

): boolean {

	switch (policy) {

		case 'users':

			return canManageTeamMembers(role);

		case 'platformAdmins':

			return canManagePlatformAdmins(role);

		case 'blueprints':

			return canAccessBlueprints(role);

		case 'faq':

			return canAccessFaq(role);

		case 'support':

			return canAccessSupportTickets(role);

		case 'projects':

			return canAccessProjects(role);

		case 'tours':

			return canAccessToursManagement(role);

		case 'sdkLab':

			return canAccessSdkLab(role);

		case 'organizations':

			return canAccessOrganizations(role);

		case 'platform':

			return canAccessPlatformConsole(role);

		default:

			return false;

	}

}


