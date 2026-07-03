'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import type { FaqEntryRow } from '@/lib/api';
import { faqProjectHref, formatFaqProjectTitle } from '@/lib/faq-project';
import { PHOENIX_MODAL_CANCEL_BUTTON_CLASS, PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';

type FaqProjectQuestionsModalProps = {
  projectKey: string;
  items: FaqEntryRow[];
  canManage: boolean;
  onClose: () => void;
};

export function FaqProjectQuestionsModal({
  projectKey,
  items,
  canManage,
  onClose,
}: FaqProjectQuestionsModalProps) {
  const title = formatFaqProjectTitle(projectKey);

  return (
    <div className="fixed inset-0 z-[121] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6 md:p-12">
      <div className="mx-auto flex h-full max-h-[800px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl dark:border-white/10 dark:bg-slate-950/90">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/15">
              <Icons.faq className="h-5 w-5 text-orange-600 dark:text-orange-300" />
            </div>
            <div className="min-w-0">
              <h2 className="line-clamp-1 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
              <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">{projectKey}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {items.length} question{items.length !== 1 ? 's' : ''} dans ce projet
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
            onClick={onClose}
            aria-label="Fermer"
          >
            <Icons.close className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-6 dark:bg-slate-950/35">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <Icons.layers className="mb-3 h-12 w-12 opacity-20" />
              <p>Ce projet ne contient aucune question.</p>
              {canManage ? (
                <Button variant="outline" className="mt-4" asChild onClick={onClose}>
                  <Link href={faqProjectHref(projectKey)}>Ajouter une question</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="relative mx-auto max-w-2xl">
              <div className="absolute bottom-0 left-[27px] top-0 hidden w-px bg-slate-300 sm:block dark:bg-white/20" />
              <div className="space-y-6">
                {items.map((item, idx) => (
                  <div key={item.id} className="relative flex flex-col gap-4 sm:flex-row sm:gap-6">
                    <div className="relative z-10 hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-sm font-bold text-slate-700 shadow-sm sm:flex dark:border-white/20 dark:bg-slate-900 dark:text-slate-200">
                      {idx + 1}
                    </div>
                    <div className="z-10 mb-[-10px] flex items-center gap-2 sm:hidden">
                      <Badge className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 p-0 text-white">
                        {idx + 1}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        Question {idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] transition-all hover:border-orange-400/30 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <h3 className="min-w-0 flex-1 text-base font-semibold text-slate-900 dark:text-white">
                          {item.question}
                        </h3>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold uppercase tracking-wide',
                              item.isActive
                                ? 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-200'
                                : 'border-slate-300/60 bg-slate-50 text-slate-600 dark:border-white/15 dark:bg-slate-800/50 dark:text-slate-300',
                            )}
                          >
                            {item.isActive ? 'Publiée' : 'Brouillon'}
                          </Badge>
                          {item.category ? (
                            <Badge variant="outline" className="text-[10px] font-medium">
                              {item.category}
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-slate-800/45">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {item.answer || (
                            <span className="italic text-slate-500 dark:text-slate-400">Aucune réponse définie.</span>
                          )}
                        </p>
                      </div>

                      {item.tags.length > 0 ? (
                        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                          Tags : {item.tags.join(', ')}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-slate-900/40">
          <Button variant="outline" className={PHOENIX_MODAL_CANCEL_BUTTON_CLASS} onClick={onClose}>
            Fermer
          </Button>
          {canManage ? (
            <Button className={PHOENIX_PRIMARY_BUTTON_CLASS} asChild>
              <Link href={faqProjectHref(projectKey)} onClick={onClose}>
                <Icons.edit className="mr-2 h-4 w-4" />
                Gérer les questions
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
