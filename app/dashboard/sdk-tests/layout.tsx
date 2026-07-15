'use client';

import '@sdk/styles/index.css';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';

export default function SdkTestsLayout({ children }: { children: React.ReactNode }) {
	return <RoleRouteGuard access="sdkLab">{children}</RoleRouteGuard>;
}
