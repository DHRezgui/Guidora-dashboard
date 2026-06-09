import type { OrganizationJourneyBlueprintRow } from '@/lib/api';

export type BlueprintAccessMode = 'modify' | 'publish';

export type BlueprintAccessGrant = {
	id?: string;
	userId: string;
	accessMode: BlueprintAccessMode;
	user?: {
		id: string;
		email?: string;
		firstName?: string;
		lastName?: string;
		role?: string;
	};
};

export function hasBlueprintAccessGrant(
	grants: BlueprintAccessGrant[] | undefined,
	userId: string | undefined,
	mode: BlueprintAccessMode,
): boolean {
	if (!userId) {
		return false;
	}
	return Boolean(grants?.some((g) => g.userId === userId && g.accessMode === mode));
}

export function toBlueprintAccessGrantPayload(
	grants: ReadonlyArray<Pick<BlueprintAccessGrant, 'userId' | 'accessMode'>> | undefined,
): Array<{ userId: string; accessMode: BlueprintAccessMode }> {
	if (!grants?.length) {
		return [];
	}
	const unique = new Map<string, { userId: string; accessMode: BlueprintAccessMode }>();
	for (const grant of grants) {
		const userId = grant.userId?.trim();
		if (!userId) {
			continue;
		}
		unique.set(`${userId}|${grant.accessMode}`, { userId, accessMode: grant.accessMode });
	}
	return [...unique.values()];
}

export function mergeBlueprintGrantsForMode(
	source: BlueprintAccessGrant[] | undefined,
	mode: BlueprintAccessMode,
	selectedUserIds: string[],
): Array<{ userId: string; accessMode: BlueprintAccessMode }> {
	const other = toBlueprintAccessGrantPayload(source?.filter((g) => g.accessMode !== mode));
	const next = selectedUserIds.map((userId) => ({ userId, accessMode: mode }));
	return [...other, ...next];
}

export function mergeBlueprintGrantsForBothModes(
	source: BlueprintAccessGrant[] | undefined,
	selectedUserIds: string[],
): Array<{ userId: string; accessMode: BlueprintAccessMode }> {
	const selected = new Set(selectedUserIds);
	const previouslyBoth = new Set(grantUserIdsWithBothBlueprintModes(source));
	const revokedBoth = [...previouslyBoth].filter((userId) => !selected.has(userId));

	const other = toBlueprintAccessGrantPayload(
		source?.filter((g) => {
			if (selected.has(g.userId)) {
				return false;
			}
			if (revokedBoth.includes(g.userId)) {
				return false;
			}
			return true;
		}),
	);
	const both = selectedUserIds.flatMap((userId) => [
		{ userId, accessMode: 'modify' as const },
		{ userId, accessMode: 'publish' as const },
	]);
	return toBlueprintAccessGrantPayload([...other, ...both]);
}

export function grantUserIdsWithBothBlueprintModes(
	grants: BlueprintAccessGrant[] | undefined,
): string[] {
	const modifyIds = new Set(grantUserIdsForBlueprintMode(grants, 'modify'));
	return grantUserIdsForBlueprintMode(grants, 'publish').filter((id) => modifyIds.has(id));
}

export function grantUserIdsForBlueprintMode(
	grants: BlueprintAccessGrant[] | undefined,
	mode: BlueprintAccessMode,
): string[] {
	return (grants ?? [])
		.filter((g) => g.accessMode === mode)
		.map((g) => g.userId)
		.filter((id): id is string => Boolean(id));
}

export function canManageBlueprintSharing(
	row: Pick<OrganizationJourneyBlueprintRow, 'createdBy'>,
	userId?: string,
): boolean {
	if (!userId) {
		return false;
	}
	if (!row.createdBy) {
		return true;
	}
	return row.createdBy === userId;
}
