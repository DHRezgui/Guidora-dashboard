'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icons } from '@/components/ui/icons';
import { getErrorMessage, journeyBlueprintService, tourService } from '@/lib/api';
import type { OrganizationJourneyBlueprintRow } from '@/lib/api';
import type { User } from '@/lib/types';
import {
	grantUserIdsForBlueprintMode,
	grantUserIdsWithBothBlueprintModes,
	mergeBlueprintGrantsForBothModes,
	mergeBlueprintGrantsForMode,
	type BlueprintAccessGrant,
	type BlueprintAccessMode,
} from '@/lib/blueprint-access';
import { PHOENIX_CHECKBOX_CLASS, PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type BlueprintAccessGrantsMenuProps = {
	row: OrganizationJourneyBlueprintRow;
	ownerUserId?: string;
	onUpdated: () => void | Promise<void>;
};

type GrantModal = 'modify' | 'publish' | 'both' | null;

function formatAdminLabel(member: User): string {
	const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
	return name ? `${name} — Admin` : `${member.email} (Admin)`;
}

function AdminPickerModal({
	title,
	description,
	admins,
	loading,
	selectedIds,
	onToggle,
	onClose,
	onSubmit,
	submitting,
	excludeUserIds,
}: {
	title: string;
	description: string;
	admins: User[];
	loading: boolean;
	selectedIds: string[];
	onToggle: (id: string) => void;
	onClose: () => void;
	onSubmit: () => void;
	submitting: boolean;
	excludeUserIds: string[];
}) {
	const visible = admins.filter((a) => a.id && !excludeUserIds.includes(a.id));
	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			onClick={() => !submitting && onClose()}
		>
			<div
				className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-950"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
				<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
				<div className="mt-4 min-h-[8.5rem] max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
					{loading ? (
						<p className="py-6 text-center text-sm text-slate-500">Chargement…</p>
					) : visible.length === 0 ? (
						<p className="py-6 text-center text-sm text-slate-500">Aucun autre administrateur.</p>
					) : (
						visible.map((admin) => (
							<label
								key={admin.id}
								className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-white/5"
							>
								<Checkbox
									className={PHOENIX_CHECKBOX_CLASS}
									checked={selectedIds.includes(admin.id!)}
									onCheckedChange={() => onToggle(admin.id!)}
								/>
								<span className="text-sm text-slate-800 dark:text-slate-200">
									{formatAdminLabel(admin)}
								</span>
							</label>
						))
					)}
				</div>
				<div className="mt-5 flex justify-end gap-2">
					<Button variant="outline" disabled={submitting} onClick={onClose}>
						Annuler
					</Button>
					<Button className={PHOENIX_PRIMARY_BUTTON_CLASS} disabled={submitting} onClick={onSubmit}>
						{submitting ? 'Enregistrement…' : 'Enregistrer'}
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

export function BlueprintAccessGrantsMenu({
	row,
	ownerUserId,
	onUpdated,
}: BlueprintAccessGrantsMenuProps) {
	const [open, setOpen] = useState(false);
	const [modal, setModal] = useState<GrantModal>(null);
	const [admins, setAdmins] = useState<User[]>([]);
	const [loadingAdmins, setLoadingAdmins] = useState(false);
	const [grants, setGrants] = useState<BlueprintAccessGrant[]>([]);
	const [loadingGrants, setLoadingGrants] = useState(false);
	const [selectedModify, setSelectedModify] = useState<string[]>([]);
	const [selectedPublish, setSelectedPublish] = useState<string[]>([]);
	const [selectedBoth, setSelectedBoth] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);

	const excludeIds = useMemo(
		() => (ownerUserId ? [ownerUserId] : row.createdBy ? [row.createdBy] : []),
		[ownerUserId, row.createdBy],
	);

	const loadGrants = useCallback(async () => {
		setLoadingGrants(true);
		try {
			const res = await journeyBlueprintService.getManage(row.id);
			const loaded = (res.blueprint.accessGrants ?? []) as BlueprintAccessGrant[];
			setGrants(loaded);
			setSelectedModify(grantUserIdsForBlueprintMode(loaded, 'modify'));
			setSelectedPublish(grantUserIdsForBlueprintMode(loaded, 'publish'));
			setSelectedBoth(grantUserIdsWithBothBlueprintModes(loaded));
		} catch (err) {
			toast.error(getErrorMessage(err, 'Impossible de charger les autorisations'));
		} finally {
			setLoadingGrants(false);
		}
	}, [row.id]);

	useEffect(() => {
		if (!open && !modal) {
			return;
		}
		setLoadingAdmins(true);
		void tourService
			.getOrganizationAdmins()
			.then((res) => setAdmins(res.users ?? []))
			.catch(() => setAdmins([]))
			.finally(() => setLoadingAdmins(false));
	}, [open, modal]);

	const openModal = async (mode: GrantModal) => {
		setOpen(false);
		await loadGrants();
		setModal(mode);
	};

	const toggleSelection = (mode: BlueprintAccessMode, id: string) => {
		const setter = mode === 'modify' ? setSelectedModify : setSelectedPublish;
		setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
	};

	const submitGrants = async (mode: GrantModal) => {
		if (!mode) return;
		setSubmitting(true);
		const payload =
			mode === 'both'
				? mergeBlueprintGrantsForBothModes(grants, selectedBoth)
				: mergeBlueprintGrantsForMode(
						grants,
						mode,
						mode === 'modify' ? selectedModify : selectedPublish,
					);
		try {
			await journeyBlueprintService.setAccessGrants(row.id, payload, true);
			toast.success(
				mode === 'modify'
					? 'Autorisations de modification mises à jour'
					: mode === 'publish'
						? 'Autorisations de publication mises à jour'
						: 'Autorisations modification + publication mises à jour',
			);
			setModal(null);
			await loadGrants();
			await onUpdated();
		} catch (err) {
			toast.error(getErrorMessage(err));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<>
			<div className="relative">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="h-9 w-9 shrink-0 border-slate-300 bg-white/90 dark:border-white/15 dark:bg-slate-900/55"
					title="Gérer les autorisations"
					aria-label="Gérer les autorisations du blueprint"
					onClick={() => setOpen((v) => !v)}
				>
					<Icons.users className="h-4 w-4" />
				</Button>
				{open ? (
					<div className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-slate-950">
						<button
							type="button"
							className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10"
							onClick={() => void openModal('both')}
						>
							<Icons.admin className="h-4 w-4 text-indigo-500" />
							Déléguer modification + publication
						</button>
						<button
							type="button"
							className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10"
							onClick={() => void openModal('modify')}
						>
							<Icons.edit className="h-4 w-4 text-orange-500" />
							Déléguer modification seule
						</button>
						<button
							type="button"
							className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10"
							onClick={() => void openModal('publish')}
						>
							<Icons.checkCircle className="h-4 w-4 text-emerald-500" />
							Déléguer publication seule
						</button>
						{(row.sharingHasModify || row.sharingHasPublish) && (
							<p className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:border-white/10">
								{row.sharingHasModify ? 'Modification déléguée' : ''}
								{row.sharingHasModify && row.sharingHasPublish ? ' · ' : ''}
								{row.sharingHasPublish ? 'Publication déléguée' : ''}
							</p>
						)}
					</div>
				) : null}
			</div>

			{modal === 'modify'
				? AdminPickerModal({
						title: 'Déléguer la modification',
						description:
							'Les administrateurs sélectionnés pourront modifier ce blueprint (avec verrou d’édition).',
						admins,
						loading: loadingAdmins || loadingGrants,
						selectedIds: selectedModify,
						onToggle: (id) => toggleSelection('modify', id),
						onClose: () => !submitting && setModal(null),
						onSubmit: () => void submitGrants('modify'),
						submitting,
						excludeUserIds: excludeIds,
					})
				: null}

			{modal === 'publish'
				? AdminPickerModal({
						title: 'Déléguer la publication',
						description:
							'Les administrateurs sélectionnés pourront publier ou dépublier ce blueprint depuis la liste.',
						admins,
						loading: loadingAdmins || loadingGrants,
						selectedIds: selectedPublish,
						onToggle: (id) => toggleSelection('publish', id),
						onClose: () => !submitting && setModal(null),
						onSubmit: () => void submitGrants('publish'),
						submitting,
						excludeUserIds: excludeIds,
					})
				: null}

			{modal === 'both'
				? AdminPickerModal({
						title: 'Déléguer modification + publication',
						description:
							'Les administrateurs sélectionnés pourront modifier et publier ce blueprint (deux autorisations accordées ensemble).',
						admins,
						loading: loadingAdmins || loadingGrants,
						selectedIds: selectedBoth,
						onToggle: (id) =>
							setSelectedBoth((prev) =>
								prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
							),
						onClose: () => !submitting && setModal(null),
						onSubmit: () => void submitGrants('both'),
						submitting,
						excludeUserIds: excludeIds,
					})
				: null}
		</>
	);
}
