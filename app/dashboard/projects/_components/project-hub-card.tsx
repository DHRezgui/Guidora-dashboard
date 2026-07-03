'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import {
  blueprintProjectHref,
  DEFAULT_FAQ_PROJECT_KEY,
  faqProjectHref,
  faqProjectToursHref,
  formatProjectSubtitle,
  formatProjectTitle,
  projectHubHref,
} from '@/lib/project';
import { cn } from '@/lib/utils';
import { PHOENIX_INSET_PANEL_CLASS } from '@/app/dashboard/blueprints/blueprint-shared';

const PHOENIX_CARD_BTN_BASE =
  'h-9 gap-1.5 rounded-lg border text-sm font-medium shadow-sm backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-orange-400/25 dark:bg-slate-900/45';

type ProjectHubCardProps = {
  projectKey: string;
  faqCount: number;
  tourCount: number;
  blueprintCount: number;
  canDeleteScope?: boolean;
  onDeleteScope?: () => void;
};

export function ProjectHubCard({
  projectKey,
  faqCount,
  tourCount,
  blueprintCount,
  canDeleteScope = false,
  onDeleteScope,
}: ProjectHubCardProps) {
  const isDefault = projectKey === DEFAULT_FAQ_PROJECT_KEY;
  const totalAssets = faqCount + tourCount + blueprintCount;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5',
        isDefault
          ? 'border-cyan-300/45 bg-[linear-gradient(155deg,rgba(6,182,212,0.08),rgba(255,255,255,0.95)_50%,rgba(248,250,252,0.92))] shadow-[0_12px_28px_rgba(2,6,23,0.1)] hover:border-cyan-400/50 hover:shadow-[0_20px_45px_rgba(6,182,212,0.12)] dark:border-cyan-400/20 dark:bg-[linear-gradient(155deg,rgba(6,182,212,0.07),rgba(15,23,42,0.92)_45%,rgba(2,6,23,0.95))] dark:hover:shadow-[0_20px_45px_rgba(6,182,212,0.1)]'
          : 'border-orange-300/45 bg-[linear-gradient(155deg,rgba(249,115,22,0.08),rgba(255,255,255,0.95)_50%,rgba(248,250,252,0.92))] shadow-[0_12px_28px_rgba(2,6,23,0.1)] hover:border-orange-400/50 hover:shadow-[0_20px_45px_rgba(249,115,22,0.12)] dark:border-orange-400/20 dark:bg-[linear-gradient(155deg,rgba(249,115,22,0.07),rgba(15,23,42,0.92)_45%,rgba(2,6,23,0.95))] dark:hover:shadow-[0_20px_45px_rgba(249,115,22,0.1)]',
      )}
    >
      <div
        className={cn(
          'h-1 w-full',
          isDefault
            ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500'
            : 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600',
        )}
      />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-500/10 opacity-60 blur-3xl transition-opacity group-hover:opacity-100" />

      <div className="relative flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br',
                isDefault
                  ? 'border-cyan-400/30 from-cyan-500/25 to-sky-600/15'
                  : 'border-orange-400/30 from-orange-500/25 to-pink-600/15',
              )}
            >
              <Icons.grid
                className={cn(
                  'h-5 w-5',
                  isDefault ? 'text-cyan-600 dark:text-cyan-300' : 'text-orange-600 dark:text-orange-300',
                )}
              />
            </div>
            <div className="min-w-0 space-y-1">
              <h3
                className="line-clamp-1 text-base font-bold tracking-tight text-slate-900 dark:text-white"
                title={formatProjectTitle(projectKey)}
              >
                {formatProjectTitle(projectKey)}
              </h3>
              {!isDefault ? (
                <p
                  className="truncate font-mono text-[11px] text-orange-700/90 dark:text-orange-200/80"
                  title={projectKey}
                >
                  {projectKey}
                </p>
              ) : (
                <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-700/80 dark:text-cyan-200/70">
                  Corpus transversal
                </p>
              )}
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums',
              isDefault
                ? 'border-cyan-300/60 bg-cyan-50 text-cyan-800 dark:border-cyan-400/35 dark:bg-cyan-500/10 dark:text-cyan-200'
                : 'border-orange-300/60 bg-orange-50 text-orange-800 dark:border-orange-400/35 dark:bg-orange-500/10 dark:text-orange-200',
            )}
          >
            {totalAssets}
          </span>
        </div>

        <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {formatProjectSubtitle(projectKey)}
        </p>

        <div className={cn(PHOENIX_INSET_PANEL_CLASS, 'flex flex-col gap-2')}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'FAQ', value: faqCount, icon: Icons.faq, href: faqProjectHref(projectKey) },
              { label: 'Parcours', value: tourCount, icon: Icons.tours, href: faqProjectToursHref(projectKey) },
              {
                label: 'Blueprints',
                value: blueprintCount,
                icon: Icons.blueprints,
                href: blueprintProjectHref(projectKey),
              },
            ].map((metric) => {
              const MetricIcon = metric.icon;
              return (
                <Link
                  key={metric.label}
                  href={metric.href}
                  className="group/metric rounded-lg border border-transparent px-2 py-2 text-center transition-colors hover:border-orange-300/40 hover:bg-white/60 dark:hover:border-orange-400/25 dark:hover:bg-slate-900/40"
                  title={`Voir les ${metric.label.toLowerCase()}`}
                >
                  <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-orange-600 shadow-sm transition-colors group-hover/metric:bg-orange-500 group-hover/metric:text-white dark:bg-slate-900/60 dark:text-orange-300">
                    <MetricIcon className="h-3 w-3" />
                  </div>
                  <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white">{metric.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </p>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2 dark:border-white/10">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ressources liées
            </span>
            <span
              className={cn(
                'rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                isDefault
                  ? 'border-cyan-300/50 bg-cyan-50 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-200'
                  : 'border-orange-300/50 bg-orange-50 text-orange-800 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-200',
              )}
            >
              {isDefault ? 'Générique' : 'SDK'}
            </span>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
          <Button
            variant="outline"
            className={cn(
              PHOENIX_CARD_BTN_BASE,
              'min-w-0 flex-1 border-slate-300 bg-white/90 text-slate-700 hover:border-orange-400/50 hover:bg-white hover:text-orange-700 dark:border-white/15 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-orange-200',
            )}
            asChild
          >
            <Link href={projectHubHref(projectKey)}>
              <Icons.chevronRight className="mr-1 h-3.5 w-3.5 shrink-0" />
              Ouvrir le hub
            </Link>
          </Button>
          {canDeleteScope && !isDefault && onDeleteScope ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                PHOENIX_CARD_BTN_BASE,
                'h-9 w-9 shrink-0 border-rose-300/55 bg-white/90 text-rose-700 hover:border-rose-400/65 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-400/35 dark:text-rose-200 dark:hover:bg-rose-500/12',
              )}
              onClick={onDeleteScope}
              title={`Supprimer le scope projet ${projectKey}`}
              aria-label={`Supprimer le scope projet ${projectKey}`}
            >
              <Icons.trash className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
