'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { getErrorMessage, tourService } from '@/lib/api';
import type { GuidedTour, User } from '@/lib/types';
import {
	canReassignApprovedTourAdmins,
	canReopenApprovedDeveloperTour,
	canTransferApprovedDeveloperTour,
	normalizeAssignedAdminIds,
	type TourCreatorRoleLookup,
} from '@/lib/tour-sandbox';
import type { DashboardRole } from '@/lib/dashboard-roles';
import { PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TourApprovedModerationControlProps = {
	tour: GuidedTour;
	role: DashboardRole | null;
	userId?: string;
	creatorRoleByUserId?: TourCreatorRoleLookup;
	onUpdated: () => void | Promise<void>;
};

type ModerationPanel = 'menu' | 'reassign' | 'return' | 'transfer';

function formatMemberLabel(member: User): string {
	const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
	return name ? `${name} (${member.email})` : member.email;
}

export function TourApprovedModerationControl({
	tour,
	role,
	userId,
	creatorRoleByUserId,
	onUpdated,
}: TourApprovedModerationControlProps) {
	const [open, setOpen] = useState(false);
	const [panel, setPanel] = useState<ModerationPanel>('menu');
	const [admins, setAdmins] = useState<User[]>([]);
	const [developers, setDevelopers] = useState<User[]>([]);
	const [loadingAdmins, setLoadingAdmins] = useState(false);
	const [loadingDevelopers, setLoadingDevelopers] = useState(false);
	const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
	const [selectedDeveloperId, setSelectedDeveloperId] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [returnReasonInput, setReturnReasonInput] = useState('');
	const [transferReasonInput, setTransferReasonInput] = useState('');
	const fetchAdminsStartedRef = useRef(false);
	const fetchDevelopersStartedRef = useRef(false);

	const canReopen = canReopenApprovedDeveloperTour(tour, role, creatorRoleByUserId, userId);
	const canReassign = canReassignApprovedTourAdmins(tour, role, creatorRoleByUserId, userId);
	const canTransfer = canTransferApprovedDeveloperTour(tour, role, creatorRoleByUserId, userId);

	const alreadyAssigned = useMemo(
		() => normalizeAssignedAdminIds(tour.assignedAdminIds),
		[tour.assignedAdminIds],
	);

	useEffect(() => {
		if (!open || panel !== 'reassign') {
			fetchAdminsStartedRef.current = false;
			return;
		}
		if (!canReassign || fetchAdminsStartedRef.current) {
			return;
		}
		fetchAdminsStartedRef.current = true;

		let cancelled = false;
		setLoadingAdmins(true);

		tourService
			.getOrganizationAdmins()
			.then((response) => {
				if (cancelled) {
					return;
				}
				const list = (response.users ?? []).filter(
					(admin) => admin.id && admin.id !== userId,
				);
				setAdmins(list);
				const current = alreadyAssigned.find(
					(id) => id !== userId && list.some((a) => a.id === id),
				);
				setSelectedAdminId(current ?? null);
			})
			.catch((error) => {
				if (!cancelled) {
					toast.error('Impossible de charger les administrateurs', {
						description: getErrorMessage(error),
					});
					setPanel('menu');
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoadingAdmins(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [alreadyAssigned, canReassign, open, panel, userId]);

	useEffect(() => {
		if (!open || panel !== 'transfer') {
			fetchDevelopersStartedRef.current = false;
			return;
		}
		if (!canTransfer || fetchDevelopersStartedRef.current) {
			return;
		}
		fetchDevelopersStartedRef.current = true;

		let cancelled = false;
		setLoadingDevelopers(true);

		tourService
			.getOrganizationMembers()
			.then((response) => {
				if (cancelled) {
					return;
				}
				const list = (response.users ?? []).filter(
					(member) =>
						member.id &&
						member.role === 'DEVELOPER' &&
						member.id !== tour.createdBy,
				);
				setDevelopers(list);
				setSelectedDeveloperId(null);
			})
			.catch((error) => {
				if (!cancelled) {
					toast.error('Impossible de charger les développeurs', {
						description: getErrorMessage(error),
					});
					setPanel('menu');
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoadingDevelopers(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [canTransfer, open, panel, tour.createdBy]);

	const closeModal = useCallback(() => {
		if (submitting) {
			return;
		}
		setOpen(false);
		setPanel('menu');
		setReturnReasonInput('');
		setTransferReasonInput('');
		setSelectedDeveloperId(null);
	}, [submitting]);

	const handleReopen = async () => {
		if (!tour.id) {
			return;
		}
		const reason = returnReasonInput.trim();
		if (reason.length < 10) {
			toast.error('Motif insuffisant', {
				description: 'Merci de décrire le renvoi en au moins 10 caractères.',
			});
			return;
		}
		setSubmitting(true);
		try {
			await tourService.reopenToDeveloper(tour.id, { reason });
			toast.success('Parcours renvoyé au développeur', {
				description:
					'Le parcours disparaît de votre liste. Le développeur devra vous le renvoyer après correction.',
			});
			closeModal();
			await onUpdated();
		} catch (error) {
			toast.error('Renvoi impossible', {
				description: getErrorMessage(error),
			});
		} finally {
			setSubmitting(false);
		}
	};

	const handleReassign = async () => {
		if (!tour.id || !selectedAdminId) {
			toast.error('Sélectionnez un autre administrateur modérateur');
			return;
		}
		if (selectedAdminId === userId) {
			toast.error('Réassignation impossible', {
				description: 'Vous ne pouvez pas réassigner la modération à vous-même.',
			});
			return;
		}
		setSubmitting(true);
		try {
			await tourService.reassignAdmins(tour.id, [selectedAdminId]);
			toast.success('Modération réassignée', {
				description: 'Le nouvel administrateur modère ce parcours approuvé.',
			});
			closeModal();
			await onUpdated();
		} catch (error) {
			toast.error('Réassignation impossible', {
				description: getErrorMessage(error),
			});
		} finally {
			setSubmitting(false);
		}
	};

	const handleTransfer = async () => {
		if (!tour.id || !selectedDeveloperId) {
			toast.error('Sélectionnez un développeur destinataire');
			return;
		}
		const reason = transferReasonInput.trim();
		if (reason.length < 10) {
			toast.error('Motif insuffisant', {
				description: 'Merci de décrire le transfert en au moins 10 caractères.',
			});
			return;
		}
		setSubmitting(true);
		try {
			await tourService.transferDeveloper(tour.id, {
				developerId: selectedDeveloperId,
				reason,
			});
			toast.success('Parcours transféré', {
				description:
					'Le parcours disparaît de votre liste. Le nouveau développeur devra vous le renvoyer après correction.',
			});
			closeModal();
			await onUpdated();
		} catch (error) {
			toast.error('Transfert impossible', {
				description: getErrorMessage(error),
			});
		} finally {
			setSubmitting(false);
		}
	};

	if (!canReopen && !canReassign && !canTransfer) {
		return null;
	}

	return (
		<>
			<Button
				type="button"
				variant="outline"
				disabled={submitting}
				onClick={() => setOpen(true)}
				className={cn(
					'h-9 w-full gap-1.5 rounded-lg border text-sm font-medium shadow-sm backdrop-blur-sm transition-all hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-orange-400/25',
					'border-violet-300/55 bg-white/90 text-violet-900 hover:border-violet-400/65 hover:bg-violet-50/95 hover:text-violet-950 dark:border-violet-400/35 dark:bg-slate-900/45 dark:text-violet-100 dark:hover:bg-violet-500/12',
				)}
			>
				<Icons.admin className="h-3.5 w-3.5 shrink-0" />
				Gestion modération
			</Button>

			{open && typeof document !== 'undefined'
				? createPortal(
						<div
							className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
							role="dialog"
							aria-modal="true"
							aria-labelledby="approved-moderation-title"
							onClick={closeModal}
						>
							<div
								className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-950"
								onClick={(e) => e.stopPropagation()}
							>
								{panel === 'menu' ? (
									<>
										<h2
											id="approved-moderation-title"
											className="text-lg font-semibold text-slate-900 dark:text-white"
										>
											Parcours approuvé
										</h2>
										<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
											{tour.name || 'Parcours'} — choisissez une action de modération.
										</p>

										<div className="mt-5 space-y-3">
											{canReopen ? (
												<button
													type="button"
													disabled={submitting}
													onClick={() => setPanel('return')}
													className="w-full rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 text-left transition-colors hover:bg-amber-100/90 disabled:opacity-60 dark:border-amber-800/40 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
												>
													<div className="flex items-start gap-3">
														<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
															<Icons.undo className="h-4 w-4" />
														</div>
														<div>
															<p className="font-medium text-slate-900 dark:text-white">
																Renvoyer au développeur
															</p>
															<p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
																Révoque l’approbation avec un motif. Le parcours disparaît de
																votre liste jusqu’à réassignation par le développeur.
															</p>
														</div>
													</div>
												</button>
											) : null}

											{canReassign ? (
												<button
													type="button"
													disabled={submitting}
													onClick={() => setPanel('reassign')}
													className="w-full rounded-xl border border-violet-200/80 bg-violet-50/80 p-4 text-left transition-colors hover:bg-violet-100/90 disabled:opacity-60 dark:border-violet-800/40 dark:bg-violet-950/30 dark:hover:bg-violet-950/50"
												>
													<div className="flex items-start gap-3">
														<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
															<Icons.admin className="h-4 w-4" />
														</div>
														<div>
															<p className="font-medium text-slate-900 dark:text-white">
																Réassigner la modération
															</p>
															<p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
																Transfère la responsabilité à un autre administrateur sans
																révoquer l’approbation.
															</p>
														</div>
													</div>
												</button>
											) : null}

											{canTransfer ? (
												<button
													type="button"
													disabled={submitting}
													onClick={() => setPanel('transfer')}
													className="w-full rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4 text-left transition-colors hover:bg-emerald-100/90 disabled:opacity-60 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
												>
													<div className="flex items-start gap-3">
														<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
															<Icons.users className="h-4 w-4" />
														</div>
														<div>
															<p className="font-medium text-slate-900 dark:text-white">
																Transférer à un autre développeur
															</p>
															<p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
																Change le propriétaire du parcours. Le nouveau développeur
																reprend la modération après correction.
															</p>
														</div>
													</div>
												</button>
											) : null}
										</div>

										<div className="mt-6 flex justify-end">
											<Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
												Fermer
											</Button>
										</div>
									</>
								) : panel === 'transfer' ? (
									<>
										<button
											type="button"
											className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
											onClick={() => setPanel('menu')}
											disabled={submitting}
										>
											<Icons.arrowLeft className="h-3.5 w-3.5" />
											Retour
										</button>
										<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
											Transférer à un développeur
										</h2>
										<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
											{tour.name || 'Parcours'} — un seul propriétaire, le développeur actuel est
											exclu.
										</p>

										<div className="mt-4 min-h-[8.5rem] max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
											{loadingDevelopers ? (
												<p className="py-6 text-center text-sm text-slate-500">Chargement…</p>
											) : developers.length === 0 ? (
												<p className="py-6 text-center text-sm text-slate-500">
													Aucun autre développeur disponible.
												</p>
											) : (
												developers.map((developer) => {
													const developerId = developer.id;
													if (!developerId) {
														return null;
													}
													const checked = selectedDeveloperId === developerId;
													return (
														<label
															key={developerId}
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
															<input
																type="radio"
																name={`transfer-developer-${tour.id ?? 'tour'}`}
																checked={checked}
																disabled={submitting}
																onChange={() => setSelectedDeveloperId(developerId)}
																className="mt-1 h-4 w-4 accent-orange-500"
																aria-label={formatMemberLabel(developer)}
															/>
															<span className="text-slate-800 dark:text-slate-200">
																{formatMemberLabel(developer)}
															</span>
														</label>
													);
												})
											)}
										</div>

										<div className="mt-4 space-y-2">
											<Label htmlFor="transfer-reason">Motif du transfert</Label>
											<textarea
												id="transfer-reason"
												value={transferReasonInput}
												onChange={(e) => setTransferReasonInput(e.target.value)}
												rows={4}
												maxLength={2000}
												placeholder="Expliquez pourquoi ce parcours change de propriétaire…"
												className="w-full resize-y rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
											/>
											<p className="text-xs text-slate-500 dark:text-slate-400">
												Minimum 10 caractères · {transferReasonInput.trim().length}/2000
											</p>
										</div>

										<div className="mt-6 flex justify-end gap-2">
											<Button
												type="button"
												variant="outline"
												onClick={closeModal}
												disabled={submitting}
											>
												Annuler
											</Button>
											<Button
												type="button"
												onClick={() => void handleTransfer()}
												disabled={
													submitting ||
													!selectedDeveloperId ||
													transferReasonInput.trim().length < 10
												}
												className={PHOENIX_PRIMARY_BUTTON_CLASS}
											>
												{submitting ? 'Enregistrement…' : 'Confirmer le transfert'}
											</Button>
										</div>
									</>
								) : panel === 'return' ? (
									<>
										<button
											type="button"
											className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
											onClick={() => setPanel('menu')}
											disabled={submitting}
										>
											<Icons.arrowLeft className="h-3.5 w-3.5" />
											Retour
										</button>
										<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
											Renvoyer au développeur
										</h2>
										<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
											{tour.name || 'Parcours'} — le développeur devra corriger puis réassigner le
											parcours.
										</p>
										<div className="mt-4 space-y-2">
											<Label
												htmlFor="return-reason"
												className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
											>
												Motif du renvoi
											</Label>
											<textarea
												id="return-reason"
												value={returnReasonInput}
												onChange={(e) => setReturnReasonInput(e.target.value)}
												rows={5}
												maxLength={2000}
												placeholder="Décrivez les corrections attendues avant nouvelle soumission…"
												className="w-full resize-y rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
											/>
											<p className="text-xs text-slate-500 dark:text-slate-400">
												Minimum 10 caractères · {returnReasonInput.trim().length}/2000
											</p>
										</div>
										<div className="mt-6 flex justify-end gap-2">
											<Button
												type="button"
												variant="outline"
												onClick={closeModal}
												disabled={submitting}
											>
												Annuler
											</Button>
											<Button
												type="button"
												onClick={() => void handleReopen()}
												disabled={submitting || returnReasonInput.trim().length < 10}
												className={PHOENIX_PRIMARY_BUTTON_CLASS}
											>
												{submitting ? 'Envoi…' : 'Confirmer le renvoi'}
											</Button>
										</div>
									</>
								) : (
									<>
										<button
											type="button"
											className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
											onClick={() => setPanel('menu')}
											disabled={submitting}
										>
											<Icons.arrowLeft className="h-3.5 w-3.5" />
											Retour
										</button>
										<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
											Réassigner la modération
										</h2>
										<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
											{tour.name || 'Parcours'} — un seul modérateur, vous ne pouvez pas vous
											sélectionner.
										</p>

										<div className="mt-4 min-h-[8.5rem] max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
											{loadingAdmins ? (
												<p className="py-6 text-center text-sm text-slate-500">Chargement…</p>
											) : admins.length === 0 ? (
												<p className="py-6 text-center text-sm text-slate-500">
													Aucun autre administrateur disponible.
												</p>
											) : (
												admins.map((admin) => {
													const adminId = admin.id;
													if (!adminId) {
														return null;
													}
													const checked = selectedAdminId === adminId;
													return (
														<label
															key={adminId}
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
															<input
																type="radio"
																name={`reassign-admin-${tour.id ?? 'tour'}`}
																checked={checked}
																disabled={submitting}
																onChange={() => setSelectedAdminId(adminId)}
																className="mt-1 h-4 w-4 accent-orange-500"
																aria-label={formatMemberLabel(admin)}
															/>
															<span className="text-slate-800 dark:text-slate-200">
																{formatMemberLabel(admin)}
															</span>
														</label>
													);
												})
											)}
										</div>

										<div className="mt-6 flex justify-end gap-2">
											<Button
												type="button"
												variant="outline"
												onClick={closeModal}
												disabled={submitting}
											>
												Annuler
											</Button>
											<Button
												type="button"
												onClick={() => void handleReassign()}
												disabled={submitting || !selectedAdminId}
												className={PHOENIX_PRIMARY_BUTTON_CLASS}
											>
												{submitting ? 'Enregistrement…' : 'Confirmer'}
											</Button>
										</div>
									</>
								)}
							</div>
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
