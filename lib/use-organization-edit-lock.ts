'use client';

import { organizationService } from '@/lib/api';
import type { Organization } from '@/lib/types';
import { getOrganizationEditLockBlockedMessage } from '@/lib/admin-resource-edit-lock';
import { useAdminResourceEditLock } from '@/lib/use-admin-resource-edit-lock';

type UseOrganizationEditLockOptions = {
	organizationId: string | null;
	organization: Organization | null;
	enabled: boolean;
};

export function useOrganizationEditLock({
	organizationId,
	organization,
	enabled,
}: UseOrganizationEditLockOptions) {
	return useAdminResourceEditLock({
		resourceId: organizationId,
		resource: organization,
		enabled,
		api: organizationService,
		releasePath: (id) => `/organization/${id}/edit-lock`,
		getBlockedMessage: getOrganizationEditLockBlockedMessage,
		resourceKey: 'organization',
	});
}
