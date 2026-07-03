'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';
import { PHOENIX_INSET_PANEL_CLASS } from '@/app/dashboard/blueprints/blueprint-shared';
import { LAB_INLINE_CODE_HIGHLIGHT_CLASS } from '@/app/dashboard/sdk-tests/lab-shared';
import { authService, getErrorMessage, projectService, type ProjectOverview } from '@/lib/api';
import {
  canCreateTours,
  canManageBlueprints,
  canManageFaq,
  canManageProjectScope,
  getDashboardRole,
} from '@/lib/dashboard-roles';
import {
  blueprintProjectHref,
  DEFAULT_FAQ_PROJECT_KEY,
  faqProjectHref,
  faqProjectToursHref,
  formatProjectSubtitle,
  formatProjectTitle,
  parseProjectParam,
  projectsIndexHref,
  tourCreateHref,
} from '@/lib/project';
import { PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ProjectHubResourceItem, ProjectHubResourcePanel } from './_components/project-hub-resource-panel';
import { ProjectHubStatCard } from './_components/project-hub-stat-card';
import { ProjectHubTourItem } from './_components/project-hub-tour-item';
import { ProjectScopeDeleteModal } from '../_components/project-scope-delete-modal';

const PHOENIX_HUB_BTN =
  'h-9 gap-1.5 rounded-lg border border-slate-300/80 bg-white/90 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:border-orange-400/50 hover:text-orange-700 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100 dark:hover:text-orange-200';

