'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { authService } from '@/lib/api';
import { getDashboardHomeHref, getDashboardRole } from '@/lib/dashboard-roles';
import { formatFaqProjectTitle } from '@/lib/faq-project';
import { Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';

export default function Header() {
  const user = authService.getUser();
  const role = getDashboardRole(user);
  const homeHref = getDashboardHomeHref(role);
  const homeLabel = role === 'SUPER_ADMIN' ? 'Console plateforme' : 'Tableau de bord';
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();

  const segmentLabels: Record<string, string> = {
    dashboard: 'Tableau de bord',
    users: 'Utilisateurs',
    organizations: 'Organisations',
    tours: 'Parcours',
    create: 'Nouveau',
    settings: 'Parametres',
    'sdk-tests': 'SDK Tests',
    blueprints: 'Blueprints',
    faq: 'FAQ',
    projects: 'Projets',
    platform: 'Console plateforme',
    admins: 'Administrateurs clients',
    analytics: 'Analytics',
    simple: 'Simple',
    medium: 'Medium',
    dynamic: 'Dynamic',
    stress: 'Stress',
  };

  const pathSegments = pathname.split('/').filter(Boolean);
  const dashboardIndex = pathSegments.indexOf('dashboard');
  const breadcrumbSegments = (dashboardIndex >= 0 ? pathSegments.slice(dashboardIndex + 1) : [])
    // Le lien racine couvre déjà la console plateforme — évite « Console plateforme > Console plateforme »
    .filter((segment) => !(role === 'SUPER_ADMIN' && segment === 'platform'));

  const crumbs = breadcrumbSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, dashboardIndex + 2 + index).join('/')}`;
    const isLast = index === breadcrumbSegments.length - 1;
    const parentSegment = index > 0 ? breadcrumbSegments[index - 1] : null;
    const isEditModeCreateRoute =
      segment === 'create' &&
      Boolean(searchParams.get('id')) &&
      (parentSegment === 'tours' ||
        parentSegment === 'users' ||
        parentSegment === 'organizations' ||
        parentSegment === 'blueprints');
    const prettyLabel =
      isEditModeCreateRoute ? 'Modifier' :
      segmentLabels[segment] ||
      (parentSegment === 'faq' || parentSegment === 'projects'
        ? formatFaqProjectTitle(segment)
        : null) ||
      (/^[0-9a-fA-F-]{8,}$/.test(segment) ? 'Detail' : segment.replace(/-/g, ' '));

    return { href, label: prettyLabel, isLast };
  });

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex min-w-0 items-center gap-1.5 text-xs md:text-sm">
          <Link href={homeHref} className="font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            {homeLabel}
          </Link>
          {crumbs.map((crumb) => (
            <div key={crumb.href} className="flex min-w-0 items-center gap-1.5">
              <Icons.chevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              {crumb.isLast ? (
                <span className="truncate font-medium text-orange-300">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="truncate text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Basculer le theme"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 rounded-xl border border-slate-200 bg-white/85 text-slate-700 transition-all hover:scale-105 hover:border-orange-400/40 hover:bg-orange-50 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-200 dark:hover:bg-slate-800/70"
          >
            <Sun className="hidden h-4 w-4 text-orange-300 dark:block" />
            <Moon className="h-4 w-4 text-slate-600 dark:hidden" />
          </Button>
          <Link
            href="/dashboard/settings"
            className="phoenix-glass flex min-w-[124px] items-center gap-3 rounded-xl px-3 py-1.5 transition-all hover:scale-[1.02] hover:border-orange-400/35"
          >
            <div className="h-7 w-7 rounded-lg phoenix-primary flex items-center justify-center text-white font-semibold text-xs">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-[13px] font-semibold leading-tight text-slate-800 dark:text-white">{user?.firstName || user?.email}</p>
              <p className="text-[10px] capitalize text-slate-500 dark:text-slate-400">{user?.role?.toLowerCase()}</p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}