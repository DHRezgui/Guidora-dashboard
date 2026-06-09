'use client';

import { userService } from '@/lib/api';
import type { User } from '@/lib/types';
import { getUserEditLockBlockedMessage } from '@/lib/admin-resource-edit-lock';
import { useAdminResourceEditLock } from '@/lib/use-admin-resource-edit-lock';

type UseUserEditLockOptions = {
	userId: string | null;
	user: User | null;
	enabled: boolean;
};

export function useUserEditLock({ userId, user, enabled }: UseUserEditLockOptions) {
	return useAdminResourceEditLock({
		resourceId: userId,
		resource: user,
		enabled,
		api: userService,
		releasePath: (id) => `/user/${id}/edit-lock`,
		getBlockedMessage: getUserEditLockBlockedMessage,
		resourceKey: 'user',
	});
}
