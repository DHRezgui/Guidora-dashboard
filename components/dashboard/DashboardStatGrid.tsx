'use client';

import type { LucideIcon } from 'lucide-react';

export type DashboardStatItem = {
  title: string;
  value: number | string;
  icon: LucideIcon;
  tone: string;
};

type DashboardStatGridProps = {
  stats: DashboardStatItem[];
};

export default function DashboardStatGrid({ stats }: DashboardStatGridProps) {
  const columnClass =
    stats.length === 2 ? 'md:grid-cols-2' : stats.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';

  return (
    <div className={`grid gap-3 ${columnClass}`}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${stat.tone} p-4 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm min-h-[96px] dark:border-white/10 dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {stat.title}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-orange-500 dark:border-white/10 dark:bg-slate-950/65 dark:text-orange-300">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
