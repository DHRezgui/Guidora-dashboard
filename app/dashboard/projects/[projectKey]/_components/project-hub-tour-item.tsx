'use client';

import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { PHOENIX_INSET_PANEL_CLASS } from '@/app/dashboard/blueprints/blueprint-shared';
import { authService } from '@/lib/api';
import { getDashboardRole } from '@/lib/dashboard-roles';
import type { ProjectOverview } from '@/lib/api';
import {
  canOpenProjectHubTourEditor,
  getProjectHubTourEditorBlockReason,
} from '@/lib/tour-sandbox';
import { cn } from '@/lib/utils';
import { ProjectHubTourStatusBadges } from './project-hub-tour-status';

type HubTour = ProjectOverview['recentTours'][number];

function formatTourCreatedAt(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function MetaDot() {
  return <span className="shrink-0 text-slate-300 dark:text-slate-600" aria-hidden>·</span>;
}

function HubTourItemContent({ tour, canOpen }: { tour: HubTour; canOpen: boolean }) {
  const createdLabel = formatTourCreatedAt(tour.createdAt);
  const displayName = tour.name?.trim() || 'Sans nom';
  const stepLabel =
    typeof tour.stepCount === 'number'
      ? `${tour.stepCount} étape${tour.stepCount !== 1 ? 's' : ''}`
      : null;

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <p
          className={cn(
            'min-w-0 flex-1 truncate text-sm font-medium',
            canOpen
              ? 'text-slate-800 group-hover:text-sky-900 dark:text-slate-100 dark:group-hover:text-sky-100'
              : 'text-slate-600 dark:text-slate-300',
          )}
          title={displayName}
        >
          {displayName}
        </p>
        {canOpen ? (
          <Icons.chevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-500" />
        ) : (
          <Icons.admin className="h-3.5 w-3.5 shrink-0 text-amber-500/80 dark:text-amber-400/80" />
        )}
      </div>

      <ProjectHubTourStatusBadges tour={tour} compact className="mt-1" />

      <div className="mt-1 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[10px] leading-none text-slate-500 dark:text-slate-400">
        <span
          className={cn(
            'shrink-0 rounded px-1 py-0.5 font-mono font-medium',
            'bg-slate-200/80 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300',
          )}
          title={tour.id}
        >
          {tour.id.slice(0, 8)}
        </span>

        {createdLabel ? (
          <>
            <MetaDot />
            <span className="shrink-0 tabular-nums">{createdLabel}</span>
          </>
        ) : null}

        {tour.targetUrl ? (
          <>
            <MetaDot />
            <span className="inline-flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
              <Icons.globe className="h-2.5 w-2.5 shrink-0 opacity-60" />
              <span className="truncate font-mono">{tour.targetUrl}</span>
            </span>
          </>
        ) : null}

        {stepLabel ? (
          <>
            <MetaDot />
            <span className="inline-flex shrink-0 items-center gap-0.5">
              <Icons.list className="h-2.5 w-2.5 opacity-60" />
              {stepLabel}
            </span>
          </>
        ) : null}
      </div>
    </>
  );
}

export function ProjectHubTourItem({ tour }: { tour: HubTour }) {
  const user = authService.getUser();
  const role = getDashboardRole(user);
  const userId = user?.id;
  const canOpen = canOpenProjectHubTourEditor(tour, role, userId);
  const blockReason = getProjectHubTourEditorBlockReason(tour, role, userId);
  const editorHref = `/dashboard/tours/create?id=${encodeURIComponent(tour.id)}`;

  const shellClass = cn(
    PHOENIX_INSET_PANEL_CLASS,
    'block px-2.5 py-2',
    canOpen
      ? 'group transition-colors hover:border-sky-300/45 hover:bg-sky-50/40 dark:hover:border-sky-400/25 dark:hover:bg-sky-500/5'
      : 'cursor-not-allowed opacity-80',
  );

  if (canOpen) {
    return (
      <Link href={editorHref} className={shellClass}>
        <HubTourItemContent tour={tour} canOpen />
      </Link>
    );
  }

  return (
    <div className={shellClass} title={blockReason ?? undefined} aria-disabled="true">
      <HubTourItemContent tour={tour} canOpen={false} />
      {blockReason ? (
        <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
          {blockReason}
        </p>
      ) : null}
    </div>
  );
}
