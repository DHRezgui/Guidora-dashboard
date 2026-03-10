'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/ui/icons';
import { authService } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const user = authService.getUser();

  const isActive = (path: string) =>
    path === '/dashboard' ? pathname === path : pathname.startsWith(path);

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard', icon: Icons.dashboard },
    { name: 'Utilisateurs', href: '/dashboard/users', icon: Icons.users },
    { name: 'Parcours', href: '/dashboard/tours', icon: Icons.tours },
    { name: 'Analytics', href: '/dashboard/analytics', icon: Icons.analytics },
  ];

  return (
    <div className="w-64 bg-background border-r">
      <div className="flex h-full flex-col">
        {/* Logo & Org */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Icons.logo className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">TrustDev Admin</h2>
              <p className="text-xs text-muted-foreground">{user?.organizationId || 'Multi-tenant'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 py-2">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User profile */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName || user?.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
            </div>
            <button
              onClick={() => authService.logout()}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icons.logout className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}