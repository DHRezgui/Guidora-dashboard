'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';
import { PhoenixConfirmModal } from '@/components/dashboard/PhoenixConfirmModal';
import { PhoenixCollapsibleCard } from '@/app/dashboard/blueprints/_components/phoenix-collapsible';
import {
  PHOENIX_FIELD_CLASS,
  PHOENIX_INSET_PANEL_CLASS,
  PHOENIX_LABEL_CLASS,
  PHOENIX_PANEL_CLASS,
} from '@/app/dashboard/blueprints/blueprint-shared';
import { LAB_INLINE_CODE_HIGHLIGHT_CLASS } from '@/app/dashboard/sdk-tests/lab-shared';
import { authService, faqService, getErrorMessage, type FaqEntryRow } from '@/lib/api';
import { canManageFaq, getDashboardRole } from '@/lib/dashboard-roles';
import {
  DEFAULT_FAQ_PROJECT_KEY,
  faqProjectHref,
  formatFaqProjectTitle,
} from '@/lib/faq-project';
import { PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FaqProjectCard } from './_components/faq-project-card';
import { FaqProjectQuestionsModal } from './_components/faq-project-questions-modal';

function groupItemsByProject(items: FaqEntryRow[]): Record<string, FaqEntryRow[]> {
  const grouped: Record<string, FaqEntryRow[]> = {};
  for (const item of items) {
    const key = item.projectKey || DEFAULT_FAQ_PROJECT_KEY;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  return grouped;
}

export default function FaqProjectsPage() {
  const router = useRouter();
  const canManage = canManageFaq(getDashboardRole(authService.getUser()));
  const [loading, setLoading] = useState(true);
  const [projectKeys, setProjectKeys] = useState<string[]>([DEFAULT_FAQ_PROJECT_KEY]);
  const [projectKeyCounts, setProjectKeyCounts] = useState<Record<string, number>>({});
  const [projectKeyTourCounts, setProjectKeyTourCounts] = useState<Record<string, number>>({});
  const [itemsByProject, setItemsByProject] = useState<Record<string, FaqEntryRow[]>>({});
  const [newProjectKey, setNewProjectKey] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [sdkInfoOpen, setSdkInfoOpen] = useState(false);
  const [questionsProjectKey, setQuestionsProjectKey] = useState<string | null>(null);
  const [deleteProjectKey, setDeleteProjectKey] = useState<string | null>(null);
  const [deleteProjectLoading, setDeleteProjectLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await faqService.listManage();
      const keys = response.projectKeys?.length ? response.projectKeys : [DEFAULT_FAQ_PROJECT_KEY];
      setProjectKeys(keys);
      setProjectKeyCounts(response.projectKeyCounts ?? {});
      setProjectKeyTourCounts(response.projectKeyTourCounts ?? {});
      setItemsByProject(groupItemsByProject(response.items ?? []));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de charger les projets FAQ'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalQuestions = useMemo(
    () => Object.values(projectKeyCounts).reduce((sum, count) => sum + count, 0),
    [projectKeyCounts],
  );

  const sdkPackCount = useMemo(
    () => projectKeys.filter((key) => key !== DEFAULT_FAQ_PROJECT_KEY).length,
    [projectKeys],
  );

  const createProject = async () => {
    const key = newProjectKey.trim();
    if (!key || creatingProject) return;
    setCreatingProject(true);
    try {
      await faqService.registerProject(key);
      setNewProjectKey('');
      await load();
      toast.success(`Projet ${key} créé`);
      router.push(faqProjectHref(key));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de créer le projet FAQ'));
    } finally {
      setCreatingProject(false);
    }
  };

  const confirmDeleteProject = async () => {
    if (!deleteProjectKey || !canManage) return;
    setDeleteProjectLoading(true);
    try {
      const result = await faqService.deleteProject(deleteProjectKey);
      toast.success(
        result.deleted > 0
          ? `Corpus FAQ supprimé — ${result.deleted} question${result.deleted > 1 ? 's' : ''} retirée${result.deleted > 1 ? 's' : ''}`
          : 'Corpus FAQ supprimé',
      );
      setDeleteProjectKey(null);
      if (questionsProjectKey === deleteProjectKey) {
        setQuestionsProjectKey(null);
      }
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de supprimer le projet'));
    } finally {
      setDeleteProjectLoading(false);
    }
  };

  const questionsModalItems = questionsProjectKey ? itemsByProject[questionsProjectKey] ?? [] : [];

  return (
    <RoleRouteGuard access="faq">
      <div className="relative space-y-6">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-16 top-4 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute right-[-60px] top-24 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">FAQ</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              {canManage
                ? 'Organisez l’aide par projet ou application SDK. Chaque paquet regroupe ses propres questions et son index sémantique.'
                : 'Consultez les corpus d’aide par projet (lecture seule).'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Projets FAQ',
              value: projectKeys.length,
              icon: Icons.faq,
              tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70',
            },
            {
              label: 'Questions totales',
              value: totalQuestions,
              icon: Icons.list,
              tone: 'from-purple-100 to-white dark:from-purple-600/20 dark:to-slate-900/70',
            },
            {
              label: 'Paquets SDK',
              value: sdkPackCount,
              icon: Icons.code,
              tone: 'from-cyan-100 to-white dark:from-cyan-500/20 dark:to-slate-900/70',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={cn(
                  'min-h-[96px] rounded-2xl border border-slate-200 bg-gradient-to-br p-4 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm dark:border-white/10 dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]',
                  item.tone,
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                      {loading ? '…' : item.value}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-orange-500 dark:border-white/10 dark:bg-slate-950/65 dark:text-orange-300">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <PhoenixCollapsibleCard
            title="Conseils"
            description="Comment structurer vos corpus d’aide par projet."
            open={tipsOpen}
            onOpenChange={setTipsOpen}
          >
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p>
                • Le corpus <strong className="font-medium text-slate-900 dark:text-white">FAQ générique</strong>{' '}
                couvre l’aide sans <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>flowVersion</code> spécifique.
              </p>
              <p>
                • Créez un paquet par application SDK en utilisant le même identifiant que le{' '}
                <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>flowVersion</code> .
              </p>
              <p>
                • Publiez les questions et régénérez l&apos;index sémantique pour qu&apos;elles soient visibles dans
                l&apos;aide SDK.
              </p>
              {!canManage ? (
                <p>• En tant que développeur, vous pouvez consulter les projets sans les modifier.</p>
              ) : null}
            </div>
          </PhoenixCollapsibleCard>

          <PhoenixCollapsibleCard
            title="Intégration SDK"
            description="Comment le SDK résout le bon corpus FAQ."
            open={sdkInfoOpen}
            onOpenChange={setSdkInfoOpen}
          >
            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p>
                Le SDK dérive le <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>projectKey</code> depuis le{' '}
                <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>flowVersion</code> du parcours actif dans{' '}
                <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>contextualSuggestions</code>.
              </p>
              <p>
                Sans paquet dédié, la recherche FAQ utilise le corpus{' '}
                <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>default</code>.
              </p>
            </div>
          </PhoenixCollapsibleCard>
        </div>

        {canManage ? (
          <Card className={cn(PHOENIX_PANEL_CLASS, 'overflow-hidden')}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Créer un projet FAQ</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Créez un paquet lié à une application ou un identifiant{' '}
                    <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>flowVersion</code> SDK.
                  </p>
                </div>
              </div>
              <div className={cn(PHOENIX_INSET_PANEL_CLASS, 'mt-4')}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-[220px] flex-1">
                    <Label htmlFor="faq-new-project" className={PHOENIX_LABEL_CLASS}>
                      Identifiant projet
                    </Label>
                    <Input
                      id="faq-new-project"
                      value={newProjectKey}
                      onChange={(event) => setNewProjectKey(event.target.value)}
                      placeholder="ex. test-11-v1"
                      className={cn('mt-1.5', PHOENIX_FIELD_CLASS)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') createProject();
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    className={PHOENIX_PRIMARY_BUTTON_CLASS}
                    disabled={!newProjectKey.trim() || creatingProject}
                    onClick={() => void createProject()}
                  >
                    {creatingProject ? (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.plus className="mr-2 h-4 w-4" />
                    )}
                    Créer le projet
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Projets FAQ</h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {loading
                ? 'Chargement…'
                : `${projectKeys.length} projet${projectKeys.length !== 1 ? 's' : ''} · ${totalQuestions} question${totalQuestions !== 1 ? 's' : ''}`}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900/40 py-16 backdrop-blur-xl">
              <Icons.spinner className="h-6 w-6 animate-spin text-orange-400" />
              <span className="ml-3 text-sm text-slate-400">Chargement des projets FAQ…</span>
            </div>
          ) : null}

          {!loading && projectKeys.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-orange-400/25 bg-gradient-to-br from-orange-500/[0.06] via-slate-900/50 to-pink-500/[0.05] px-6 py-14 text-center backdrop-blur-xl">
              <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-orange-500/15 blur-3xl" />
              <div className="relative">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                  <Icons.faq className="h-7 w-7 text-orange-300" />
                </div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">Aucun projet FAQ</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  Commencez par le corpus générique ou créez un paquet lié à votre intégration SDK.
                </p>
                {canManage ? (
                  <Button
                    type="button"
                    className={cn('mt-6', PHOENIX_PRIMARY_BUTTON_CLASS)}
                    onClick={() => router.push(faqProjectHref(DEFAULT_FAQ_PROJECT_KEY))}
                  >
                    Ouvrir {formatFaqProjectTitle(DEFAULT_FAQ_PROJECT_KEY)}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading && projectKeys.length > 0 ? (
            <div
              className="rounded-2xl border-2 border-dashed border-slate-300/70 bg-slate-50/40 p-5 dark:border-white/20 dark:bg-slate-900/25"
              aria-label="Catalogue des projets FAQ"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-slate-300/50 pb-3 dark:border-white/15">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Corpus d&apos;aide
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {projectKeys.length} projet{projectKeys.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {projectKeys.map((key) => (
                  <FaqProjectCard
                    key={key}
                    projectKey={key}
                    questionCount={projectKeyCounts[key] ?? 0}
                    tourCount={projectKeyTourCounts[key] ?? 0}
                    canManage={canManage}
                    onShowQuestions={() => setQuestionsProjectKey(key)}
                    onDelete={
                      key !== DEFAULT_FAQ_PROJECT_KEY
                        ? () => setDeleteProjectKey(key)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {questionsProjectKey ? (
        <FaqProjectQuestionsModal
          projectKey={questionsProjectKey}
          items={questionsModalItems}
          canManage={canManage}
          onClose={() => setQuestionsProjectKey(null)}
        />
      ) : null}

      <PhoenixConfirmModal
        open={deleteProjectKey != null}
        variant="danger"
        title={
          deleteProjectKey
            ? `Supprimer le corpus FAQ — ${formatFaqProjectTitle(deleteProjectKey)}`
            : 'Supprimer le corpus FAQ'
        }
        description={
          deleteProjectKey ? (
            <>
              <p>
                Supprimer le paquet FAQ{' '}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {formatFaqProjectTitle(deleteProjectKey)}
                </strong>{' '}
                et ses{' '}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {projectKeyCounts[deleteProjectKey] ?? 0}
                </strong>{' '}
                question{(projectKeyCounts[deleteProjectKey] ?? 0) > 1 ? 's' : ''} ?
              </p>
              <p className="mt-3 text-slate-600 dark:text-slate-400">
                Cette action ne supprime pas les parcours ni les blueprints du projet. Pour une
                suppression complète du scope SDK, utilisez le hub projet.
              </p>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Action irréversible. L&apos;index sémantique associé sera régénéré.
              </p>
            </>
          ) : null
        }
        confirmLabel="Supprimer le corpus FAQ"
        loading={deleteProjectLoading}
        loadingLabel="Suppression…"
        onClose={() => {
          if (!deleteProjectLoading) setDeleteProjectKey(null);
        }}
        onConfirm={() => void confirmDeleteProject()}
      />
    </RoleRouteGuard>
  );
}
