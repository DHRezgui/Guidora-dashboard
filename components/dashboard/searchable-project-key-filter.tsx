'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { DEFAULT_FAQ_PROJECT_KEY, formatProjectTitle } from '@/lib/project';
import {
  BLUEPRINT_SELECT_CONTENT_CLASS,
  PHOENIX_FIELD_CLASS,
  PHOENIX_LABEL_CLASS,
} from '@/app/dashboard/blueprints/blueprint-shared';

const LIST_CAP = 80;

function sortProjectKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === DEFAULT_FAQ_PROJECT_KEY) return -1;
    if (b === DEFAULT_FAQ_PROJECT_KEY) return 1;
    return a.localeCompare(b);
  });
}

function matchesProjectQuery(key: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const title = formatProjectTitle(key).toLowerCase();
  return key.toLowerCase().includes(q) || title.includes(q);
}

export interface SearchableProjectKeyFilterProps {
  projectKeys: string[];
  /** Empty string = all projects */
  value: string;
  onValueChange: (projectKey: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SearchableProjectKeyFilter({
  projectKeys,
  value,
  onValueChange,
  className,
  disabled = false,
}: SearchableProjectKeyFilterProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelRect, setPanelRect] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const allKeys = useMemo(() => {
    const merged = new Set(projectKeys.filter(Boolean));
    if (value?.trim()) merged.add(value.trim());
    return sortProjectKeys([...merged]);
  }, [projectKeys, value]);

  const filteredKeys = useMemo(
    () => allKeys.filter((key) => matchesProjectQuery(key, query)),
    [allKeys, query],
  );

  const visibleKeys = useMemo(() => filteredKeys.slice(0, LIST_CAP), [filteredKeys]);
  const truncated = filteredKeys.length > LIST_CAP;

  const selectedLabel = value.trim()
    ? formatProjectTitle(value.trim())
    : 'Tous les projets';

  useLayoutEffect(() => {
    if (!open) {
      setPanelRect(null);
      return undefined;
    }
    const updateRect = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setPanelRect({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 280),
      });
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);

    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [open]);

  const pick = (key: string) => {
    onValueChange(key);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className={cn('relative space-y-1.5', className)}>
      <Label className={PHOENIX_LABEL_CLASS} htmlFor={`${listboxId}-trigger`}>
        Projet
      </Label>
      <button
        ref={triggerRef}
        id={`${listboxId}-trigger`}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          PHOENIX_FIELD_CLASS,
          'flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-sm font-medium',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-orange-400/70 ring-2 ring-orange-400/25',
        )}
      >
        <span className="min-w-0 truncate text-slate-800 dark:text-slate-100">{selectedLabel}</span>
        <Icons.chevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-orange-600/80 transition-transform dark:text-orange-300/90',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {value.trim() && value.trim() !== DEFAULT_FAQ_PROJECT_KEY ? (
        <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{value.trim()}</p>
      ) : null}

      {open && panelRect && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              role="presentation"
              style={{
                position: 'fixed',
                top: panelRect.top,
                left: panelRect.left,
                width: panelRect.width,
                zIndex: 200,
              }}
              className={cn(BLUEPRINT_SELECT_CONTENT_CLASS, 'flex max-h-[min(24rem,calc(100vh-6rem))] flex-col overflow-hidden p-2.5')}
            >
              <div className="relative">
                <Icons.search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filtrer par identifiant ou nom…"
                  className={cn(
                    'h-9 border-slate-200 bg-white pl-8 text-sm text-slate-800 dark:border-white/15 dark:bg-slate-950 dark:text-slate-100',
                    query ? 'pr-8' : undefined,
                  )}
                  aria-controls={listboxId}
                  autoComplete="off"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                    aria-label="Effacer la recherche"
                  >
                    <Icons.close className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <p className="mt-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
                {query.trim()
                  ? `${filteredKeys.length} résultat${filteredKeys.length !== 1 ? 's' : ''}`
                  : `${allKeys.length} projet${allKeys.length !== 1 ? 's' : ''} — recherchez pour affiner`}
              </p>

              <div className="mt-2 max-h-[min(16rem,40vh)] overflow-y-auto overscroll-contain rounded-lg border border-slate-200/70 pr-1 dark:border-white/10">
                <ul id={listboxId} role="listbox" className="space-y-0.5 p-0.5">
                  <li role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={!value.trim()}
                      onClick={() => pick('')}
                      className={cn(
                        'flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        !value.trim()
                          ? 'bg-orange-500/20 font-medium text-slate-900 dark:bg-orange-500/25 dark:text-white'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10',
                      )}
                    >
                      <span className="min-w-0 truncate">Tous les projets</span>
                      {!value.trim() ? <Icons.check className="h-4 w-4 shrink-0 text-orange-500" /> : null}
                    </button>
                  </li>
                  {visibleKeys.map((key) => {
                    const selected = value.trim() === key;
                    const title = formatProjectTitle(key);
                    return (
                      <li key={key} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => pick(key)}
                          className={cn(
                            'flex w-full min-w-0 flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                            selected
                              ? 'bg-orange-500/20 font-medium text-slate-900 dark:bg-orange-500/25 dark:text-white'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10',
                          )}
                        >
                          <span className="flex min-w-0 items-center justify-between gap-2">
                            <span className="min-w-0 truncate">{title}</span>
                            {selected ? (
                              <Icons.check className="h-4 w-4 shrink-0 text-orange-500" />
                            ) : null}
                          </span>
                          {key !== title ? (
                            <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {key}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {truncated ? (
                <p className="mt-2 border-t border-slate-200/80 px-1 pt-2 text-[11px] text-slate-500 dark:border-white/10 dark:text-slate-400">
                  {filteredKeys.length - LIST_CAP} projet(s) supplémentaire(s) — affinez la recherche.
                </p>
              ) : null}

              {!truncated && filteredKeys.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-slate-500 dark:text-slate-400">
                  Aucun projet ne correspond.
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
