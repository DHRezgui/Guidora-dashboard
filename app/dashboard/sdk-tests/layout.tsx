'use client';

import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';

export default function SdkTestsLayout({ children }: { children: React.ReactNode }) {
	return <RoleRouteGuard access="sdkLab">{children}</RoleRouteGuard>;
}
