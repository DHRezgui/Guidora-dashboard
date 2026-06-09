import type { OrganizationJourneyBlueprintRow } from '@/lib/api';
import type { User } from '@/lib/types';
import { canManageBlueprints, getDashboardRole } from '@/lib/dashboard-roles';
import { hasActiveBlueprintEditLock } from '@/lib/blueprint-edit-lock';
import { hasBlueprintAccessGrant } from '@/lib/blueprint-access';

export function isBlueprintOwner(
	row: Pick<OrganizationJourneyBlueprintRow, 'createdBy'>,
	user: Pick<User, 'id'> | null | undefined,
): boolean {
	if (!user?.id) {
		return false;
	}
	if (!row.createdBy) {
		return true;
	}
	return row.createdBy === user.id;
}

export function canModifyBlueprint(
	row: Pick<OrganizationJourneyBlueprintRow, 'createdBy' | 'accessGrants'>,
	user: Pick<User, 'id' | 'role'> | null | undefined,
): boolean {
	if (!canManageBlueprints(getDashboardRole(user))) {
		return false;
	}
	if (isBlueprintOwner(row, user)) {
		return true;
	}
	return hasBlueprintAccessGrant(row.accessGrants, user?.id, 'modify');
}

export function canPublishBlueprint(
	row: Pick<OrganizationJourneyBlueprintRow, 'createdBy' | 'accessGrants' | 'editLock'>,
	user: Pick<User, 'id' | 'role'> | null | undefined,
): boolean {
	if (!canManageBlueprints(getDashboardRole(user))) {
		return false;
	}
	const hasPermission =
		isBlueprintOwner(row, user) || hasBlueprintAccessGrant(row.accessGrants, user?.id, 'publish');
	if (!hasPermission) {
		return false;
	}
	if (hasActiveBlueprintEditLock(row.editLock) && !row.editLock?.isHeldByMe) {
		return false;
	}
	return true;
}

export function canDeleteBlueprint(
	row: Pick<OrganizationJourneyBlueprintRow, 'createdBy' | 'editLock'>,
	user: Pick<User, 'id' | 'role'> | null | undefined,
): boolean {
	if (!canManageBlueprints(getDashboardRole(user))) {
		return false;
	}
	if (!isBlueprintOwner(row, user)) {
		return false;
	}
	return !hasActiveBlueprintEditLock(row.editLock);
}

export function canManageBlueprintSharing(
	row: Pick<OrganizationJourneyBlueprintRow, 'createdBy'>,
	user: Pick<User, 'id' | 'role'> | null | undefined,
): boolean {
	if (!canManageBlueprints(getDashboardRole(user))) {
		return false;
	}
	return isBlueprintOwner(row, user);
}

/** @deprecated Utiliser canModifyBlueprint / canPublishBlueprint */
export function canEditBlueprintActions(user: Pick<User, 'role'> | null | undefined): boolean {
	return canManageBlueprints(getDashboardRole(user));
}
