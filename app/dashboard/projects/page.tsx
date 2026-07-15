'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';
import { PhoenixCollapsibleCard } from '@/app/dashboard/blueprints/_components/phoenix-collapsible';
import {
  PHOENIX_FIELD_CLASS,
  PHOENIX_INSET_PANEL_CLASS,
  PHOENIX_LABEL_CLASS,
  PHOENIX_PANEL_CLASS,
} from '@/app/dashboard/blueprints/blueprint-shared';
import { LAB_INLINE_CODE_HIGHLIGHT_CLASS } from '@/app/dashboard/sdk-tests/lab-shared';
import { authService, faqService, getErrorMessage, projectService } from '@/lib/api';
import { canManageFaq, canManageProjectScope, getDashboardRole } from '@/lib/dashboard-roles';
import {
  DEFAULT_FAQ_PROJECT_KEY,
  formatProjectTitle,
  projectHubHref,
} from '@/lib/project';
import { PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ProjectHubCard } from './_components/project-hub-card';
import { ProjectScopeDeleteModal } from './_components/project-scope-delete-modal';
import { CatalogListPagination } from '@/components/dashboard/catalog-list-pagination';

const PROJECTS_PAGE_SIZE = 4;

type ProjectRow = {
  projectKey: string;
  faqCount: number;
  tourCount: number;
  blueprintCount: number;
};

type ProjectTypeFilter = 'all' | 'sdk' | 'generic';

const PROJECT_TYPE_FILTER_OPTIONS: Array<{ value: ProjectTypeFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'sdk', label: 'Paquets SDK' },
  { value: 'generic', label: 'Générique' },
];

function sortProjects(projects: ProjectRow[]): ProjectRow[] {
  return [...projects].sort((a, b) => {
    if (a.projectKey === DEFAULT_FAQ_PROJECT_KEY) return -1;
    if (b.projectKey === DEFAULT_FAQ_PROJECT_KEY) return 1;
    return a.projectKey.localeCompare(b.projectKey);
  });
}

