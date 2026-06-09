'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icons } from '@/components/ui/icons';
import { TourAssignAdminModal } from '@/components/tours/TourAssignAdminModal';
import { getErrorMessage, tourService } from '@/lib/api';
import type { GuidedTour, TourAccessGrant, TourAccessMode, User } from '@/lib/types';
import { isSdkLabPublishedTour } from '@/lib/tour-lab';
import {
	canDeveloperAssignTourToAdmins,
	canManageTourSharing,
	getDedicatedModeratorExcludedFromSharePickerIds,
	getDedicatedModeratorAdminId,
	hasTourAccessGrant,
	isTourOwnerPrivateUnshared,
	mustReassignToDedicatedModerator,
	normalizeAssignedAdminIds,
	toTourAccessGrantPayload,
} from '@/lib/tour-sandbox';
import type { DashboardRole } from '@/lib/dashboard-roles';
import { PHOENIX_CHECKBOX_CLASS, PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TourLogoActionsMenuProps = {
	tour: GuidedTour;
	role: DashboardRole | null;
	userId?: string;
	cardVisuallyActive?: boolean;
	onUpdated: () => void | Promise<void>;
};

type MenuAction = 'assign' | 'share-view' | 'share-collaborate';

const MIN_SHARE_MESSAGE_LENGTH = 10;
const MAX_SHARE_MESSAGE_LENGTH = 2000;

function formatMemberLabel(member: User): string {
	const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
	const roleLabel = member.role === 'ADMIN' ? 'Admin' : 'Dev';
	return name ? `${name} — ${roleLabel}` : `${member.email} (${roleLabel})`;
}

function grantUserIdsForMode(
	grants: TourAccessGrant[] | undefined,
	mode: TourAccessMode,
): string[] {
	return (grants ?? [])
		.filter((g) => g.accessMode === mode)
		.map((g) => g.userId)
		.filter((id): id is string => Boolean(id));
}

function MemberPickerModal({
	title,
	description,
	members,
	loading,
	selectedIds,
	onToggle,
	onClose,
	onSubmit,
	submitLabel,
	submitting,
	singleSelect = false,
	excludeUserIds = [],
	pickerName = 'member-picker',
	message,
	onMessageChange,
	messageLabel = 'Message pour les destinataires',
	messagePlaceholder = 'Contexte, objectifs du partage, points d’attention…',
	allowEmptySelection = false,
}: {
	title: string;
	description: string;
	members: User[];
	loading: boolean;
	selectedIds: string[];
	onToggle: (id: string) => void;
	onClose: () => void;
	onSubmit: () => void;
	submitLabel: string;
	submitting: boolean;
	singleSelect?: boolean;
	excludeUserIds?: string[];
	pickerName?: string;
	message?: string;
	onMessageChange?: (value: string) => void;
	messageLabel?: string;
	messagePlaceholder?: string;
	allowEmptySelection?: boolean;
}) {
	const trimmedMessage = message?.trim() ?? '';
	const messageTooShort =
		trimmedMessage.length > 0 && trimmedMessage.length < MIN_SHARE_MESSAGE_LENGTH;
	const messageTooLong = trimmedMessage.length > MAX_SHARE_MESSAGE_LENGTH;
	const visibleMembers = members.filter(
		(member) => member.id && !excludeUserIds.includes(member.id),
	);
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
					) : visibleMembers.length === 0 ? (
						<p className="py-4 text-sm text-slate-500">Aucun autre membre actif dans l’organisation.</p>
					) : (
						visibleMembers.map((member) => {
							const id = member.id;
							if (!id) return null;
							const checked = selectedIds.includes(id);
							return (
								<label
									key={id}
									className={cn(
										'flex cursor-pointer items-start gap-3 rounded-xl border px-2.5 py-2 text-sm transition-colors',
										submitting
											? 'cursor-not-allowed opacity-50'
											: 'border-transparent hover:border-orange-400/35 dark:hover:border-orange-400/25',
										checked &&
											!submitting &&
											'border-orange-400/40 bg-orange-500/[0.06] dark:border-orange-400/30 dark:bg-orange-500/10',
									)}
								>
									{singleSelect ? (
										<input
											type="radio"
											name={pickerName}
											checked={checked}
											disabled={submitting}
											onChange={() => onToggle(id)}
											className="mt-1 h-4 w-4 accent-orange-500"
											aria-label={formatMemberLabel(member)}
										/>
									) : (
										<Checkbox
											checked={checked}
											disabled={submitting}
											onCheckedChange={() => onToggle(id)}
											className={cn('mt-0.5', PHOENIX_CHECKBOX_CLASS)}
											aria-label={formatMemberLabel(member)}
										/>
									)}
									<span className="text-slate-800 dark:text-slate-200">
										{formatMemberLabel(member)}
									</span>
								</label>
							);
						})
					)}
				</div>
				{onMessageChange ? (
					<div className="mt-4 space-y-1.5">
						<label
							htmlFor={`${pickerName}-message`}
							className="text-sm font-medium text-slate-800 dark:text-slate-200"
						>
							{messageLabel}
							<span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
								(optionnel)
							</span>
						</label>
						<textarea
							id={`${pickerName}-message`}
							value={message ?? ''}
							onChange={(e) => onMessageChange(e.target.value)}
							disabled={submitting}
							rows={4}
							maxLength={MAX_SHARE_MESSAGE_LENGTH}
							placeholder={messagePlaceholder}
							className="w-full resize-y rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
						/>
						<p
							className={cn(
								'text-xs',
								messageTooShort || messageTooLong
									? 'text-rose-600 dark:text-rose-300'
									: 'text-slate-500 dark:text-slate-400',
							)}
						>
							{messageTooShort
								? `Minimum ${MIN_SHARE_MESSAGE_LENGTH} caractères si un message est renseigné.`
								: messageTooLong
									? `Maximum ${MAX_SHARE_MESSAGE_LENGTH} caractères.`
									: `${trimmedMessage.length}/${MAX_SHARE_MESSAGE_LENGTH} — laissez vide pour partager sans message.`}
						</p>
					</div>
				) : null}
				<div className="mt-6 flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
						Annuler
					</Button>
					<Button
						type="button"
						onClick={onSubmit}
						disabled={
							submitting ||
							loading ||
							messageTooShort ||
							messageTooLong ||
							(singleSelect
								? selectedIds.length !== 1
								: !allowEmptySelection && selectedIds.length === 0)
						}
						className={PHOENIX_PRIMARY_BUTTON_CLASS}
					>
						{submitting ? 'Enregistrement…' : submitLabel}
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

