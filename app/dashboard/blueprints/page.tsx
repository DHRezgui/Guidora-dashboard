'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const BLUEPRINTS_PAGE_SIZE = 4;
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import {
	getErrorMessage,
	journeyBlueprintService,
	type JourneyBlueprintCatalog,
	type OrganizationJourneyBlueprintRow,
} from '@/lib/api';
import { authService } from '@/lib/api';
import { toast } from 'sonner';
import { LAB_INLINE_CODE_HIGHLIGHT_CLASS } from '../sdk-tests/lab-shared';
import { BlueprintListCard } from './_components/blueprint-list-card';
import { BlueprintStepsModal } from './_components/blueprint-steps-modal';
import { PhoenixCollapsibleCard } from './_components/phoenix-collapsible';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';
import { canManageBlueprints, getDashboardRole } from '@/lib/dashboard-roles';
import { DEFAULT_FAQ_PROJECT_KEY } from '@/lib/faq-project';
import {
  formatProjectTitle,
  projectHubHref,
} from '@/lib/project';
import {
	canDeleteBlueprint,
	canManageBlueprintSharing,
	canModifyBlueprint,
	canPublishBlueprint,
} from '@/lib/blueprint-permissions';
import { blueprintDisplayMeta, PHOENIX_FIELD_CLASS, PHOENIX_INSET_PANEL_CLASS } from './blueprint-shared';
import { cn } from '@/lib/utils';
import { CatalogListPagination } from '@/components/dashboard/catalog-list-pagination';

type BlueprintStatusFilter = 'all' | 'published' | 'draft';

const BLUEPRINT_STATUS_FILTER_OPTIONS: Array<{ value: BlueprintStatusFilter; label: string }> = [
	{ value: 'all', label: 'Tous' },
	{ value: 'published', label: 'Publiés' },
	{ value: 'draft', label: 'Brouillons' },
];

function matchesBlueprintListFilter(
	row: OrganizationJourneyBlueprintRow,
	query: string,
	statusFilter: BlueprintStatusFilter,
): boolean {
	if (statusFilter === 'published' && !row.isPublished) {
		return false;
	}
	if (statusFilter === 'draft' && row.isPublished) {
		return false;
	}
	if (!query) {
		return true;
	}
	const meta = blueprintDisplayMeta(row);
	const projectKey = row.projectKey?.trim() || DEFAULT_FAQ_PROJECT_KEY;
	const haystack = [
		row.blueprintId,
		row.vertical,
		meta.name,
		meta.description,
		meta.intent,
		projectKey,
		formatProjectTitle(projectKey),
	]
		.join(' ')
		.toLowerCase();
	return haystack.includes(query);
}

