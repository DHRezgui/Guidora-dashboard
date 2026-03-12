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
    { name: 'Analytics', href: '/dashboard/analytics', icon: Icons.analytics, roles: ['ADMIN', 'DEVELOPER'] },
  ].filter((item) => !role || item.roles.includes(role));

  return (
    <aside className="w-65 flex flex-col bg-card border-r border-border/60">
      {/* Logo & Branding */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
            <Icons.logo className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-[15px] tracking-tight">TrustDev</h2>
            <p className="text-[11px] text-muted-foreground font-medium">{orgName || 'Onboarding Platform'}</p>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="px-5">
        <div className="h-px bg-border/60" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Menu</p>
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
                    ? 'gradient-primary text-white shadow-soft'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className={cn('h-4.5 w-4.5 transition-colors', active ? 'text-white' : 'text-muted-foreground group-hover:text-accent-foreground')} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User profile */}
      <div className="px-3 pb-4">
        <div className="rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center text-white font-semibold text-sm shadow-soft">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.firstName || user?.email}</p>
              <p className="text-[11px] text-muted-foreground truncate capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <button
              onClick={() => authService.logout()}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
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