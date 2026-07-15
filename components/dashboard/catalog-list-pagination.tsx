'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';

type CatalogListPaginationProps = {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  itemLabel: string;
  itemLabelPlural?: string;
};

export function CatalogListPagination({
  totalItems,
  pageSize,
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  itemLabel,
  itemLabelPlural,
}: CatalogListPaginationProps) {
  if (totalItems <= pageSize) {
    return null;
  }

  const plural = itemLabelPlural ?? `${itemLabel}s`;
  const countLabel = totalItems === 1 ? itemLabel : plural;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-slate-900/40">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {totalItems} {countLabel} au total — {pageSize} par page
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={onPrevious}
          className="gap-1 rounded-lg"
        >
          <Icons.chevronLeft className="h-4 w-4" />
          Précédent
        </Button>
        <span className="min-w-[7rem] text-center text-sm font-medium text-slate-800 dark:text-slate-200">
          Page {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={onNext}
          className="gap-1 rounded-lg"
        >
          Suivant
          <Icons.chevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