export default function ProjectsIndexPage() {
  const router = useRouter();
  const canManage = canManageFaq(getDashboardRole(authService.getUser()));
  const canDeleteScope = canManageProjectScope(getDashboardRole(authService.getUser()));
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [newProjectKey, setNewProjectKey] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [sdkInfoOpen, setSdkInfoOpen] = useState(false);
  const [deleteScopeKey, setDeleteScopeKey] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProjectTypeFilter>('all');
  const [listPage, setListPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await projectService.list();
      setProjects(sortProjects(response.projects ?? []));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de charger les projets'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sdkProjects = useMemo(
    () => projects.filter((p) => p.projectKey !== DEFAULT_FAQ_PROJECT_KEY),
    [projects],
  );

  const totals = useMemo(
    () =>
      projects.reduce(
        (acc, project) => ({
          faq: acc.faq + project.faqCount,
          tours: acc.tours + project.tourCount,
          blueprints: acc.blueprints + project.blueprintCount,
        }),
        { faq: 0, tours: 0, blueprints: 0 },
      ),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    return projects.filter((project) => {
      if (typeFilter === 'generic' && project.projectKey !== DEFAULT_FAQ_PROJECT_KEY) {
        return false;
      }
      if (typeFilter === 'sdk' && project.projectKey === DEFAULT_FAQ_PROJECT_KEY) {
        return false;
      }
      if (!query) {
        return true;
      }
      const title = formatProjectTitle(project.projectKey).toLowerCase();
      return (
        project.projectKey.toLowerCase().includes(query) ||
        title.includes(query)
      );
    });
  }, [projects, filterQuery, typeFilter]);

  const hasActiveFilters = Boolean(filterQuery.trim()) || typeFilter !== 'all';

  useEffect(() => {
    setListPage(1);
  }, [filterQuery, typeFilter, projects.length]);

  const projectsTotalPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PAGE_SIZE));
  const safeListPage = Math.min(listPage, projectsTotalPages);

  const paginatedProjects = useMemo(() => {
    const start = (safeListPage - 1) * PROJECTS_PAGE_SIZE;
    return filteredProjects.slice(start, start + PROJECTS_PAGE_SIZE);
  }, [filteredProjects, safeListPage]);

  const paginatedRangeLabel = useMemo(() => {
    if (filteredProjects.length === 0) return '';
    const start = (safeListPage - 1) * PROJECTS_PAGE_SIZE + 1;
    const end = Math.min(safeListPage * PROJECTS_PAGE_SIZE, filteredProjects.length);
    return `${start}–${end} sur ${filteredProjects.length}`;
  }, [filteredProjects.length, safeListPage]);

  const createProject = async () => {
    const key = newProjectKey.trim();
    if (!key || creatingProject) return;
    setCreatingProject(true);
    try {
      await faqService.registerProject(key);
      setNewProjectKey('');
      await load();
      toast.success(`Projet ${key} créé`);
      router.push(projectHubHref(key));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de créer le projet'));
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <RoleRouteGuard access="projects">
      <div className="relative space-y-6">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-16 top-4 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute right-[-60px] top-24 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Projets SDK</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              Hub central par application hôte : FAQ, parcours contextuels et blueprints partagent le même{' '}
              <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>flowVersion</code>.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Projets',
              value: projects.length,
              icon: Icons.grid,
              tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70',
            },
            {
              label: 'Paquets SDK',
              value: sdkProjects.length,
              icon: Icons.code,
              tone: 'from-cyan-100 to-white dark:from-cyan-500/20 dark:to-slate-900/70',
            },
            {
              label: 'Parcours liés',
              value: totals.tours,
              icon: Icons.tours,
              tone: 'from-sky-100 to-white dark:from-sky-500/20 dark:to-slate-900/70',
            },
            {
              label: 'Blueprints',
              value: totals.blueprints,
              icon: Icons.blueprints,
              tone: 'from-violet-100 to-white dark:from-violet-500/20 dark:to-slate-900/70',
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
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
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
            description="Comment structurer vos projets d’onboarding."
            open={tipsOpen}
            onOpenChange={setTipsOpen}
          >
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p>
                • Un <strong className="font-medium text-slate-900 dark:text-white">projet SDK</strong> regroupe
                l’aide, les parcours générés et les blueprints d’une même application hôte.
              </p>
              <p>
                • Utilisez le même identifiant que le{' '}
                <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>flowVersion</code> dans votre intégration React.
              </p>
              <p>
                • Le corpus <strong className="font-medium text-slate-900 dark:text-white">générique</strong> reste
                disponible pour l’aide transversale sans version SDK spécifique.
              </p>
              <p>• Publiez un parcours contextuel depuis le SDK pour enregistrer automatiquement un nouveau projet.</p>
            </div>
          </PhoenixCollapsibleCard>

          <PhoenixCollapsibleCard
            title="Intégration SDK"
            description="Comment le runtime résout le bon projet."
            open={sdkInfoOpen}
            onOpenChange={setSdkInfoOpen}
          >
            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p>
                Le SDK dérive le projet depuis{' '}
                <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>contextualSuggestions.flowVersion</code> pour la
                FAQ, les parcours actifs et les blueprints distants.
              </p>
              <p>
                Exemple : <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>flowVersion: &apos;test-11-v1&apos;</code>{' '}
                charge uniquement les ressources du paquet <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>test-11-v1</code>.
              </p>
            </div>
          </PhoenixCollapsibleCard>
        </div>

        {canManage ? (
          <Card className={cn(PHOENIX_PANEL_CLASS, 'overflow-hidden')}>
            <CardContent className="p-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Créer un projet SDK</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Enregistrez un paquet lié à une application hôte via son identifiant{' '}
                  <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>flowVersion</code>.
                </p>
              </div>
              <div className={cn(PHOENIX_INSET_PANEL_CLASS, 'mt-4')}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-[220px] flex-1">
                    <Label htmlFor="new-project-key" className={PHOENIX_LABEL_CLASS}>
                      Identifiant projet
                    </Label>
                    <Input
                      id="new-project-key"
                      className={cn('mt-1.5', PHOENIX_FIELD_CLASS)}
                      placeholder="ex. test-11-v1"
                      value={newProjectKey}
                      onChange={(e) => setNewProjectKey(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void createProject();
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Catalogue des projets</h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {loading
                ? 'Chargement…'
                : `${projects.length} projet${projects.length !== 1 ? 's' : ''} · ${totals.faq} question${totals.faq !== 1 ? 's' : ''} FAQ · ${totals.tours} parcours · ${totals.blueprints} blueprint${totals.blueprints !== 1 ? 's' : ''}`}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900/40 py-16 backdrop-blur-xl">
              <Icons.spinner className="h-6 w-6 animate-spin text-orange-400" />
              <span className="ml-3 text-sm text-slate-400">Chargement des projets…</span>
            </div>
          ) : null}

          {!loading && projects.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-orange-400/25 bg-gradient-to-br from-orange-500/[0.06] via-slate-900/50 to-pink-500/[0.05] px-6 py-14 text-center backdrop-blur-xl">
              <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-orange-500/15 blur-3xl" />
              <div className="relative">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                  <Icons.grid className="h-7 w-7 text-orange-300" />
                </div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">Aucun projet enregistré</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  Créez un paquet SDK ou publiez un parcours contextuel depuis votre application hôte pour démarrer.
                </p>
              </div>
            </div>
          ) : null}

          {!loading && projects.length > 0 ? (
            <>
              <div className={cn(PHOENIX_INSET_PANEL_CLASS, 'p-4')}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Rechercher par identifiant ou nom de projet…"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className={cn('pl-9', PHOENIX_FIELD_CLASS, filterQuery ? 'pr-9' : undefined)}
                    />
                    {filterQuery ? (
                      <button
                        type="button"
                        onClick={() => setFilterQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
                        aria-label="Effacer la recherche"
                      >
                        <Icons.close className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <div className="flex gap-1 rounded-xl border border-slate-200/80 bg-white/60 p-1 dark:border-white/10 dark:bg-slate-900/50">
                    {PROJECT_TYPE_FILTER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTypeFilter(option.value)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                          typeFilter === option.value
                            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300/70 bg-slate-50/40 px-6 py-12 text-center dark:border-white/20 dark:bg-slate-900/25">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-slate-900/60">
                    <Icons.filter className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    Aucun projet ne correspond aux filtres
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    Effacez la recherche ou sélectionnez un autre type de projet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className="rounded-2xl border-2 border-dashed border-slate-300/70 bg-slate-50/40 p-5 dark:border-white/20 dark:bg-slate-900/25"
                    aria-label="Catalogue des projets SDK"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-slate-300/50 pb-3 dark:border-white/15">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Hubs projet — page {safeListPage}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {paginatedRangeLabel} projet{filteredProjects.length !== 1 ? 's' : ''}
                        {hasActiveFilters ? ` (filtré sur ${projects.length})` : ''}
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {paginatedProjects.map((project) => (
                        <ProjectHubCard
                          key={project.projectKey}
                          projectKey={project.projectKey}
                          faqCount={project.faqCount}
                          tourCount={project.tourCount}
                          blueprintCount={project.blueprintCount}
                          canDeleteScope={canDeleteScope}
                          onDeleteScope={() => setDeleteScopeKey(project.projectKey)}
                        />
                      ))}
                    </div>
                  </div>
                  <CatalogListPagination
                    totalItems={filteredProjects.length}
                    pageSize={PROJECTS_PAGE_SIZE}
                    currentPage={safeListPage}
                    totalPages={projectsTotalPages}
                    onPrevious={() => setListPage((prev) => Math.max(1, prev - 1))}
                    onNext={() => setListPage((prev) => Math.min(projectsTotalPages, prev + 1))}
                    itemLabel="projet"
                  />
                </div>
              )}
            </>
          ) : null}
        </section>

        <ProjectScopeDeleteModal
          projectKey={deleteScopeKey}
          open={deleteScopeKey != null}
          onClose={() => setDeleteScopeKey(null)}
          onDeleted={async () => {
            toast.success('Scope projet supprimé (FAQ, parcours et blueprints)');
            setDeleteScopeKey(null);
            await load();
          }}
        />
      </div>
    </RoleRouteGuard>
  );
}
