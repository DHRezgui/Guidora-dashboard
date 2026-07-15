'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { PHOENIX_INSET_PANEL_CLASS, PHOENIX_LABEL_CLASS } from '@/app/dashboard/blueprints/blueprint-shared';
import { Icons } from '@/components/ui/icons';
import type { DashboardHubStats } from '@/lib/dashboard-hub-stats';
import { PHOENIX_ALERT_TIMER_BADGE_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';

type DashboardOverviewStats = {
  productionTours: number;
  pendingValidation: number;
  teamMembers: number;
  maxUsers: number;
  tourTotal: number;
  tourSandbox: number;
  tourActive: number;
  orgPlan: string | null;
};

type MetricAccent = 'emerald' | 'orange' | 'sky' | 'slate' | 'cyan' | 'purple' | 'violet';

type OverviewMetric = {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  accent: MetricAccent;
  highlight?: boolean;
};

const accentStyles: Record<
  MetricAccent,
  { tile: string; iconWrap: string; icon: string; hoverBorder: string; hoverShadow: string }
> = {
  emerald: {
    tile: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70',
    iconWrap: 'border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-400/25 dark:bg-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-300',
    hoverBorder: 'hover:border-emerald-400/35',
    hoverShadow: 'hover:shadow-[0_12px_28px_rgba(16,185,129,0.12)]',
  },
  orange: {
    tile: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70',
    iconWrap: 'border-orange-200/80 bg-orange-50/90 dark:border-orange-400/25 dark:bg-orange-500/10',
    icon: 'text-orange-600 dark:text-orange-300',
    hoverBorder: 'hover:border-orange-400/35',
    hoverShadow: 'hover:shadow-[0_12px_28px_rgba(249,115,22,0.12)]',
  },
  sky: {
    tile: 'from-sky-100 to-white dark:from-sky-500/20 dark:to-slate-900/70',
    iconWrap: 'border-sky-200/80 bg-sky-50/90 dark:border-sky-400/25 dark:bg-sky-500/10',
    icon: 'text-sky-600 dark:text-sky-300',
    hoverBorder: 'hover:border-sky-400/35',
    hoverShadow: 'hover:shadow-[0_12px_28px_rgba(14,165,233,0.12)]',
  },
  slate: {
    tile: 'from-slate-100 to-white dark:from-slate-800/90 dark:to-slate-900/70',
    iconWrap: 'border-slate-200/80 bg-slate-50/90 dark:border-white/10 dark:bg-slate-950/65',
    icon: 'text-slate-600 dark:text-slate-300',
    hoverBorder: 'hover:border-slate-400/35',
    hoverShadow: 'hover:shadow-[0_12px_28px_rgba(100,116,139,0.12)]',
  },
  cyan: {
    tile: 'from-cyan-100 to-white dark:from-cyan-500/20 dark:to-slate-900/70',
    iconWrap: 'border-cyan-200/80 bg-cyan-50/90 dark:border-cyan-400/25 dark:bg-cyan-500/10',
    icon: 'text-cyan-600 dark:text-cyan-300',
    hoverBorder: 'hover:border-cyan-400/35',
    hoverShadow: 'hover:shadow-[0_12px_28px_rgba(6,182,212,0.12)]',
  },
  purple: {
    tile: 'from-purple-100 to-white dark:from-purple-600/20 dark:to-slate-900/70',
    iconWrap: 'border-purple-200/80 bg-purple-50/90 dark:border-purple-400/25 dark:bg-purple-500/10',
    icon: 'text-purple-600 dark:text-purple-300',
    hoverBorder: 'hover:border-purple-400/35',
    hoverShadow: 'hover:shadow-[0_12px_28px_rgba(147,51,234,0.12)]',
  },
  violet: {
    tile: 'from-violet-100 to-white dark:from-violet-500/20 dark:to-slate-900/70',
    iconWrap: 'border-violet-200/80 bg-violet-50/90 dark:border-violet-400/25 dark:bg-violet-500/10',
    icon: 'text-violet-600 dark:text-violet-300',
    hoverBorder: 'hover:border-violet-400/35',
    hoverShadow: 'hover:shadow-[0_12px_28px_rgba(139,92,246,0.12)]',
  },
};

function buildActivityMetrics(
  stats: DashboardOverviewStats,
  loading: boolean,
  opts: { isAdmin: boolean; showTourCreate: boolean; showOrgStats: boolean },
): OverviewMetric[] {
  const dash = loading ? '…' : undefined;

  if (opts.isAdmin) {
    return [
      {
        id: 'production',
        label: 'Production',
        value: dash ?? stats.productionTours,
        hint: stats.tourTotal > 0 ? `${stats.tourTotal} parcours au total` : 'Aucun parcours',
        href: '/dashboard/tours',
        icon: Icons.tours,
        accent: 'emerald',
      },
      {
        id: 'pending',
        label: 'À valider',
        value: dash ?? stats.pendingValidation,
        hint: stats.pendingValidation > 0 ? 'Sandbox en attente' : 'Rien en attente',
        href: '/dashboard/tours',
        icon: Icons.warning,
        accent: 'orange',
        highlight: stats.pendingValidation > 0,
      },
      {
        id: 'team',
        label: 'Équipe',
        value: dash ?? stats.teamMembers,
        hint: stats.maxUsers > 0 ? `${stats.teamMembers} / ${stats.maxUsers} utilisateurs` : 'Membres',
        href: '/dashboard/users',
        icon: Icons.users,
        accent: 'sky',
      },
    ];
  }

  if (opts.showTourCreate) {
    return [
      {
        id: 'tours',
        label: 'Parcours',
        value: dash ?? stats.tourTotal,
        hint: 'Dans votre organisation',
        href: '/dashboard/tours',
        icon: Icons.tours,
        accent: 'slate',
      },
      {
        id: 'sandbox',
        label: 'Sandbox',
        value: dash ?? stats.tourSandbox,
        hint: 'En conception / test',
        href: '/dashboard/tours',
        icon: Icons.sandbox,
        accent: 'cyan',
      },
      {
        id: 'active',
        label: 'Actifs',
        value: dash ?? stats.tourActive,
        hint: 'Publiés ou activés',
        href: '/dashboard/tours',
        icon: Icons.active,
        accent: 'emerald',
      },
    ];
  }

  if (opts.showOrgStats) {
    return [
      {
        id: 'plan',
        label: 'Organisation',
        value: dash ?? stats.orgPlan ?? '—',
        hint: 'Plan et abonnement',
        href: '/dashboard/organizations',
        icon: Icons.building,
        accent: 'orange',
      },
    ];
  }

  return [];
}

function buildResourceMetrics(hubStats: DashboardHubStats, loading: boolean): OverviewMetric[] {
  const dash = loading ? '…' : undefined;

  return [
    {
      id: 'projects',
      label: 'Projets SDK',
      value: dash ?? hubStats.projectCount,
      hint: `${hubStats.sdkPackCount} paquet${hubStats.sdkPackCount !== 1 ? 's' : ''} + corpus`,
      href: '/dashboard/projects',
      icon: Icons.grid,
      accent: 'sky',
    },
    {
      id: 'faq',
      label: 'Questions FAQ',
      value: dash ?? hubStats.faqTotal,
      hint: 'Tous les corpus',
      href: '/dashboard/faq',
      icon: Icons.faq,
      accent: 'purple',
    },
    {
      id: 'blueprints',
      label: 'Blueprints',
      value: dash ?? hubStats.blueprintTotal,
      hint: 'Modèles organisation',
      href: '/dashboard/blueprints',
      icon: Icons.blueprints,
      accent: 'violet',
    },
  ];
}

function metricGridClass(count: number) {
  if (count >= 3) return 'sm:grid-cols-3';
  if (count === 2) return 'sm:grid-cols-2';
  return 'grid-cols-1';
}

function OverviewMetricTile({ metric }: { metric: OverviewMetric }) {
  const Icon = metric.icon;
  const accent = accentStyles[metric.accent];

  const tile = (
    <div
      className={cn(
        'group relative flex min-h-[84px] flex-col justify-between overflow-hidden rounded-xl border bg-gradient-to-br p-3.5 shadow-[0_8px_20px_rgba(2,6,23,0.08)] backdrop-blur-sm transition-all duration-200 dark:shadow-[0_8px_24px_rgba(2,6,23,0.28)]',
        metric.highlight
          ? 'border-orange-400/45 ring-1 ring-orange-400/20 dark:border-orange-400/35'
          : cn('border-slate-200/80 dark:border-white/10', accent.hoverBorder),
        accent.tile,
        metric.href && cn('hover:-translate-y-0.5', accent.hoverShadow),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn(PHOENIX_LABEL_CLASS, 'text-[10px]')}>{metric.label}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums leading-none text-slate-900 dark:text-white">
            {metric.value}
          </p>
        </div>
        <div
          className={cn(
            'rounded-xl border p-2 transition-colors group-hover:opacity-95',
            accent.iconWrap,
          )}
        >
          <Icon className={cn('h-4 w-4', accent.icon)} />
        </div>
      </div>
      {metric.hint ? (
        <p className="mt-2 truncate text-[11px] text-slate-600 dark:text-slate-400">{metric.hint}</p>
      ) : null}
    </div>
  );

  if (metric.href) {
    return (
      <Link
        href={metric.href}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
      >
        {tile}
      </Link>
    );
  }

  return tile;
}

function MetricGroup({
  title,
  action,
  metrics,
}: {
  title: string;
  action?: ReactNode;
  metrics: OverviewMetric[];
}) {
  if (metrics.length === 0) return null;

  return (
    <div className={cn(PHOENIX_INSET_PANEL_CLASS, 'p-3.5')}>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className={PHOENIX_LABEL_CLASS}>{title}</p>
        {action}
      </div>
      <div className={cn('grid grid-cols-1 gap-2.5', metricGridClass(metrics.length))}>
        {metrics.map((metric) => (
          <OverviewMetricTile key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}

type DashboardOverviewPanelProps = {
  stats: DashboardOverviewStats;
  hubStats: DashboardHubStats;
  loading: boolean;
  isAdmin: boolean;
  showTourCreate: boolean;
  showOrgStats: boolean;
  showHubResources: boolean;
};

export function DashboardOverviewPanel({
  stats,
  hubStats,
  loading,
  isAdmin,
  showTourCreate,
  showOrgStats,
  showHubResources,
}: DashboardOverviewPanelProps) {
  const activityMetrics = buildActivityMetrics(stats, loading, {
    isAdmin,
    showTourCreate,
    showOrgStats,
  });
  const resourceMetrics = showHubResources ? buildResourceMetrics(hubStats, loading) : [];

  if (activityMetrics.length === 0 && resourceMetrics.length === 0) {
    return null;
  }

  const pendingBadge =
    isAdmin && stats.pendingValidation > 0 ? (
      <Link
        href="/dashboard/tours"
        className={cn(PHOENIX_ALERT_TIMER_BADGE_CLASS, 'transition-opacity hover:opacity-90')}
      >
        {stats.pendingValidation} sandbox à valider
      </Link>
    ) : null;

  return (
    <div
      className={cn(
        'grid gap-3',
        activityMetrics.length > 0 && resourceMetrics.length > 0 ? 'lg:grid-cols-2' : 'grid-cols-1',
      )}
    >
      <MetricGroup title="Activité" action={pendingBadge} metrics={activityMetrics} />
      <MetricGroup title="Ressources SDK" metrics={resourceMetrics} />
    </div>
  );
}
