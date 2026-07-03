'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

type ProjectHubStatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  iconTone: string;
  href?: string;
  status?: 'ok' | 'warn' | 'muted';
};

export function ProjectHubStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  iconTone,
  href,
  status,
}: ProjectHubStatCardProps) {
  const valueClass =
    status === 'ok'
      ? 'text-emerald-600 dark:text-emerald-300'
      : status === 'warn'
        ? 'text-amber-600 dark:text-amber-300'
        : 'text-slate-900 dark:text-white';

  const content = (
    <div
      className={cn(
        'group relative min-h-[104px] h-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br p-4 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm transition-all duration-300 dark:border-white/10 dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]',
        tone,
        href && 'hover:-translate-y-0.5 hover:border-orange-400/40 hover:shadow-[0_16px_32px_rgba(249,115,22,0.12)]',
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/20 opacity-0 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-orange-500/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className={cn('mt-2 text-2xl font-semibold tabular-nums', valueClass)}>{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p> : null}
        </div>
        <div
          className={cn(
            'rounded-xl border border-slate-200 bg-white/80 p-2.5 shadow-sm transition-colors group-hover:border-orange-300/50 dark:border-white/10 dark:bg-slate-950/65',
            iconTone,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {href ? (
        <p className="relative mt-3 flex items-center gap-1 text-[11px] font-medium text-orange-600/0 transition-all group-hover:text-orange-600 dark:group-hover:text-orange-300">
          <span>Ouvrir</span>
          <Icons.chevronRight className="h-3 w-3" />
        </p>
      ) : null}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40">
      {content}
    </Link>
  );
}
