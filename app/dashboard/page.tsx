'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { DashboardWelcomeHero } from '@/components/dashboard/DashboardWelcomeHero';
import { DashboardOverviewPanel } from '@/components/dashboard/dashboard-overview-panel';
import { authService, organizationService, projectService, tourService, userService } from '@/lib/api';
import {
  canAccessOrganizations,
  canAccessProjects,
  canAccessSdkLab,
  canCreateTours,
  canManageTours,
  getDashboardRole,
} from '@/lib/dashboard-roles';
import { aggregateDashboardHubStats, type DashboardHubStats } from '@/lib/dashboard-hub-stats';
import { buildTourListIndex } from '@/lib/tour-list-index';
import { PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';

type DashboardStats = {
  productionTours: number;
  pendingValidation: number;
  teamMembers: number;
  maxUsers: number;
  tourTotal: number;
  tourSandbox: number;
  tourActive: number;
  orgPlan: string | null;
};

const EMPTY_STATS: DashboardStats = {
  productionTours: 0,
  pendingValidation: 0,
  teamMembers: 0,
  maxUsers: 0,
  tourTotal: 0,
  tourSandbox: 0,
  tourActive: 0,
  orgPlan: null,
};

const EMPTY_HUB_STATS: DashboardHubStats = {
  projectCount: 0,
  sdkPackCount: 0,
  faqTotal: 0,
  blueprintTotal: 0,
};

export default function DashboardPage() {
  const router = useRouter();
  const user = authService.getUser();
  const role = getDashboardRole(user);
  const currentUserId = user?.id;

  const isAdmin = role === 'ADMIN';
  const isTourManager = canManageTours(role);
  const showTourCreate = canCreateTours(role);
  const showOrgStats = canAccessOrganizations(role);
  const showSdkLab = canAccessSdkLab(role);
  const showTourStats = isAdmin || showTourCreate;
  const showHubResources = canAccessProjects(role);

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [hubStats, setHubStats] = useState<DashboardHubStats>(EMPTY_HUB_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      router.replace('/dashboard/platform');
    }
  }, [role, router]);

  useEffect(() => {
    const fetchStats = async () => {
      const next: DashboardStats = { ...EMPTY_STATS };
      let nextHub = { ...EMPTY_HUB_STATS };

      const [usersResult, toursResult, orgsResult, projectsResult] = await Promise.allSettled([
        isAdmin ? userService.getAll(1, 10000) : Promise.resolve(null),
        showTourStats ? tourService.getAll(undefined, { includeSteps: false }) : Promise.resolve(null),
        isAdmin || showOrgStats ? organizationService.getAll() : Promise.resolve(null),
        showHubResources ? projectService.list() : Promise.resolve(null),
      ]);

      const usersRes = usersResult.status === 'fulfilled' ? usersResult.value : null;
      const toursRes = toursResult.status === 'fulfilled' ? toursResult.value : null;
      const orgsRes = orgsResult.status === 'fulfilled' ? orgsResult.value : null;
      const projectsRes = projectsResult.status === 'fulfilled' ? projectsResult.value : null;

      const users = usersRes?.users ?? [];
      const tours = toursRes?.tours ?? [];
      const org = orgsRes?.organizations?.[0];

      if (showTourStats && toursRes) {
        const index = buildTourListIndex(tours, role, currentUserId, isTourManager);
        next.tourTotal = index.stats.total;
        next.tourSandbox = index.stats.sandbox;
        next.tourActive = index.stats.active;
        next.pendingValidation = index.stats.pendingSandbox;
        next.productionTours = tours.filter(
          (t) => t.environment === 'production' && t.isActive,
        ).length;
      }

      if (isAdmin && usersRes) {
        next.teamMembers = users.length;
      }

      if (org) {
        next.maxUsers = org.maxUsers;
        next.orgPlan = org.plan;
      }

      if (projectsRes?.projects) {
        nextHub = aggregateDashboardHubStats(projectsRes.projects);
      }

      setStats(next);
      setHubStats(nextHub);
      setLoading(false);
    };

    void fetchStats();
  }, [
    isAdmin,
    showTourStats,
    showOrgStats,
    showHubResources,
    role,
    currentUserId,
    isTourManager,
  ]);

  if (role === 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="relative space-y-5">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-16 top-4 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute right-[-60px] top-24 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
      </div>

      <DashboardWelcomeHero
        firstName={user?.firstName}
        subtitle="Bienvenue sur votre tableau de bord Guidora Onboarding."
      />

      <DashboardOverviewPanel
        stats={stats}
        hubStats={hubStats}
        loading={loading}
        isAdmin={isAdmin}
        showTourCreate={showTourCreate}
        showOrgStats={showOrgStats}
        showHubResources={showHubResources}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Actions rapides</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {isAdmin ? (
            <div className="phoenix-glass group rounded-2xl p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400/35 hover:shadow-elevated">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary/20">
                  <Icons.users className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Gérer l&apos;équipe</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Invitez développeurs et utilisateurs de votre organisation.
                  </p>
                </div>
              </div>
              <Button className={cn('mt-4', PHOENIX_PRIMARY_BUTTON_CLASS)} asChild>
                <Link href="/dashboard/users?create=1">
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Nouveau membre
                </Link>
              </Button>
            </div>
          ) : null}

          {showHubResources ? (
            <div className="phoenix-glass group rounded-2xl p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-400/35 hover:shadow-elevated">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-500 transition-colors group-hover:bg-sky-500/20">
                  <Icons.grid className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Hub projets</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    FAQ, parcours et blueprints par application SDK.
                  </p>
                </div>
              </div>
              <Button className={cn('mt-4', PHOENIX_PRIMARY_BUTTON_CLASS)} asChild>
                <Link href="/dashboard/projects">
                  <Icons.arrowRight className="mr-2 h-4 w-4" />
                  Ouvrir les projets
                </Link>
              </Button>
            </div>
          ) : null}

          {showTourCreate ? (
            <div className="phoenix-glass group rounded-2xl p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-400/35 hover:shadow-elevated">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-pink-500/10 p-2.5 text-pink-400 transition-colors group-hover:bg-pink-500/20">
                  <Icons.tours className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Créer un parcours</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Concevez des parcours guidés interactifs pour vos utilisateurs.
                  </p>
                </div>
              </div>
              <Button className={cn('mt-4', PHOENIX_PRIMARY_BUTTON_CLASS)} asChild>
                <Link href="/dashboard/tours/create" prefetch={false}>
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Nouveau parcours
                </Link>
              </Button>
            </div>
          ) : null}

          {showSdkLab ? (
            <div className="phoenix-glass group rounded-2xl p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/35 hover:shadow-elevated">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                  <Icons.sdkLab className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">SDK Test Lab</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Testez l&apos;intégration SDK dans des interfaces de démonstration.
                  </p>
                </div>
              </div>
              <Button className={cn('mt-4', PHOENIX_PRIMARY_BUTTON_CLASS)} asChild>
                <Link href="/dashboard/sdk-tests">
                  <Icons.play className="mr-2 h-4 w-4" />
                  Ouvrir le lab
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
