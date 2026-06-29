'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DashboardStatGrid from '@/components/dashboard/DashboardStatGrid';
import { PhoenixConfirmModal } from '@/components/dashboard/PhoenixConfirmModal';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';
import {
  PHOENIX_FIELD_CLASS,
  PHOENIX_LABEL_CLASS,
} from '@/app/dashboard/blueprints/blueprint-shared';
import { LAB_INLINE_CODE_HIGHLIGHT_CLASS } from '@/app/dashboard/sdk-tests/lab-shared';
import { authService, faqService, getErrorMessage, type FaqEntryRow } from '@/lib/api';
import { canManageFaq, getDashboardRole } from '@/lib/dashboard-roles';
import {
  getFaqEditLockBlockedMessage,
  hasActiveFaqEditLock,
  isFaqListActionBlocked,
  isFaqLockedByOther,
} from '@/lib/faq-edit-lock';
import { useFaqEditLock } from '@/lib/use-faq-edit-lock';
import {
  PHOENIX_CHECKBOX_CLASS,
  PHOENIX_DESTRUCTIVE_BUTTON_CLASS,
  PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
  PHOENIX_MODAL_OVERLAY_CLASS,
  PHOENIX_MODAL_PANEL_CLASS,
  PHOENIX_PRIMARY_BUTTON_CLASS,
} from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FaqFormState = {
  question: string;
  answer: string;
  category: string;
  tags: string;
  isActive: boolean;
};

const EMPTY_FORM: FaqFormState = {
  question: '',
  answer: '',
  category: '',
  tags: '',
  isActive: true,
};

const PHOENIX_CARD_BTN_BASE =
  'h-9 gap-1.5 rounded-lg border text-sm font-medium shadow-sm backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-orange-400/25 dark:bg-slate-900/45';

const FAQ_PAGE_SIZE = 5;

function toFormState(row: FaqEntryRow): FaqFormState {
  return {
    question: row.question,
    answer: row.answer,
    category: row.category ?? '',
    tags: row.tags.join(', '),
    isActive: row.isActive,
  };
}

