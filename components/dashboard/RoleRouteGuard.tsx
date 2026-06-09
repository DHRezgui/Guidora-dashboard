'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/api';
import {
	getDashboardRole,
	hasDashboardAccess,
	type DashboardAccessPolicy,
} from '@/lib/dashboard-roles';
import { Icons } from '@/components/ui/icons';

type RoleRouteGuardProps = {
	access: DashboardAccessPolicy;
	children: React.ReactNode;
	redirectTo?: string;
};

export function RoleRouteGuard({
	access,
	children,
	redirectTo = '/dashboard',
}: RoleRouteGuardProps) {
	const router = useRouter();
	const [ready, setReady] = useState(false);
	const [permitted, setPermitted] = useState(false);

	useEffect(() => {
		const role = getDashboardRole(authService.getUser());
		const ok = hasDashboardAccess(access, role);
		setPermitted(ok);
		setReady(true);
		if (!ok) {
			router.replace(redirectTo);
		}
	}, [access, redirectTo, router]);

	if (!ready) {
		return (
			<div className="flex items-center justify-center py-24">
				<Icons.spinner className="h-6 w-6 animate-spin text-orange-500" />
			</div>
		);
	}

	if (!permitted) {
		return null;
	}

	return <>{children}</>;
}