export default function ProjectHubPage() {
  const params = useParams();
  const router = useRouter();
  const projectKey = parseProjectParam(typeof params.projectKey === 'string' ? params.projectKey : '');
  const isDefault = projectKey === DEFAULT_FAQ_PROJECT_KEY;
  const role = getDashboardRole(authService.getUser());
  const canManageBp = canManageBlueprints(role);
  const canManageFaqCorpus = canManageFaq(role);
  const canCreateTour = canCreateTours(role);
  const canDeleteScope = canManageProjectScope(role);

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [deleteScopeOpen, setDeleteScopeOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await projectService.getOverview(projectKey);
      setOverview(response);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de charger le projet'));
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [projectKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);

  const indexMeta = useMemo(() => {
    const status = overview?.indexStatus;
    if (!status) {
      return { label: '—', hint: 'Statut indisponible', cardStatus: 'muted' as const };
    }
    if (!status.embeddingsReady) {
      return { label: 'Non indexé', hint: 'Générez l’index depuis la FAQ', cardStatus: 'muted' as const };
    }
    if (status.needsReindex) {
      return {
        label: 'À réindexer',
        hint: `${status.activeCount} entrée${status.activeCount !== 1 ? 's' : ''} active${status.activeCount !== 1 ? 's' : ''}`,
        cardStatus: 'warn' as const,
      };
    }
    return {
      label: 'À jour',
      hint: status.lastIndexedAt
        ? `Indexé le ${new Date(status.lastIndexedAt).toLocaleDateString('fr-FR')}`
        : `${status.activeCount} entrée${status.activeCount !== 1 ? 's' : ''} active${status.activeCount !== 1 ? 's' : ''}`,
      cardStatus: 'ok' as const,
    };
  }, [overview?.indexStatus]);

  const totalResources = (overview?.faqCount ?? 0) + (overview?.tourCount ?? 0) + (overview?.blueprintCount ?? 0);

  const faqHasItems = (overview?.faqCount ?? 0) > 0;
  const toursHaveItems = (overview?.tourCount ?? 0) > 0;
  const blueprintsHaveItems = (overview?.blueprintCount ?? 0) > 0;

  const blueprintCreateHref = `/dashboard/blueprints/create?projectKey=${encodeURIComponent(projectKey)}`;
  const tourCreateLink = tourCreateHref(projectKey);

  return (
    <RoleRouteGuard access="projects">
      <div className="relative space-y-6">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-16 top-4 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute right-[-60px] top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-pink-500/10 blur-3xl" />
        </div>

        {/* Hero header */}
        <section
          className={cn(
            'relative overflow-hidden rounded-2xl border backdrop-blur-xl',
            isDefault
              ? 'border-cyan-300/45 bg-[linear-gradient(155deg,rgba(6,182,212,0.08),rgba(255,255,255,0.95)_50%,rgba(248,250,252,0.92))] shadow-[0_12px_28px_rgba(2,6,23,0.1)] dark:border-cyan-400/20 dark:bg-[linear-gradient(155deg,rgba(6,182,212,0.1),rgba(15,23,42,0.55)_45%,rgba(2,6,23,0.85))] dark:shadow-none'
              : 'border-orange-300/45 bg-[linear-gradient(155deg,rgba(249,115,22,0.08),rgba(255,255,255,0.95)_50%,rgba(248,250,252,0.92))] shadow-[0_12px_28px_rgba(2,6,23,0.1)] dark:border-orange-400/20 dark:bg-[linear-gradient(155deg,rgba(249,115,22,0.1),rgba(15,23,42,0.55)_45%,rgba(2,6,23,0.85))] dark:shadow-none',
          )}
        >
          <div
            className={cn(
              'h-1.5 w-full',
              isDefault
                ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500'
                : 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600',
            )}
          />
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className={cn(
                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br shadow-lg',
                    isDefault
                      ? 'border-cyan-400/30 from-cyan-500/25 to-sky-600/15'
                      : 'border-orange-400/30 from-orange-500/25 to-pink-600/15',
                  )}
                >
                  <Icons.grid
                    className={cn(
                      'h-6 w-6',
                      isDefault ? 'text-cyan-600 dark:text-cyan-300' : 'text-orange-600 dark:text-orange-300',
                    )}
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                      {formatProjectTitle(projectKey)}
                    </h1>
                    <span
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        isDefault
                          ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-800 dark:border-cyan-400/35 dark:bg-cyan-500/15 dark:text-cyan-100'
                          : 'border-orange-400/40 bg-orange-500/10 text-orange-800 dark:border-orange-400/35 dark:bg-orange-500/15 dark:text-orange-100',
                      )}
                    >
                      {isDefault ? 'Générique' : 'SDK'}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-200">
                      {totalResources} ressource{totalResources !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {!isDefault ? (
                    <p className="font-mono text-sm text-orange-700 dark:text-orange-200/90">{projectKey}</p>
                  ) : null}
                  <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">{formatProjectSubtitle(projectKey)}</p>
                  {!isDefault ? (
                    <p className="text-xs text-slate-400">
                      Clé SDK : <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>{projectKey}</code>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button variant="outline" className={PHOENIX_HUB_BTN} asChild>
                  <Link href={faqProjectHref(projectKey)}>
                    <Icons.faq className="h-3.5 w-3.5" />
                    {canManageFaqCorpus ? 'Gérer la FAQ' : 'Voir la FAQ'}
                  </Link>
                </Button>
                <Button variant="outline" className={PHOENIX_HUB_BTN} asChild>
                  <Link href={faqProjectToursHref(projectKey)}>
                    <Icons.tours className="h-3.5 w-3.5" />
                    Parcours
                  </Link>
                </Button>
                <Button variant="outline" className={PHOENIX_HUB_BTN} asChild>
                  <Link href={blueprintProjectHref(projectKey)}>
                    <Icons.blueprints className="h-3.5 w-3.5" />
                    {canManageBp ? 'Blueprints' : 'Consulter les blueprints'}
                  </Link>
                </Button>
                {canDeleteScope && !isDefault ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1.5 rounded-lg border border-rose-300/60 bg-white/90 text-sm font-medium text-rose-700 shadow-sm hover:border-rose-400/70 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-400/35 dark:bg-slate-900/45 dark:text-rose-200 dark:hover:bg-rose-500/10"
                    onClick={() => setDeleteScopeOpen(true)}
                  >
                    <Icons.trash className="h-3.5 w-3.5" />
                    Supprimer le scope
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 py-16 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40">
            <Icons.spinner className="h-6 w-6 animate-spin text-orange-500 dark:text-orange-400" />
            <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">Chargement du hub projet…</span>
          </div>
        ) : null}

        {!loading && overview ? (
          <>
            {/* Navigation hub — stats cliquables (grille 12 col. pour aligner avec les panneaux ×3) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
              <div className="min-w-0 xl:col-span-3">
                <ProjectHubStatCard
                  label="Questions FAQ"
                  value={overview.faqCount}
                  hint="Corpus d’aide du projet"
                  icon={Icons.faq}
                  tone="from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70"
                  iconTone="text-orange-500 dark:text-orange-300"
                  href={faqProjectHref(projectKey)}
                />
              </div>
              <div className="min-w-0 xl:col-span-3">
                <ProjectHubStatCard
                  label="Parcours liés"
                  value={overview.tourCount}
                  hint="Parcours sandbox et prod du projet"
                  icon={Icons.tours}
                  tone="from-sky-100 to-white dark:from-sky-500/20 dark:to-slate-900/70"
                  iconTone="text-sky-600 dark:text-sky-300"
                  href={faqProjectToursHref(projectKey)}
                />
              </div>
              <div className="min-w-0 xl:col-span-3">
                <ProjectHubStatCard
                  label="Blueprints"
                  value={overview.blueprintCount}
                  hint="Modèles métier du projet"
                  icon={Icons.blueprints}
                  tone="from-violet-100 to-white dark:from-violet-500/20 dark:to-slate-900/70"
                  iconTone="text-violet-600 dark:text-violet-300"
                  href={blueprintProjectHref(projectKey)}
                />
              </div>
              <div className="min-w-0 xl:col-span-3">
                <ProjectHubStatCard
                  label="Index sémantique"
                  value={indexMeta.label}
                  hint={indexMeta.hint}
                  icon={Icons.search}
                  tone="from-emerald-100 to-white dark:from-emerald-500/20 dark:to-slate-900/70"
                  iconTone="text-emerald-600 dark:text-emerald-300"
                  href={faqProjectHref(projectKey)}
                  status={indexMeta.cardStatus}
                />
              </div>
            </div>

            {overview.indexStatus?.needsReindex && canManageFaqCorpus ? (
              <div className={cn(PHOENIX_INSET_PANEL_CLASS, 'flex flex-wrap items-center justify-between gap-3 border-amber-300/40 bg-amber-50/80 dark:border-amber-400/25 dark:bg-amber-500/10')}>
                <div className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
                  <Icons.warning className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>L’index sémantique FAQ doit être régénéré après des modifications récentes.</span>
                </div>
                <Button size="sm" variant="outline" className="h-8 rounded-lg border-amber-400/50" asChild>
                  <Link href={faqProjectHref(projectKey)}>Réindexer depuis la FAQ</Link>
                </Button>
              </div>
            ) : null}

            {/* Aperçus récents */}
            <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-12">
              <div className="min-w-0 xl:col-span-4">
                <ProjectHubResourcePanel
                  title="FAQ récente"
                  description="Dernières questions du corpus"
                  icon={Icons.faq}
                  accent="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400"
                  iconTone="border-orange-400/30 bg-orange-500/10 text-orange-600 dark:border-orange-400/25 dark:bg-orange-500/15 dark:text-orange-300"
                  emptyTitle="Aucune question"
                  emptyDescription={
                    canManageFaqCorpus
                      ? 'Ajoutez des entrées FAQ pour alimenter l’aide contextuelle du SDK.'
                      : 'Aucune entrée FAQ n’a encore été publiée pour ce projet.'
                  }
                  actionHref={faqProjectHref(projectKey)}
                  actionLabel={
                    faqHasItems
                      ? canManageFaqCorpus
                        ? 'Gérer le corpus FAQ'
                        : 'Voir le corpus FAQ'
                      : canManageFaqCorpus
                        ? 'Ajouter une question'
                        : 'Voir le corpus FAQ'
                  }
                  actionIntent={canManageFaqCorpus && !faqHasItems ? 'create' : 'navigate'}
                  isEmpty={!faqHasItems}
                >
                  {overview.recentFaqItems.map((item) => (
                    <ProjectHubResourceItem key={item.id} title={item.question} />
                  ))}
                </ProjectHubResourcePanel>
              </div>

              <div className="min-w-0 xl:col-span-4">
                <ProjectHubResourcePanel
                  title="Parcours récents"
                  description="Tours contextuels liés au flowVersion"
                  icon={Icons.tours}
                  accent="bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-500"
                  iconTone="border-sky-400/30 bg-sky-500/10 text-sky-600 dark:border-sky-400/25 dark:bg-sky-500/15 dark:text-sky-300"
                  emptyTitle="Aucun parcours"
                  emptyDescription="Créez un parcours manuel ou publiez-en un depuis le SDK pour ce projet."
                  actionHref={toursHaveItems ? faqProjectToursHref(projectKey) : tourCreateLink}
                  actionLabel={
                    toursHaveItems
                      ? 'Voir tous les parcours'
                      : canCreateTour
                        ? 'Créer un parcours'
                        : 'Voir les parcours'
                  }
                  actionIntent={toursHaveItems || !canCreateTour ? 'navigate' : 'create'}
                  isEmpty={!toursHaveItems}
                >
                  {overview.recentTours.map((tour) => (
                    <ProjectHubTourItem key={tour.id} tour={tour} />
                  ))}
                </ProjectHubResourcePanel>
              </div>

              <div className="min-w-0 xl:col-span-4">
                <ProjectHubResourcePanel
                  title="Blueprints"
                  description={
                    canManageBp
                      ? 'Modèles de génération contextualisés'
                      : 'Modèles métier du projet (lecture seule)'
                  }
                  icon={Icons.blueprints}
                  accent="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"
                  iconTone="border-violet-400/30 bg-violet-500/10 text-violet-600 dark:border-violet-400/25 dark:bg-violet-500/15 dark:text-violet-300"
                  emptyTitle="Aucun blueprint"
                  emptyDescription={
                    canManageBp
                      ? 'Créez un blueprint métier rattaché à ce projet SDK.'
                      : 'Les blueprints sont configurés par votre administrateur pour ce projet.'
                  }
                  actionHref={
                    canManageBp && !blueprintsHaveItems && !isDefault
                      ? blueprintCreateHref
                      : blueprintProjectHref(projectKey)
                  }
                  actionLabel={
                    blueprintsHaveItems
                      ? canManageBp
                        ? 'Voir les blueprints'
                        : 'Consulter les blueprints'
                      : canManageBp && !isDefault
                        ? 'Nouveau blueprint'
                        : 'Consulter les blueprints'
                  }
                  actionIntent={canManageBp && !blueprintsHaveItems && !isDefault ? 'create' : 'navigate'}
                  isEmpty={!blueprintsHaveItems}
                >
                  {overview.recentBlueprints.map((bp) => (
                    <ProjectHubResourceItem
                      key={bp.id}
                      title={bp.name}
                      subtitle={bp.blueprintId}
                      badge={
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                            bp.isPublished
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                          )}
                        >
                          {bp.isPublished ? 'Publié' : 'Brouillon'}
                        </span>
                      }
                    />
                  ))}
                </ProjectHubResourcePanel>
              </div>
            </div>

            {!isDefault && !blueprintsHaveItems && canManageBp ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button className={PHOENIX_PRIMARY_BUTTON_CLASS} asChild>
                  <Link href={blueprintCreateHref}>
                    <Icons.plus className="mr-2 h-4 w-4" />
                    Nouveau blueprint
                  </Link>
                </Button>
              </div>
            ) : null}
          </>
        ) : null}

        {!loading && !overview ? (
          <div className="rounded-2xl border border-dashed border-orange-300/40 bg-white/80 px-6 py-12 text-center dark:border-orange-400/25 dark:bg-slate-900/40">
            <p className="text-sm text-slate-500 dark:text-slate-400">Projet introuvable ou inaccessible.</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href={projectsIndexHref()}>Retour aux projets</Link>
            </Button>
          </div>
        ) : null}

        <ProjectScopeDeleteModal
          projectKey={deleteScopeOpen ? projectKey : null}
          open={deleteScopeOpen}
          onClose={() => setDeleteScopeOpen(false)}
          onDeleted={async () => {
            toast.success('Scope projet supprimé (FAQ, parcours et blueprints)');
            router.push(projectsIndexHref());
          }}
        />
      </div>
    </RoleRouteGuard>
  );
}
