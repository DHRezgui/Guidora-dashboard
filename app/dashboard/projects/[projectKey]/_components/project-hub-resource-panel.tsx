'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { PHOENIX_INSET_PANEL_CLASS, PHOENIX_PANEL_CLASS } from '@/app/dashboard/blueprints/blueprint-shared';
import { cn } from '@/lib/utils';

type ProjectHubResourcePanelProps = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  iconTone: string;
  emptyTitle: string;
  emptyDescription: string;
  actionHref?: string;
  actionLabel?: string;
  /** `create` → icône +, `navigate` → chevron (liste / gestion). */
  actionIntent?: 'create' | 'navigate';
  children: ReactNode;
  isEmpty: boolean;
};

export function ProjectHubResourcePanel({
  title,
  description,
  icon: Icon,
  accent,
  iconTone,
  emptyTitle,
  emptyDescription,
  actionHref,
  actionLabel,
  actionIntent = 'navigate',
  children,
  isEmpty,
}: ProjectHubResourcePanelProps) {
  return (
    <section className={cn(PHOENIX_PANEL_CLASS, 'flex h-full flex-col overflow-hidden rounded-2xl border')}>
      <div className={cn('h-1 w-full shrink-0', accent)} />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              iconTone,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300/70 bg-slate-50/50 px-4 py-8 text-center dark:border-white/15 dark:bg-slate-900/30">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-slate-950/60">
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{emptyTitle}</p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500 dark:text-slate-400">{emptyDescription}</p>
          </div>
        ) : (
          <div className="flex-1 space-y-2">{children}</div>
        )}

        {actionHref && actionLabel ? (
          <div className="border-t border-slate-200/80 pt-4 dark:border-white/10">
            <Button variant="outline" size="sm" className="h-9 w-full rounded-lg border-slate-300/80 dark:border-white/15" asChild>
              <Link href={actionHref}>
                {actionIntent === 'create' ? (
                  <Icons.plus className="mr-2 h-3.5 w-3.5" />
                ) : (
                  <Icons.chevronRight className="mr-2 h-3.5 w-3.5" />
                )}
                {actionLabel}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ProjectHubResourceItem({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}) {
  return (
    <div className={cn(PHOENIX_INSET_PANEL_CLASS, 'px-3 py-2.5 transition-colors hover:border-orange-300/35 dark:hover:border-orange-400/20')}>
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">{title}</p>
        {badge}
      </div>
      {subtitle ? <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
    </div>
  );
}
