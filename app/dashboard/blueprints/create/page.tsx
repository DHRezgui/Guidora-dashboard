'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icons } from '@/components/ui/icons';
import {
	getErrorMessage,
	journeyBlueprintService,
	type JourneyBlueprintCatalog,
	type OrganizationJourneyBlueprintRow,
} from '@/lib/api';
import { authService } from '@/lib/api';
import { toast } from 'sonner';
import { BlueprintForm } from '../_components/blueprint-form';
import { PhoenixCollapsibleCard } from '../_components/phoenix-collapsible';
import { LAB_INLINE_CODE_HIGHLIGHT_CLASS } from '../../sdk-tests/lab-shared';
import {
	blueprintFormFromRow,
	blueprintStepAnchorId,
	buildPayloadFromForm,
	createEmptyBlueprintForm,
	type BlueprintFormState,
} from '../blueprint-shared';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';
import { canManageBlueprints, getDashboardRole } from '@/lib/dashboard-roles';
import { canModifyBlueprint, canPublishBlueprint } from '@/lib/blueprint-permissions';
import { useBlueprintEditLock } from '@/lib/use-blueprint-edit-lock';
import { TourEditLockScreen } from '@/components/tours/TourEditLockScreen';
import { DEFAULT_FAQ_PROJECT_KEY } from '@/lib/faq-project';
import { PHOENIX_FIELD_CLASS, PHOENIX_INSET_PANEL_CLASS, PHOENIX_LABEL_CLASS } from '../blueprint-shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateBlueprintPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const rowId = searchParams.get('id');
	const createProjectKey = searchParams.get('projectKey')?.trim() || '';
	const stepQuery = searchParams.get('step');
	const scrollToStepIndex = useMemo(() => {
		if (stepQuery == null || stepQuery === '') return null;
		const n = parseInt(stepQuery, 10);
		return Number.isFinite(n) && n >= 0 ? n : null;
	}, [stepQuery]);
	const isEditMode = useMemo(() => Boolean(rowId), [rowId]);

	const user = authService.getUser();
	const userId = user?.id;
	const role = getDashboardRole(user);
	const canManage = canManageBlueprints(role);

	const [catalog, setCatalog] = useState<JourneyBlueprintCatalog | null>(null);
	const [loadedRow, setLoadedRow] = useState<OrganizationJourneyBlueprintRow | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [publishOnSave, setPublishOnSave] = useState(false);
	const [tipsOpen, setTipsOpen] = useState(false);
	const [sdkInfoOpen, setSdkInfoOpen] = useState(false);
	const [form, setForm] = useState<BlueprintFormState>(createEmptyBlueprintForm);
	const [projectKeyValue, setProjectKeyValue] = useState(
		createProjectKey || DEFAULT_FAQ_PROJECT_KEY,
	);

	const canModifyLoaded = loadedRow ? canModifyBlueprint(loadedRow, user) : canManage;

	const { editLock, lockBlocked, lockMessage, isAcquiring, retryAcquire } = useBlueprintEditLock({
		rowId: isEditMode ? rowId : null,
		row: loadedRow,
		enabled: isEditMode && canModifyLoaded,
	});

	const canPublishLoaded = useMemo(() => {
		if (!loadedRow) {
			return canManage;
		}
		return canPublishBlueprint(
			{ ...loadedRow, editLock: editLock ?? loadedRow.editLock },
			user,
		);
	}, [canManage, editLock, loadedRow, userId, user?.role]);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			if (!canManage && !isEditMode) {
				router.replace('/dashboard/blueprints');
				return;
			}

			const [catalogRes, listRes] = await Promise.all([
				journeyBlueprintService.getCatalog(),
				isEditMode ? journeyBlueprintService.listManage() : Promise.resolve(null),
			]);
			setCatalog(catalogRes.catalog);

			if (isEditMode && rowId && listRes) {
				const row = listRes.blueprints.find((b) => b.id === rowId);
				if (!row) {
					toast.error('Blueprint introuvable');
					router.replace('/dashboard/blueprints');
					return;
				}
				setLoadedRow(row);
				if (!canModifyBlueprint(row, user)) {
					toast.error('Vous n\'avez pas les droits de modification sur ce blueprint');
					router.replace('/dashboard/blueprints');
					return;
				}
				setPublishOnSave(row.isPublished);
				setForm(blueprintFormFromRow(row));
				setProjectKeyValue(row.projectKey?.trim() || DEFAULT_FAQ_PROJECT_KEY);
			}
		} catch (err) {
			toast.error(getErrorMessage(err, 'Impossible de charger le blueprint'));
			if (isEditMode) {
				router.replace('/dashboard/blueprints');
			}
		} finally {
			setLoading(false);
		}
	}, [canManage, isEditMode, rowId, router, userId, user?.role]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		if (loading || scrollToStepIndex === null || !isEditMode) return;
		if (scrollToStepIndex >= form.steps.length) return;

		const timer = window.setTimeout(() => {
			const el = document.getElementById(blueprintStepAnchorId(scrollToStepIndex));
			el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 150);

		return () => window.clearTimeout(timer);
	}, [loading, scrollToStepIndex, isEditMode, form.steps.length]);

	const handleSave = async () => {
		if (!canModifyLoaded) {
			toast.error('Vous n\'avez pas les droits de modification sur ce blueprint');
			return;
		}
		if (publishOnSave && loadedRow && !canPublishLoaded) {
			toast.error('Vous n\'avez pas les droits de publication sur ce blueprint');
			return;
		}
		setSaving(true);
		const blueprint = buildPayloadFromForm(form);
		const normalizedProjectKey = projectKeyValue.trim() || DEFAULT_FAQ_PROJECT_KEY;
		try {
			if (isEditMode && rowId) {
				await journeyBlueprintService.update(rowId, {
					blueprint,
					isPublished: publishOnSave,
					projectKey: normalizedProjectKey,
				});
				toast.success('Blueprint mis à jour');
			} else {
				await journeyBlueprintService.create({
					blueprint,
					isPublished: publishOnSave,
					projectKey: normalizedProjectKey,
				});
				toast.success('Blueprint créé');
			}
			const redirectKey =
				normalizedProjectKey !== DEFAULT_FAQ_PROJECT_KEY ? normalizedProjectKey : createProjectKey;
			router.push(
				redirectKey
					? `/dashboard/blueprints?projectKey=${encodeURIComponent(redirectKey)}`
					: '/dashboard/blueprints',
			);
		} catch (err) {
			toast.error(getErrorMessage(err, 'Enregistrement échoué'));
		} finally {
			setSaving(false);
		}
	};

	const showInitialLoader = loading || (isEditMode && canModifyLoaded && isAcquiring);

	if (showInitialLoader) {
		return (
			<RoleRouteGuard access="blueprints">
				<div className="flex items-center justify-center py-24">
					<Icons.spinner className="h-6 w-6 animate-spin text-orange-500" />
					<span className="ml-3 text-sm text-slate-600 dark:text-slate-400">Chargement…</span>
				</div>
			</RoleRouteGuard>
		);
	}

	if (isEditMode && canModifyLoaded && lockBlocked && lockMessage) {
		return (
			<RoleRouteGuard access="blueprints">
				<TourEditLockScreen
					tourName={loadedRow?.blueprintId}
					message={lockMessage}
					heldByDisplayName={loadedRow?.editLock?.heldByDisplayName}
					onBack={() => router.push('/dashboard/blueprints')}
					onRetry={() => void retryAcquire()}
					isRetrying={isAcquiring}
				/>
			</RoleRouteGuard>
		);
	}

	return (
		<RoleRouteGuard access="blueprints">
		<div className="relative space-y-6">
			<div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
				<div className="absolute -left-16 top-4 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />
				<div className="absolute right-[-60px] top-24 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
			</div>

			<div>
				<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
					{isEditMode ? 'Modifier le blueprint' : 'Nouveau blueprint'}
				</h1>
				<p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
					Définissez le contexte métier et les étapes du modèle de parcours pour votre organisation.
				</p>
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

			<div className={PHOENIX_INSET_PANEL_CLASS}>
				<div className="space-y-2">
					<Label htmlFor="bp-project-key" className={PHOENIX_LABEL_CLASS}>
						Projet SDK (flowVersion)
					</Label>
					<Input
						id="bp-project-key"
						value={projectKeyValue}
						disabled={!canModifyLoaded}
						onChange={(e) => setProjectKeyValue(e.target.value)}
						placeholder="test-11-v1"
						className={PHOENIX_FIELD_CLASS}
					/>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						Utilisez <code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>default</code> pour le corpus
						générique, ou la même clé que{' '}
						<code className={LAB_INLINE_CODE_HIGHLIGHT_CLASS}>contextualSuggestions.flowVersion</code> dans le
						SDK.
					</p>
				</div>
			</div>

			<BlueprintForm
				isEditMode={isEditMode}
				readOnly={!canModifyLoaded}
				canPublishOnSave={canPublishLoaded}
				userRole={user?.role}
				catalog={catalog}
				form={form}
				setForm={setForm}
				publishOnSave={publishOnSave}
				setPublishOnSave={setPublishOnSave}
				saving={saving}
				onSave={() => void handleSave()}
				onCancel={() => router.push('/dashboard/blueprints')}
			/>
		</div>
		</RoleRouteGuard>
	);
}