export function TourLogoActionsMenu({
	tour,
	role,
	userId,
	cardVisuallyActive = false,
	onUpdated,
}: TourLogoActionsMenuProps) {
	const router = useRouter();
	const [menuOpen, setMenuOpen] = useState(false);
	const [modal, setModal] = useState<MenuAction | null>(null);
	const [admins, setAdmins] = useState<User[]>([]);
	const [members, setMembers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [assignAdminId, setAssignAdminId] = useState<string | null>(null);
	const [assignSubmissionMessage, setAssignSubmissionMessage] = useState('');
	const [viewShareMessage, setViewShareMessage] = useState('');
	const [collaborateShareMessage, setCollaborateShareMessage] = useState('');
	/** Grants complets chargés à l’ouverture du modal (la liste n’expose que ceux de l’acteur). */
	const [modalAccessGrants, setModalAccessGrants] = useState<TourAccessGrant[] | undefined>();
	const [submitting, setSubmitting] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const isLabTemplate = isSdkLabPublishedTour(tour);
	const canShare = !isLabTemplate && canManageTourSharing(tour, role, userId);
	const canAssign = !isLabTemplate && canDeveloperAssignTourToAdmins(tour, role, userId);
	const isPrivate = isTourOwnerPrivateUnshared(tour, userId);
	const hasMenu = canShare || canAssign;
	const alreadyAssigned = useMemo(
		() => normalizeAssignedAdminIds(tour.assignedAdminIds),
		[tour.assignedAdminIds],
	);
	const dedicatedModeratorId = useMemo(() => getDedicatedModeratorAdminId(tour), [tour]);
	const lockDedicatedModerator = mustReassignToDedicatedModerator(tour);
	const hasViewGrants = useMemo(
		() => grantUserIdsForMode(tour.accessGrants, 'view').length > 0,
		[tour.accessGrants],
	);
	const hasCollabGrants = useMemo(
		() => grantUserIdsForMode(tour.accessGrants, 'collaborate').length > 0,
		[tour.accessGrants],
	);
	const sharePickerExcludedAdminIds = useMemo(
		() => getDedicatedModeratorExcludedFromSharePickerIds(tour),
		[tour],
	);
	const canEndViewShare = Boolean(tour.sharingHasView) || hasViewGrants;
	const canEndCollaboration = tour.inCollaboration || hasCollabGrants;
	const viewSubmitLabel =
		selectedIds.length === 0
			? 'Terminer le partage lecture'
			: canEndViewShare
				? 'Mettre à jour la lecture seule'
				: 'Partager en lecture seule';
	const collaborateSubmitLabel =
		selectedIds.length === 0
			? 'Terminer la collaboration'
			: canEndCollaboration
				? 'Mettre à jour la collaboration'
				: 'Activer la collaboration';

	useEffect(() => {
		if (!menuOpen) return;
		const onDocClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, [menuOpen]);

	useEffect(() => {
		if (!modal) {
			setModalAccessGrants(undefined);
			setAssignAdminId(null);
			setAssignSubmissionMessage('');
			setViewShareMessage('');
			setCollaborateShareMessage('');
			return;
		}
		if (modal !== 'assign' && !canShare) {
			return;
		}
		let cancelled = false;
		setSelectedIds([]);
		setAssignAdminId(null);
		setModalAccessGrants(undefined);
		setLoading(true);

		const finish = () => {
			if (!cancelled) setLoading(false);
		};

		if (modal === 'assign') {
			tourService
				.getOrganizationAdmins()
				.then((response) => {
					if (cancelled) return;
					const allAdmins = response.users ?? [];
					const list =
						lockDedicatedModerator && dedicatedModeratorId
							? allAdmins.filter((admin) => admin.id === dedicatedModeratorId)
							: allAdmins;
					setAdmins(list);
					const current =
						lockDedicatedModerator && dedicatedModeratorId
							? dedicatedModeratorId
							: (alreadyAssigned.find((id) => list.some((a) => a.id === id)) ?? null);
					setAssignAdminId(current);
				})
				.catch((error) => {
					if (!cancelled) {
						toast.error('Impossible de charger les administrateurs', {
							description: getErrorMessage(error),
						});
						setModal(null);
					}
				})
				.finally(finish);
		} else if (!tour.id) {
			finish();
			return;
		} else {
			const mode = modal === 'share-view' ? 'view' : 'collaborate';
			Promise.all([tourService.getOrganizationMembers(), tourService.getById(tour.id)])
				.then(([membersRes, tourRes]) => {
					if (cancelled) return;
					const list = membersRes.users ?? [];
					const grants = tourRes.tour?.accessGrants ?? [];
					setModalAccessGrants(grants);
					setMembers(list);
					setSelectedIds(
						grantUserIdsForMode(grants, mode).filter((id) => list.some((m) => m.id === id)),
					);
					if (mode === 'view') {
						setViewShareMessage(tourRes.tour?.developerViewShareMessage?.trim() ?? '');
					} else {
						setCollaborateShareMessage(
							tourRes.tour?.developerCollaborateShareMessage?.trim() ?? '',
						);
					}
				})
				.catch((error) => {
					if (!cancelled) {
						toast.error('Impossible de charger les membres', { description: getErrorMessage(error) });
						setModal(null);
					}
				})
				.finally(finish);
		}

		return () => {
			cancelled = true;
		};
	}, [modal, canShare, tour.id, alreadyAssigned, lockDedicatedModerator, dedicatedModeratorId]);

	const toggleId = useCallback((id: string) => {
		setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
	}, []);

	const buildMergedGrants = (mode: TourAccessMode, selected: string[]) => {
		const source = modalAccessGrants ?? tour.accessGrants ?? [];
		const other = toTourAccessGrantPayload(source.filter((g) => g.accessMode !== mode));
		const next = selected.map((userId) => ({ userId, accessMode: mode }));
		return [...other, ...next];
	};

	const handleAssign = async () => {
		if (!tour.id || !assignAdminId) {
			toast.error('Sélectionnez un administrateur modérateur');
			return;
		}
		setSubmitting(true);
		try {
			await tourService.assignAdmins(tour.id, [assignAdminId], assignSubmissionMessage);
			toast.success('Parcours assigné', {
				description: 'L’administrateur sélectionné modère ce parcours (hors mode collaboration).',
			});
			setModal(null);
			setMenuOpen(false);
			await onUpdated();
		} catch (error) {
			toast.error('Assignation impossible', { description: getErrorMessage(error) });
		} finally {
			setSubmitting(false);
		}
	};

	const handleShareGrants = async (mode: TourAccessMode) => {
		if (!tour.id) return;
		setSubmitting(true);
		try {
			const grants = buildMergedGrants(mode, selectedIds);
			const message =
				mode === 'view'
					? selectedIds.length === 0
						? ''
						: viewShareMessage
					: selectedIds.length === 0
						? ''
						: collaborateShareMessage;
			await tourService.setAccessGrants(tour.id, grants, true, {
				messageForMode: mode,
				message,
			});
			if (mode === 'view' && selectedIds.length === 0) {
				toast.success('Partage lecture terminé', {
					description: 'Les accès lecture seule ont été retirés.',
				});
			} else if (mode === 'view') {
				toast.success('Lecture seule partagée', {
					description: 'Les membres sélectionnés peuvent ouvrir le parcours en lecture seule.',
				});
			} else if (selectedIds.length === 0) {
				toast.success('Collaboration terminée', {
					description:
						'Les accès collaborateurs ont été retirés. Vous pouvez assigner le parcours à un admin pour modération.',
				});
			} else {
				toast.success('Collaboration sandbox activée', {
					description:
						'Les collaborateurs peuvent éditer en sandbox. Assignez ensuite à un admin pour modération.',
				});
			}
			setModal(null);
			setMenuOpen(false);
			await onUpdated();
		} catch (error) {
			toast.error('Partage impossible', { description: getErrorMessage(error) });
		} finally {
			setSubmitting(false);
		}
	};

	const openEditor = (access?: 'view' | 'collaborate') => {
		if (!tour.id) return;
		const query = access ? `?access=${access}` : '';
		router.push(`/dashboard/tours/create?id=${encodeURIComponent(tour.id)}${query}`);
		setMenuOpen(false);
	};

	const logoButtonClass = cn(
		'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
		'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50',
		isPrivate
			? 'border-violet-300/55 bg-gradient-to-br from-violet-500/20 to-indigo-600/15 dark:border-violet-400/35'
			: tour.inCollaboration
				? 'border-cyan-300/55 bg-gradient-to-br from-cyan-500/20 to-teal-600/15 dark:border-cyan-400/35'
				: cardVisuallyActive
					? 'border-emerald-400/35 bg-gradient-to-br from-emerald-500/25 to-teal-600/15'
					: 'border-slate-300/50 bg-gradient-to-br from-slate-400/15 to-slate-500/10 dark:border-white/12',
		hasMenu && 'transition-transform hover:scale-105',
	);

	if (!hasMenu) {
		return (
			<div className={logoButtonClass}>
				<Icons.tours
					className={cn(
						'h-5 w-5',
						isPrivate
							? 'text-violet-600 dark:text-violet-300'
							: tour.inCollaboration
								? 'text-cyan-600 dark:text-cyan-300'
								: 'text-slate-500 dark:text-slate-400',
					)}
				/>
			</div>
		);
	}

	return (
		<div className="relative shrink-0" ref={menuRef}>
			<button
				type="button"
				onClick={() => setMenuOpen((o) => !o)}
				className={logoButtonClass}
				title="Partage et assignation du parcours"
				aria-haspopup="menu"
				aria-expanded={menuOpen}
			>
				<Icons.tours
					className={cn(
						'h-5 w-5',
						isPrivate
							? 'text-violet-600 dark:text-violet-300'
							: tour.inCollaboration
								? 'text-cyan-600 dark:text-cyan-300'
								: 'text-slate-500 dark:text-slate-400',
					)}
				/>
			</button>

			{menuOpen ? (
				<div
					role="menu"
					className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-slate-950"
				>
					{canAssign ? (
						<button
							type="button"
							role="menuitem"
							className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
							onClick={() => {
								setMenuOpen(false);
								setModal('assign');
							}}
						>
							<Icons.users className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
							<span>
								<span className="font-medium">Assigner à un admin</span>
								<span className="mt-0.5 block text-xs text-slate-500">
									Approbation / rejet (flux modération)
								</span>
							</span>
						</button>
					) : null}
					{canShare ? (
						<>
							<button
								type="button"
								role="menuitem"
								className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
								onClick={() => {
									setMenuOpen(false);
									setModal('share-view');
								}}
							>
								<Icons.eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
								<span>
									<span className="font-medium">Lecture seule</span>
									<span className="mt-0.5 block text-xs text-slate-500">
										Membres de l’organisation (sandbox)
									</span>
								</span>
							</button>
							<button
								type="button"
								role="menuitem"
								className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
								onClick={() => {
									setMenuOpen(false);
									setModal('share-collaborate');
								}}
							>
								<Icons.users className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
								<span>
									<span className="font-medium">Collaboration sandbox</span>
									<span className="mt-0.5 block text-xs text-slate-500">
										Lecture/écriture (dev↔dev puis admin ; dev↔admin = pair)
									</span>
								</span>
							</button>
						</>
					) : null}
					{hasTourAccessGrant(tour, userId, 'view') ? (
						<button
							type="button"
							role="menuitem"
							className="flex w-full gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
							onClick={() => openEditor('view')}
						>
							Ouvrir en lecture seule
						</button>
					) : null}
					{hasTourAccessGrant(tour, userId, 'collaborate') ? (
						<button
							type="button"
							role="menuitem"
							className="flex w-full gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5"
							onClick={() => openEditor('collaborate')}
						>
							Ouvrir en collaboration
						</button>
					) : null}
				</div>
			) : null}

			<TourAssignAdminModal
				open={modal === 'assign'}
				description={
					lockDedicatedModerator
						? `${tour.name || 'Parcours'} — renvoi au modérateur dédié déjà en charge.`
						: `${tour.name || 'Parcours'} — un seul modérateur par parcours.`
				}
				admins={admins}
				loading={loading}
				selectedAdminId={assignAdminId}
				onSelectAdmin={setAssignAdminId}
				message={assignSubmissionMessage}
				onMessageChange={setAssignSubmissionMessage}
				submitting={submitting}
				submitLabel={alreadyAssigned.length > 0 ? 'Mettre à jour' : 'Assigner'}
				pickerName={`assign-admin-${tour.id ?? 'new'}`}
				onClose={() => !submitting && setModal(null)}
				onSubmit={handleAssign}
			/>

			{modal === 'share-view'
				? MemberPickerModal({
						title: 'Partager en lecture seule',
						description:
							selectedIds.length === 0 && canEndViewShare
								? 'Décochez tous les lecteurs puis confirmez pour mettre fin au partage lecture seule.'
								: sharePickerExcludedAdminIds.length > 0
									? 'Les membres cochés pourront consulter sans modifier. Le modérateur administrateur dédié ne peut pas être invité ; un autre admin est autorisé.'
									: 'Les membres cochés pourront ouvrir ce parcours sans le modifier.',
						members,
						loading,
						selectedIds,
						onToggle: toggleId,
						onClose: () => !submitting && setModal(null),
						onSubmit: () => handleShareGrants('view'),
						submitLabel: viewSubmitLabel,
						submitting,
						allowEmptySelection: canEndViewShare,
						excludeUserIds: sharePickerExcludedAdminIds,
						pickerName: `share-view-${tour.id ?? 'new'}`,
						message: selectedIds.length === 0 ? '' : viewShareMessage,
						onMessageChange: selectedIds.length === 0 ? undefined : setViewShareMessage,
						messageLabel: 'Message pour les lecteurs',
						messagePlaceholder:
							'Contexte du partage, sections à relire, remarques pour la consultation…',
					})
				: null}

			{modal === 'share-collaborate'
				? MemberPickerModal({
						title: 'Collaboration sandbox',
						description:
							selectedIds.length === 0 && canEndCollaboration
								? 'Décochez tous les collaborateurs puis confirmez pour mettre fin à la collaboration sandbox.'
								: sharePickerExcludedAdminIds.length > 0
									? 'Édition en sandbox pour les membres cochés. Le modérateur administrateur dédié ne peut pas être collaborateur ; un autre admin est autorisé.'
									: 'Édition en sandbox pour les membres cochés. Un admin invité agit comme collaborateur, pas comme modérateur.',
						members,
						loading,
						selectedIds,
						onToggle: toggleId,
						onClose: () => !submitting && setModal(null),
						onSubmit: () => handleShareGrants('collaborate'),
						submitLabel: collaborateSubmitLabel,
						submitting,
						allowEmptySelection: canEndCollaboration,
						excludeUserIds: sharePickerExcludedAdminIds,
						pickerName: `share-collab-${tour.id ?? 'new'}`,
						message: selectedIds.length === 0 ? '' : collaborateShareMessage,
						onMessageChange:
							selectedIds.length === 0 ? undefined : setCollaborateShareMessage,
						messageLabel: 'Message pour les collaborateurs',
						messagePlaceholder:
							'Objectifs de la collaboration, périmètre d’édition, points à coordonner…',
					})
				: null}
		</div>
	);
}
