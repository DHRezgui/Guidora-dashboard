'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { DashboardWelcomeHero } from '@/components/dashboard/DashboardWelcomeHero';
import { authService, userService, organizationService, tourService } from '@/lib/api';
import {
  canAccessOrganizations,
  canAccessSdkLab,
  canCreateTours,
  canManageTours,
  getDashboardRole,
  type DashboardRole,
} from '@/lib/dashboard-roles';
import { buildTourListIndex } from '@/lib/tour-list-index';
import Link from 'next/link';

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

function buildStatCards(
  role: DashboardRole | null,
  stats: DashboardStats,
  loading: boolean,
  opts: { isAdmin: boolean; showTourCreate: boolean; showOrgStats: boolean },
) {
  const quotaSubtitle = (used: number, max: number, unit: string) =>
    max > 0 ? `${used} / ${max} ${unit}` : loading ? '…' : '—';

  if (opts.isAdmin) {
    return [
      {
        title: 'Parcours en production',
        value: stats.productionTours,
        subtitle:
          stats.tourTotal > 0
            ? `${stats.tourTotal} parcours au total`
            : 'Aucun parcours pour le moment',
        icon: Icons.tours,
        tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70',
      },
      {
        title: 'À valider',
        value: stats.pendingValidation,
        subtitle:
          stats.pendingValidation > 0
            ? 'Soumissions développeur en attente'
            : 'Aucune soumission en attente',
        icon: Icons.warning,
        tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70',
      },
      {
        title: 'Équipe',
        value: stats.teamMembers,
        subtitle: quotaSubtitle(stats.teamMembers, stats.maxUsers, 'utilisateurs'),
        icon: Icons.users,
        tone: 'from-slate-100 to-white dark:from-slate-800/90 dark:to-slate-900/70',
      },
    ];
  }

  if (opts.showTourCreate) {
    return [
      {
        title: 'Parcours',
        value: stats.tourTotal,
        subtitle: 'Total dans votre organisation',
        icon: Icons.tours,
        tone: 'from-slate-100 to-white dark:from-slate-800/90 dark:to-slate-900/70',
      },
      {
        title: 'Sandbox',
        value: stats.tourSandbox,
        subtitle: 'En cours de conception / test',
        icon: Icons.sandbox,
        tone: 'from-cyan-100 to-white dark:from-cyan-500/20 dark:to-slate-900/70',
      },
      {
        title: 'Parcours actifs',
        value: stats.tourActive,
        subtitle: 'Publiés ou activés',
        icon: Icons.active,
        tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70',
      },
    ];
  }

  if (opts.showOrgStats) {
    return [
      {
        title: 'Organisation',
        value: stats.orgPlan ?? '—',
        subtitle: 'Votre plan et abonnement',
        icon: Icons.building,
        tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70',
      },
    ];
  }

  return [];
}

export default function DashboardPage() {
  const router = useRouter();
  const user = authService.getUser();
  const role = getDashboardRole(user);
  const currentUserId = user?.id;

  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      router.replace('/dashboard/platform');
    }
  }, [role, router]);

  if (role === 'SUPER_ADMIN') {
    return null;
  }

  const isAdmin = role === 'ADMIN';
  const isTourManager = canManageTours(role);
  const showTourCreate = canCreateTours(role);
  const showOrgStats = canAccessOrganizations(role);
  const showSdkLab = canAccessSdkLab(role);
  const showTourStats = isAdmin || showTourCreate;

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const next: DashboardStats = { ...EMPTY_STATS };

        const [usersRes, toursRes, orgsRes] = await Promise.all([
          isAdmin ? userService.getAll(1, 10000) : Promise.resolve(null),
          showTourStats ? tourService.getAll(undefined, { includeSteps: false }) : Promise.resolve(null),
          isAdmin || showOrgStats ? organizationService.getAll() : Promise.resolve(null),
        ]);

        const users = usersRes?.users ?? [];
        const tours = toursRes?.tours ?? [];
        const org = orgsRes?.organizations?.[0];

        if (showTourStats && tours.length >= 0) {
          const index = buildTourListIndex(tours, role, currentUserId, isTourManager);
          next.tourTotal = index.stats.total;
          next.tourSandbox = index.stats.sandbox;
          next.tourActive = index.stats.active;
          next.pendingValidation = index.stats.pendingSandbox;
          next.productionTours = tours.filter(
            (t) => t.environment === 'production' && t.isActive,
          ).length;
        }

        if (isAdmin) {
          next.teamMembers = users.length;
        }

        if (org) {
          next.maxUsers = org.maxUsers;
          next.orgPlan = org.plan;
        }

        setStats(next);
      } catch {
        setStats(EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin, showTourStats, showOrgStats, role, currentUserId, isTourManager]);

  const statCards = useMemo(
    () =>
      buildStatCards(role, stats, loading, {
        isAdmin,
        showTourCreate,
        showOrgStats,
      }),
    [role, stats, loading, isAdmin, showTourCreate, showOrgStats],
  );

  return (
    <div className="space-y-6">
      <DashboardWelcomeHero
        firstName={user?.firstName}
        subtitle="Bienvenue sur votre tableau de bord Guidora Onboarding."
      />

      {statCards.length > 0 ? (
        <section
          className={`grid gap-3 ${
            statCards.length >= 3 ? 'md:grid-cols-3' : statCards.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'
          }`}
        >
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={`min-h-[96px] rounded-2xl border border-slate-200 bg-gradient-to-br ${card.tone} p-4 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm dark:border-white/10 dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {card.title}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                      {loading ? '…' : card.value}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-orange-500 dark:border-white/10 dark:bg-slate-950/65 dark:text-orange-300">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-500">{card.subtitle}</p>
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Actions rapides</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {isAdmin && (
            <div className="group rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400/35 hover:bg-white hover:shadow-elevated dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900/65">
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
              <Button className="mt-4 rounded-xl" asChild>
                <Link href="/dashboard/users?create=1">
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Nouveau membre
                </Link>
              </Button>
            </div>
          )}

          {isAdmin && stats.pendingValidation > 0 ? (
            <div className="group rounded-2xl border border-orange-300/40 bg-orange-50/50 p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 dark:border-orange-500/30 dark:bg-orange-500/10">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-orange-500/15 p-2.5 text-orange-500">
                  <Icons.warning className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Valider des parcours</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {stats.pendingValidation} soumission{stats.pendingValidation > 1 ? 's' : ''} en attente
                    de votre décision.
                  </p>
                </div>
              </div>
              <Button className="mt-4 rounded-xl" asChild>
                <Link href="/dashboard/tours">
                  <Icons.tours className="mr-2 h-4 w-4" />
                  Ouvrir les parcours
                </Link>
              </Button>
            </div>
          ) : null}

          {showTourCreate ? (
            <div className="group rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-400/35 hover:bg-white hover:shadow-elevated dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900/65">
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
              <Button className="mt-4 rounded-xl" asChild>
                <Link href="/dashboard/tours/create" prefetch={false}>
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Nouveau parcours
                </Link>
              </Button>
            </div>
          ) : null}

          {showSdkLab ? (
            <div className="group rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/35 hover:bg-white hover:shadow-elevated dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900/65">
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
              <Button className="mt-4 rounded-xl" asChild>
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