export default function BlueprintsPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const projectKeyFilter = useMemo(
		() => searchParams.get('projectKey')?.trim() || '',
		[searchParams],
	);
	const user = authService.getUser();
	const role = getDashboardRole(user);
	const canManage = canManageBlueprints(role);

	const [catalog, setCatalog] = useState<JourneyBlueprintCatalog | null>(null);
	const [rows, setRows] = useState<OrganizationJourneyBlueprintRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [tipsOpen, setTipsOpen] = useState(false);
	const [sdkInfoOpen, setSdkInfoOpen] = useState(false);
	const [stepsBlueprint, setStepsBlueprint] = useState<OrganizationJourneyBlueprintRow | null>(null);
	const [listPage, setListPage] = useState(1);
	const [filterQuery, setFilterQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<BlueprintStatusFilter>('all');

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [catalogRes, listRes] = await Promise.all([
				journeyBlueprintService.getCatalog(),
				journeyBlueprintService.listManage(projectKeyFilter || undefined),
			]);
			setCatalog(catalogRes.catalog);
			setRows(listRes.blueprints);
		} catch (err) {
			toast.error(getErrorMessage(err, 'Impossible de charger les blueprints'));
		} finally {
			setLoading(false);
		}
	}, [projectKeyFilter]);

	useEffect(() => {
		void load();
	}, [load, projectKeyFilter]);

	const handleTogglePublish = async (row: OrganizationJourneyBlueprintRow) => {
		if (!canPublishBlueprint(row, user)) return;
		try {
			await journeyBlueprintService.setPublished(row.id, !row.isPublished);
			toast.success(row.isPublished ? 'Blueprint dépublié' : 'Blueprint publié');
			await load();
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	};

	const handleDelete = async (row: OrganizationJourneyBlueprintRow) => {
		if (!canDeleteBlueprint(row, user)) return;
		if (!window.confirm(`Supprimer le blueprint "${row.blueprintId}" ?`)) return;
		try {
			await journeyBlueprintService.remove(row.id);
			toast.success('Blueprint supprimé');
			await load();
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	};

	const verticals = catalog?.verticals ?? [];
	const intents = catalog?.intents ?? [];

	const filteredRows = useMemo(() => {
		const query = filterQuery.trim().toLowerCase();
		return rows.filter((row) => matchesBlueprintListFilter(row, query, statusFilter));
	}, [rows, filterQuery, statusFilter]);

	const hasActiveFilters = Boolean(filterQuery.trim()) || statusFilter !== 'all';

	useEffect(() => {
		setListPage(1);
	}, [filterQuery, statusFilter, rows.length, projectKeyFilter]);

	const blueprintsTotalPages = Math.max(1, Math.ceil(filteredRows.length / BLUEPRINTS_PAGE_SIZE));
	const safeListPage = Math.min(listPage, blueprintsTotalPages);

	const paginatedRows = useMemo(() => {
		const start = (safeListPage - 1) * BLUEPRINTS_PAGE_SIZE;
		return filteredRows.slice(start, start + BLUEPRINTS_PAGE_SIZE);
	}, [filteredRows, safeListPage]);

	const paginatedRangeLabel = useMemo(() => {
		if (filteredRows.length === 0) return '';
		const start = (safeListPage - 1) * BLUEPRINTS_PAGE_SIZE + 1;
		const end = Math.min(safeListPage * BLUEPRINTS_PAGE_SIZE, filteredRows.length);
		return `${start}–${end} sur ${filteredRows.length}`;
	}, [filteredRows.length, safeListPage]);

	return (
		<RoleRouteGuard access="blueprints">
		<div className="relative space-y-6">
			<div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
				<div className="absolute -left-16 top-4 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />
				<div className="absolute right-[-60px] top-24 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
			</div>

			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Blueprints métier</h1>
					<p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
						{canManage
							? 'Configurez des blueprints personnalisés pour votre organisation afin d\'enrichir les suggestions du SDK'
							: 'Consultez les blueprints de votre organisation (lecture seule).'}
					</p>
				</div>
				{canManage && (
					<Button className="rounded-xl shadow-soft transition-transform hover:scale-105" asChild>
						<Link
							href={
								projectKeyFilter
									? `/dashboard/blueprints/create?projectKey=${encodeURIComponent(projectKeyFilter)}`
									: '/dashboard/blueprints/create'
							}
						>
							<Icons.plus className="mr-2 h-4 w-4" />
							Nouveau blueprint
						</Link>
					</Button>
				)}
			</div>

			{projectKeyFilter ? (
				<div className="rounded-2xl border border-violet-300/55 bg-gradient-to-r from-violet-50/90 to-white/90 px-4 py-3 shadow-sm dark:border-violet-400/25 dark:from-violet-500/10 dark:to-slate-900/60">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex min-w-0 items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
							<Icons.blueprints className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
							<span>
								Blueprints du projet{' '}
								<strong className="font-semibold">{formatProjectTitle(projectKeyFilter)}</strong>
								<span className="ml-1 font-mono text-xs text-violet-700/90 dark:text-violet-200/80">
									({projectKeyFilter})
								</span>
							</span>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
								<Link href={projectHubHref(projectKeyFilter)}>Hub projet</Link>
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 rounded-lg"
								onClick={() => router.push('/dashboard/blueprints')}
							>
								Effacer le filtre
							</Button>
						</div>
					</div>
				</div>
			) : null}

			<div className="grid gap-3 sm:grid-cols-3">
				{[
					{
						label: 'Catalogue verticals',
						value: verticals.length,
						icon: Icons.verticalCatalog,
						tone: 'from-cyan-100 to-white dark:from-cyan-500/20 dark:to-slate-900/70',
					},
					{
						label: 'Intents',
						value: intents.length,
						icon: Icons.intent,
						tone: 'from-purple-100 to-white dark:from-purple-600/20 dark:to-slate-900/70',
					},
					{
						label: 'Blueprints org',
						value: rows.length,
						icon: Icons.blueprints,
						tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70',
					},
				].map((item) => {
					const Icon = item.icon;
					return (
						<div
							key={item.label}
							className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${item.tone} min-h-[96px] p-4 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm dark:border-white/10 dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]`}
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
					description="Quelques repères avant de créer ou publier un blueprint."
					open={tipsOpen}
					onOpenChange={setTipsOpen}
				>
					<div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
						<p>• Un blueprint décrit un parcours type : étapes, intention et contexte métier (vertical).</p>
						<p>• Alignez le vertical avec votre produit (ex. SaaS, fintech) pour de meilleures suggestions.</p>
						<p>
							• Activez <strong className="font-medium text-slate-900 dark:text-white">Publier</strong>{' '}
							seulement quand le modèle est prêt : seuls les blueprints publiés sont pris en compte.
						</p>
						<p>• Vos blueprints complètent les modèles déjà présents dans le SDK ; ils ne les remplacent pas.</p>
						{!canManage ? (
							<p>• En tant que développeur, vous pouvez consulter les blueprints existants sans les modifier.</p>
						) : null}
					</div>
				</PhoenixCollapsibleCard>

				<PhoenixCollapsibleCard
					title="Intégration SDK"
					description="Référence technique pour connecter les blueprints publiés au SDK."
					open={sdkInfoOpen}
					onOpenChange={setSdkInfoOpen}
				>
					<div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
						<p>
							Dans la configuration du SDK, activer{' '}
							<code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>journeyBlueprintsRemoteEnabled</code> et{' '}
							<code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>publishConfig</code> dans{' '}
							<code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>contextualSuggestions</code>.
						</p>
						<p>
							Les rôles sémantiques doivent figurer dans le catalogue SDK ; le{' '}
							<code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>vertical</code> doit correspondre à{' '}
							<code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>journeyVerticals</code> en mode auto.
						</p>
					</div>
				</PhoenixCollapsibleCard>
			</div>

			<section className="space-y-4">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
							Blueprints de l&apos;organisation
						</h2>
						<p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
							{loading ? 'Chargement…' : `${rows.length} modèle${rows.length !== 1 ? 's' : ''} enregistré${rows.length !== 1 ? 's' : ''}`}
						</p>
					</div>
				</div>

				{loading && (
					<div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900/40 py-16 backdrop-blur-xl">
						<Icons.spinner className="h-6 w-6 animate-spin text-orange-400" />
						<span className="ml-3 text-sm text-slate-400">Chargement des blueprints…</span>
					</div>
				)}

				{!loading && rows.length === 0 && (
					<div className="relative overflow-hidden rounded-2xl border border-dashed border-orange-400/25 bg-gradient-to-br from-orange-500/[0.06] via-slate-900/50 to-pink-500/[0.05] px-6 py-14 text-center backdrop-blur-xl">
						<div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-orange-500/15 blur-3xl" />
						<div className="relative">
							<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
								<Icons.blueprints className="h-7 w-7 text-orange-300" />
							</div>
							<p className="text-lg font-semibold text-slate-900 dark:text-white">Aucun blueprint pour le moment</p>
							<p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
								{canManage
									? 'Créez un modèle de parcours métier pour enrichir les suggestions du SDK.'
									: 'Aucun blueprint n\'a encore été créé pour votre organisation.'}
							</p>
							{canManage && (
								<Button
									className="mt-6 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 shadow-[0_0_24px_rgba(249,115,22,0.35)] transition-transform hover:scale-105"
									asChild
								>
									<Link
										href={
											projectKeyFilter
												? `/dashboard/blueprints/create?projectKey=${encodeURIComponent(projectKeyFilter)}`
												: '/dashboard/blueprints/create'
										}
									>
										<Icons.plus className="mr-2 h-4 w-4" />
										Créer un blueprint
									</Link>
								</Button>
							)}
						</div>
					</div>
				)}

				{!loading && rows.length > 0 && (
					<>
						<div className={cn(PHOENIX_INSET_PANEL_CLASS, 'p-4')}>
							<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
								<div className="relative min-w-0 flex-1">
									<Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
									<Input
										placeholder="Rechercher par nom, identifiant, vertical, intent ou projet…"
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
									{BLUEPRINT_STATUS_FILTER_OPTIONS.map((option) => (
										<button
											key={option.value}
											type="button"
											onClick={() => setStatusFilter(option.value)}
											className={cn(
												'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
												statusFilter === option.value
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

						{filteredRows.length === 0 ? (
							<div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300/70 bg-slate-50/40 px-6 py-12 text-center dark:border-white/20 dark:bg-slate-900/25">
								<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-slate-900/60">
									<Icons.filter className="h-6 w-6 text-slate-400" />
								</div>
								<p className="text-base font-semibold text-slate-900 dark:text-white">
									Aucun blueprint ne correspond aux filtres
								</p>
								<p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
									Effacez la recherche ou sélectionnez un autre statut.
								</p>
							</div>
						) : (
							<div className="space-y-4">
								<div
									className="rounded-2xl border-2 border-dashed border-slate-300/70 bg-slate-50/40 p-5 dark:border-white/20 dark:bg-slate-900/25"
									aria-label="Catalogue des blueprints de l'organisation"
								>
									<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-slate-300/50 pb-3 dark:border-white/15">
										<p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
											Blueprints — page {safeListPage}
										</p>
										<p className="text-sm text-slate-600 dark:text-slate-300">
											{paginatedRangeLabel} blueprint{filteredRows.length !== 1 ? 's' : ''}
											{hasActiveFilters ? ` (filtré sur ${rows.length})` : ''}
										</p>
									</div>
									<div className="grid gap-4 sm:grid-cols-2">
										{paginatedRows.map((row) => (
											<BlueprintListCard
												key={row.id}
												row={row}
												showProjectKey={!projectKeyFilter}
												canModify={canModifyBlueprint(row, user)}
												canPublish={canPublishBlueprint(row, user)}
												canManageSharing={canManageBlueprintSharing(row, user)}
												canDelete={canDeleteBlueprint(row, user)}
												ownerUserId={user?.id}
												onTogglePublish={(r) => void handleTogglePublish(r)}
												onDelete={(r) => void handleDelete(r)}
												onShowSteps={setStepsBlueprint}
												onGrantsUpdated={load}
											/>
										))}
									</div>
								</div>
								<CatalogListPagination
									totalItems={filteredRows.length}
									pageSize={BLUEPRINTS_PAGE_SIZE}
									currentPage={safeListPage}
									totalPages={blueprintsTotalPages}
									onPrevious={() => setListPage((prev) => Math.max(1, prev - 1))}
									onNext={() => setListPage((prev) => Math.min(blueprintsTotalPages, prev + 1))}
									itemLabel="blueprint"
								/>
							</div>
						)}
					</>
				)}
			</section>

			{stepsBlueprint ? (
				<BlueprintStepsModal
					row={stepsBlueprint}
					canEdit={canModifyBlueprint(stepsBlueprint, user)}
					onClose={() => setStepsBlueprint(null)}
				/>
			) : null}
		</div>
		</RoleRouteGuard>
	);
}