export default function FaqPage() {
  const user = authService.getUser();
  const role = getDashboardRole(user);
  const canManage = canManageFaq(role);

  const [items, setItems] = useState<FaqEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FaqEntryRow | null>(null);
  const [form, setForm] = useState<FaqFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<FaqEntryRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const [clearAllLoading, setClearAllLoading] = useState(false);
  const [indexStatus, setIndexStatus] = useState<{
    activeCount: number;
    embeddingsReady: boolean;
    needsReindex: boolean;
    lastIndexedAt: string | null;
  } | null>(null);
  const [previewQuery, setPreviewQuery] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<
    Array<{ id: string; question: string; answer: string; category: string; score: number }>
  >([]);
  const [lastImportSummary, setLastImportSummary] = useState<string | null>(null);
  const previewSearchTokenRef = useRef(0);

  const {
    lockBlocked: editLockBlocked,
    lockMessage: editLockMessage,
    isAcquiring: isAcquiringEditLock,
    retryAcquire: retryEditLockAcquire,
    releaseIfHeld,
  } = useFaqEditLock({
    entryId: editing?.id ?? null,
    entry: editing,
    enabled: modalOpen && editing != null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listResponse, statusResponse] = await Promise.all([
        faqService.listManage(),
        faqService.getIndexStatus().catch(() => null),
      ]);
      setItems(listResponse.items);
      if (statusResponse) {
        setIndexStatus({
          activeCount: statusResponse.activeCount,
          embeddingsReady: statusResponse.embeddingsReady,
          needsReindex: statusResponse.needsReindex,
          lastIndexedAt: statusResponse.lastIndexedAt,
        });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de charger la FAQ'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.question, item.answer, item.category ?? '', item.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [items, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, items.length]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / FAQ_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * FAQ_PAGE_SIZE;
    return filteredItems.slice(start, start + FAQ_PAGE_SIZE);
  }, [filteredItems, safeCurrentPage]);

  const paginatedRangeLabel = useMemo(() => {
    if (filteredItems.length === 0) return '';
    const start = (safeCurrentPage - 1) * FAQ_PAGE_SIZE + 1;
    const end = Math.min(safeCurrentPage * FAQ_PAGE_SIZE, filteredItems.length);
    return `${start}–${end} sur ${filteredItems.length}`;
  }, [filteredItems.length, safeCurrentPage]);

  const stats = useMemo(() => {
    const published = items.filter((item) => item.isActive).length;
    const categories = new Set(items.map((item) => item.category).filter(Boolean));
    const views = items.reduce((sum, item) => sum + item.viewCount, 0);
    return { total: items.length, published, categories: categories.size, views };
  }, [items]);

  const statCards = useMemo(
    () => [
      {
        title: 'Total',
        value: stats.total,
        icon: Icons.faq,
        tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70',
      },
      {
        title: 'Publiées',
        value: stats.published,
        icon: Icons.checkCircle,
        tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70',
      },
      {
        title: 'Catégories',
        value: stats.categories,
        icon: Icons.filter,
        tone: 'from-purple-100 to-white dark:from-purple-600/20 dark:to-slate-900/70',
      },
      {
        title: 'Vues SDK',
        value: stats.views,
        icon: Icons.eye,
        tone: 'from-sky-100 to-white dark:from-sky-600/20 dark:to-slate-900/70',
      },
    ],
    [stats],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (row: FaqEntryRow) => {
    setEditing(row);
    setForm(toFormState(row));
    setModalOpen(true);
  };

  const closeModal = () => {
    const wasEditing = editing != null;
    void releaseIfHeld().finally(() => {
      if (wasEditing) {
        void load();
      }
    });
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!canManage) return;
    if (editing && (editLockBlocked || isAcquiringEditLock)) {
      toast.error(editLockMessage ?? getFaqEditLockBlockedMessage(editing.editLock));
      return;
    }
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('Question et réponse sont requises');
      return;
    }

    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category.trim() || undefined,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editing) {
        await faqService.update(editing.id, payload);
        toast.success('Entrée FAQ mise à jour');
        await releaseIfHeld();
      } else {
        await faqService.create(payload);
        toast.success('Entrée FAQ créée');
      }
      closeModal();
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (row: FaqEntryRow) => {
    if (!canManage) return;
    if (isFaqListActionBlocked(row.editLock)) {
      toast.error(
        isFaqLockedByOther(row.editLock)
          ? `Publication indisponible : entrée en édition par ${row.editLock?.heldByDisplayName?.trim() || 'un autre administrateur'}.`
          : 'Publication indisponible pendant votre session d’édition. Enregistrez ou fermez l’éditeur.',
      );
      return;
    }
    try {
      await faqService.setActive(row.id, !row.isActive);
      toast.success(row.isActive ? 'Entrée dépubliée' : 'Entrée publiée');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = (row: FaqEntryRow) => {
    if (!canManage) return;
    if (isFaqListActionBlocked(row.editLock)) {
      toast.error(
        isFaqLockedByOther(row.editLock)
          ? `Suppression impossible : entrée en édition par ${row.editLock?.heldByDisplayName?.trim() || 'un autre administrateur'}.`
          : 'Suppression impossible pendant votre session d’édition. Fermez l’éditeur d’abord.',
      );
      return;
    }
    setDeleteTarget(row);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !canManage) return;
    setDeleteLoading(true);
    try {
      await faqService.remove(deleteTarget.id);
      toast.success('Entrée supprimée');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReindex = async () => {
    if (!canManage) return;
    setReindexing(true);
    try {
      const result = await faqService.reindex();
      toast.success(
        result.embeddedCount != null
          ? `Index régénéré (${result.embeddedCount} entrée(s) publiée(s))`
          : result.message,
      );
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Échec de la régénération des embeddings'));
    } finally {
      setReindexing(false);
    }
  };

  const handlePreviewQueryChange = (value: string) => {
    setPreviewQuery(value);
    if (!value.trim()) {
      previewSearchTokenRef.current += 1;
      setPreviewResults([]);
      setPreviewLoading(false);
    }
  };

  const handlePreviewSearch = async () => {
    const question = previewQuery.trim();
    if (!question) return;
    const token = previewSearchTokenRef.current + 1;
    previewSearchTokenRef.current = token;
    setPreviewLoading(true);
    try {
      const result = await faqService.semanticSearch(question, 3);
      if (token !== previewSearchTokenRef.current) return;
      setPreviewResults(result.results ?? []);
      if (!result.results?.length) {
        toast.message('Aucun résultat pertinent pour cette question de test.');
      }
    } catch (err) {
      if (token !== previewSearchTokenRef.current) return;
      toast.error(getErrorMessage(err, 'Échec du test de recherche sémantique'));
      setPreviewResults([]);
    } finally {
      if (token === previewSearchTokenRef.current) {
        setPreviewLoading(false);
      }
    }
  };

  const handleImportGlobal = () => {
    if (!canManage) return;
    setImportConfirmOpen(true);
  };

  const confirmImportGlobal = async () => {
    if (!canManage) return;
    setImporting(true);
    try {
      const result = await faqService.importGlobal({
        skipDuplicates: true,
        replaceExisting: false,
      });
      toast.success(
        `${result.imported} importée(s) · ${result.skipped} ignorée(s) / ${result.totalInCatalog} au catalogue`,
      );
      setLastImportSummary(
        `Dernier import TrustDev : ${result.imported} ajoutée(s), ${result.skipped} ignorée(s), ${result.totalInCatalog} au catalogue.`,
      );
      setImportConfirmOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Échec de l’import FAQ TrustDev'));
    } finally {
      setImporting(false);
    }
  };

  const confirmClearAll = async () => {
    if (!canManage) return;
    setClearAllLoading(true);
    try {
      const result = await faqService.removeAll();
      toast.success(
        result.deleted > 0
          ? `${result.deleted} entrée(s) supprimée(s)`
          : 'Aucune entrée FAQ à supprimer',
      );
      setClearAllConfirmOpen(false);
      setLastImportSummary(null);
      setDeleteTarget(null);
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Échec de la suppression de la FAQ'));
    } finally {
      setClearAllLoading(false);
    }
  };

  return (
    <RoleRouteGuard access="faq">
      <div className="relative space-y-6">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-16 top-4 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute right-[-60px] top-24 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              FAQ organisation
            </h1>
            <p className="mt-1 text-sm whitespace-nowrap text-slate-600 dark:text-slate-400">
              Gérez la base d&apos;aide de votre organisation. Les entrées publiées alimentent la recherche sémantique du SDK (scope{' '}
              <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>faq:search</code>).
            </p>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={PHOENIX_MODAL_CANCEL_BUTTON_CLASS}
                disabled={importing || reindexing}
                onClick={() => void handleImportGlobal()}
              >
                {importing ? (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icons.download className="mr-2 h-4 w-4" />
                )}
                Importer FAQ TrustDev
              </Button>
              <Button
                type="button"
                variant="outline"
                className={PHOENIX_MODAL_CANCEL_BUTTON_CLASS}
                disabled={reindexing}
                onClick={() => void handleReindex()}
              >
                {reindexing ? (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icons.refresh className="mr-2 h-4 w-4" />
                )}
                Régénérer l&apos;index
              </Button>
              <Button type="button" className={PHOENIX_PRIMARY_BUTTON_CLASS} onClick={openCreate}>
                <Icons.plus className="mr-2 h-4 w-4" />
                Nouvelle entrée
              </Button>
            </div>
          ) : null}
        </div>

        <DashboardStatGrid stats={statCards} />

        {indexStatus ? (
          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-sm',
              indexStatus.needsReindex
                ? 'border-amber-300/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100'
                : 'border-emerald-300/60 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-100',
            )}
          >
            <p className="font-medium">
              {indexStatus.needsReindex
                ? 'Index sémantique à jour requis'
                : 'Index sémantique prêt pour le SDK'}
            </p>
            <p className="mt-1 text-xs opacity-90">
              {indexStatus.activeCount} entrée(s) publiée(s)
              {indexStatus.lastIndexedAt
                ? ` · dernier index : ${new Date(indexStatus.lastIndexedAt).toLocaleString('fr-FR')}`
                : ' · aucun fichier d’embeddings détecté'}
            </p>
          </div>
        ) : null}

        {lastImportSummary ? (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300">
            {lastImportSummary}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Tester la recherche SDK</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Simule la recherche sémantique utilisée par la sidebar d’aide.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={previewQuery}
              onChange={(event) => handlePreviewQueryChange(event.target.value)}
              placeholder="Ex. Comment changer mon nom ?"
              className={PHOENIX_FIELD_CLASS}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handlePreviewSearch();
              }}
            />
            <Button
              type="button"
              className={PHOENIX_PRIMARY_BUTTON_CLASS}
              disabled={previewLoading || previewQuery.trim().length === 0}
              onClick={() => void handlePreviewSearch()}
            >
              {previewLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
              Tester
            </Button>
          </div>
          {previewResults.length > 0 ? (
            <div className="mt-4 space-y-2">
              {previewResults.map((result) => (
                <article
                  key={result.id}
                  className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-900/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-300">
                      {result.category}
                    </span>
                    <span className="text-[11px] text-slate-500">{Math.round(result.score * 100)} %</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{result.question}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{result.answer}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-950/50">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Icons.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une question, une réponse ou une catégorie…"
                className="rounded-xl pl-9"
              />
            </div>
            {canManage && items.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className={cn(
                  PHOENIX_CARD_BTN_BASE,
                  'border-rose-300/70 bg-white/90 text-rose-700 hover:border-rose-400/70 hover:bg-rose-50/95 dark:border-rose-400/35 dark:bg-slate-900/45 dark:text-rose-200 dark:hover:bg-rose-500/10',
                )}
                disabled={clearAllLoading || loading}
                onClick={() => setClearAllConfirmOpen(true)}
              >
                {clearAllLoading ? (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icons.trash className="mr-2 h-4 w-4" />
                )}
                Vider toutes les questions
              </Button>
            ) : null}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Icons.spinner className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/15">
              <Icons.faq className="mx-auto h-8 w-8 text-orange-400" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Aucune entrée FAQ</p>
              <p className="mt-1 text-sm text-slate-500">
                {canManage
                  ? 'Créez votre première question/réponse pour activer la FAQ multi-tenant.'
                  : 'Aucune entrée disponible pour le moment.'}
              </p>
              {canManage ? (
                <Button type="button" className={cn('mt-4', PHOENIX_PRIMARY_BUTTON_CLASS)} onClick={openCreate}>
                  Créer une entrée
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedItems.map((item) => {
                  const listActionsBlocked = isFaqListActionBlocked(item.editLock);
                  const lockedByOther = isFaqLockedByOther(item.editLock);
                  return (
                  <article
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                            item.isActive
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {item.isActive ? 'Publiée' : 'Brouillon'}
                        </span>
                        {item.category ? (
                          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-600 dark:text-orange-300">
                            {item.category}
                          </span>
                        ) : null}
                      </div>
                      {canManage ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(
                              PHOENIX_CARD_BTN_BASE,
                              'border-slate-300/70 bg-white/90 text-slate-700 hover:border-orange-400/50 hover:bg-white dark:border-white/15 dark:text-slate-200',
                            )}
                            onClick={() => openEdit(item)}
                          >
                            <Icons.edit className="mr-1 h-3.5 w-3.5" />
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(
                              PHOENIX_CARD_BTN_BASE,
                              item.isActive
                                ? 'border-amber-300/55 bg-white/90 text-amber-900 hover:border-amber-400/65 hover:bg-amber-50/95 dark:border-amber-400/35 dark:text-amber-200'
                                : 'border-emerald-300/55 bg-white/90 text-emerald-800 hover:border-emerald-400/65 hover:bg-emerald-50/95 dark:border-emerald-400/35 dark:text-emerald-200',
                            )}
                            disabled={listActionsBlocked}
                            title={
                              listActionsBlocked
                                ? lockedByOther
                                  ? 'Publication indisponible pendant une session d’édition'
                                  : 'Fermez l’éditeur avant de publier depuis la liste'
                                : undefined
                            }
                            onClick={() => void handleTogglePublish(item)}
                          >
                            {item.isActive ? 'Dépublier' : 'Publier'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(PHOENIX_DESTRUCTIVE_BUTTON_CLASS, 'h-9 px-3 text-xs')}
                            disabled={listActionsBlocked}
                            title={
                              listActionsBlocked
                                ? lockedByOther
                                  ? 'Suppression indisponible pendant une session d’édition'
                                  : 'Fermez l’éditeur avant de supprimer'
                                : undefined
                            }
                            onClick={() => handleDelete(item)}
                          >
                            <Icons.trash className="mr-1 h-3.5 w-3.5" />
                            Supprimer
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{item.question}</h2>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{item.answer}</p>
                      {item.tags.length > 0 ? (
                        <p className="mt-2 text-xs text-slate-500">Tags : {item.tags.join(', ')}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-500">
                        Usage : {item.viewCount} vue{item.viewCount > 1 ? 's' : ''} · {item.helpfulCount} utile
                        {item.helpfulCount > 1 ? 's' : ''} · {item.notHelpfulCount} non utile
                        {item.notHelpfulCount > 1 ? 's' : ''}
                      </p>
                    </div>

                    {canManage && hasActiveFaqEditLock(item.editLock) ? (
                      <p className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-2.5 py-1.5 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
                        {lockedByOther
                          ? `En édition par ${item.editLock?.heldByDisplayName?.trim() || 'un autre administrateur'} — publication et suppression désactivées`
                          : 'Session d’édition en cours — publication et suppression désactivées depuis la liste'}
                      </p>
                    ) : null}
                  </article>
                  );
                })}
              </div>

              {filteredItems.length > FAQ_PAGE_SIZE ? (
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {paginatedRangeLabel} entrée{filteredItems.length > 1 ? 's' : ''} — {FAQ_PAGE_SIZE} par page
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className={cn(PHOENIX_MODAL_CANCEL_BUTTON_CLASS, 'gap-1')}
                    >
                      <Icons.chevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                    <span className="min-w-[7rem] text-center text-sm font-medium text-slate-800 dark:text-slate-200">
                      Page {safeCurrentPage} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      className={cn(PHOENIX_MODAL_CANCEL_BUTTON_CLASS, 'gap-1')}
                    >
                      Suivant
                      <Icons.chevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 border-t border-slate-200/80 pt-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400">
                  {filteredItems.length} entrée{filteredItems.length > 1 ? 's' : ''} au total
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={PHOENIX_MODAL_OVERLAY_CLASS} onClick={closeModal} aria-hidden />
          <div className={cn(PHOENIX_MODAL_PANEL_CLASS, 'mx-4 max-w-2xl animate-scale-in')}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {editing ? 'Modifier une entrée FAQ' : 'Nouvelle entrée FAQ'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Les entrées publiées sont indexées pour la recherche sémantique du SDK.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                <Icons.close className="h-5 w-5" />
              </button>
            </div>

            {editing && isAcquiringEditLock ? (
              <div className="flex justify-center py-10">
                <Icons.spinner className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : editing && editLockBlocked ? (
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/90 p-5 text-center dark:border-rose-900/40 dark:bg-rose-950/30">
                <Icons.admin className="mx-auto h-8 w-8 text-rose-500 dark:text-rose-300" />
                <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">Édition verrouillée</h3>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  {editLockMessage ?? getFaqEditLockBlockedMessage(editing.editLock)}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" className={PHOENIX_MODAL_CANCEL_BUTTON_CLASS} onClick={closeModal}>
                    Fermer
                  </Button>
                  <Button
                    type="button"
                    className={PHOENIX_PRIMARY_BUTTON_CLASS}
                    disabled={isAcquiringEditLock}
                    onClick={() => void retryEditLockAcquire()}
                  >
                    {isAcquiringEditLock ? (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.refresh className="mr-2 h-4 w-4" />
                    )}
                    Réessayer
                  </Button>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="faq-question" className={PHOENIX_LABEL_CLASS}>
                  Question
                </Label>
                <Input
                  id="faq-question"
                  value={form.question}
                  onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
                  className={cn('mt-1.5', PHOENIX_FIELD_CLASS)}
                  placeholder="Comment réinitialiser mon mot de passe ?"
                />
              </div>
              <div>
                <Label htmlFor="faq-answer" className={PHOENIX_LABEL_CLASS}>
                  Réponse
                </Label>
                <textarea
                  id="faq-answer"
                  value={form.answer}
                  onChange={(event) => setForm((prev) => ({ ...prev, answer: event.target.value }))}
                  className={cn('mt-1.5 min-h-[120px] w-full px-3 py-2 text-sm', PHOENIX_FIELD_CLASS)}
                  placeholder="Depuis l'écran de connexion…"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="faq-category" className={PHOENIX_LABEL_CLASS}>
                    Catégorie
                  </Label>
                  <Input
                    id="faq-category"
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                    className={cn('mt-1.5', PHOENIX_FIELD_CLASS)}
                    placeholder="auth, billing, support…"
                  />
                </div>
                <div>
                  <Label htmlFor="faq-tags" className={PHOENIX_LABEL_CLASS}>
                    Tags (séparés par des virgules)
                  </Label>
                  <Input
                    id="faq-tags"
                    value={form.tags}
                    onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                    className={cn('mt-1.5', PHOENIX_FIELD_CLASS)}
                    placeholder="password, login"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked === true }))
                  }
                  className={PHOENIX_CHECKBOX_CLASS}
                />
                Publier immédiatement (visible dans la recherche SDK)
              </label>
            </div>
            )}

            {!editing || editLockBlocked || isAcquiringEditLock ? null : (
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className={PHOENIX_MODAL_CANCEL_BUTTON_CLASS}
                onClick={closeModal}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className={PHOENIX_PRIMARY_BUTTON_CLASS}
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editing ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
            )}
          </div>
        </div>
      ) : null}

      <PhoenixConfirmModal
        open={deleteTarget != null}
        variant="danger"
        title="Supprimer l'entrée FAQ"
        description={
          deleteTarget ? (
            <>
              Êtes-vous sûr de vouloir supprimer{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">{deleteTarget.question}</strong>{' '}
              ? Cette action est irréversible.
            </>
          ) : null
        }
        confirmLabel="Supprimer"
        loading={deleteLoading}
        loadingLabel="Suppression…"
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />

      <PhoenixConfirmModal
        open={clearAllConfirmOpen}
        variant="danger"
        title="Vider toutes les questions FAQ"
        description={
          <>
            <p>
              Supprimer les <strong className="font-semibold text-slate-900 dark:text-white">{items.length}</strong>{' '}
              entrée{items.length > 1 ? 's' : ''} de votre organisation ?
            </p>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              Cette action est irréversible. L&apos;index sémantique sera régénéré en arrière-plan.
            </p>
          </>
        }
        confirmLabel="Tout supprimer"
        loading={clearAllLoading}
        loadingLabel="Suppression…"
        onClose={() => {
          if (!clearAllLoading) setClearAllConfirmOpen(false);
        }}
        onConfirm={() => void confirmClearAll()}
      />

      <PhoenixConfirmModal
        open={importConfirmOpen}
        variant="default"
        title="Importer FAQ TrustDev"
        maxWidthClassName="max-w-md"
        description={
          <>
            <p>Importer la base FAQ generique TrustDev (45 questions pour utilisateurs finaux) ?</p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-slate-600 dark:text-slate-400">
              <li>Modele adaptable a votre produit — personnalisez les reponses apres import</li>
              <li>Les questions deja presentes seront ignorees</li>
              <li>Les entrees importees seront publiees</li>
              <li>L&apos;index semantique sera regenere en arriere-plan</li>
            </ul>
          </>
        }
        confirmLabel="Importer"
        loading={importing}
        loadingLabel="Import…"
        onClose={() => {
          if (!importing) setImportConfirmOpen(false);
        }}
        onConfirm={confirmImportGlobal}
      />
    </RoleRouteGuard>
  );
}
