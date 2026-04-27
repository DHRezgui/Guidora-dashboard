'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/ui/icons';
import { authService, organizationService } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const user = authService.getUser();
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (user?.organizationId) {
      organizationService.getById(user.organizationId)
        .then((res) => setOrgName(res.organization?.name || null))
        .catch(() => setOrgName(null));
    }
  }, [user?.organizationId]);

  const isActive = (path: string) =>
    path === '/dashboard' ? pathname === path : pathname.startsWith(path);

  const role = user?.role as string | undefined;

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard', icon: Icons.dashboard, roles: ['ADMIN', 'DEVELOPER', 'USER'] },
    { name: 'Utilisateurs', href: '/dashboard/users', icon: Icons.users, roles: ['ADMIN'] },
    { name: 'Organisations', href: '/dashboard/organizations', icon: Icons.building, roles: ['ADMIN', 'DEVELOPER'] },
    { name: 'Parcours', href: '/dashboard/tours', icon: Icons.tours, roles: ['ADMIN', 'DEVELOPER', 'USER'] },
    { name: 'SDK Tests', href: '/dashboard/sdk-tests', icon: Icons.analytics, roles: ['ADMIN', 'DEVELOPER'] },
    { name: 'Analytics', href: '/dashboard/analytics', icon: Icons.analytics, roles: ['ADMIN', 'DEVELOPER'] },
  ].filter((item) => !role || item.roles.includes(role));

  return (
    <aside className="w-64 flex flex-col border-r border-white/10 bg-slate-950/55 backdrop-blur-xl">
      {/* Logo & Branding */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-xl bg-black shadow-soft">
            <Icons.logo className="h-full w-full object-cover" />
          </div>
          <div>
            <h2 className="font-bold text-[15px] tracking-tight text-white">TrustDev</h2>
            <p className="text-[11px] font-medium text-orange-300/90">{orgName || 'Onboarding Platform'}</p>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="px-5">
        <div className="h-px bg-white/10" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Menu</p>
        <div className="space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                  active
                    ? 'phoenix-active text-orange-300'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                )}
              >
                <Icon className={cn('h-4.5 w-4.5 transition-colors', active ? 'text-orange-300' : 'text-slate-500 group-hover:text-slate-200')} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User profile */}
      <div className="px-3 pb-4">
        <div className="phoenix-glass rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="phoenix-primary h-9 w-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-soft">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.firstName || user?.email}</p>
              <p className="truncate text-[11px] capitalize text-slate-400">{user?.role?.toLowerCase()}</p>
            </div>
            <button
              onClick={() => authService.logout()}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-orange-300"
              title="Déconnexion"
            >
              <Icons.logout className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}