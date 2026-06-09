'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { getErrorMessage, tourService } from '@/lib/api';
import type { GuidedTour, User } from '@/lib/types';
import {
	isProductionManagerAdmin,
	resolveProductionManagerAdminId,
} from '@/lib/tour-sandbox';
import type { DashboardRole } from '@/lib/dashboard-roles';
import { PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TourProductionManagementControlProps = {
	tour: GuidedTour;
	role: DashboardRole | null;
	userId?: string;
	onUpdated: () => void | Promise<void>;
};

function formatAdminLabel(admin: User): string {
	const name = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim();
	return name ? `${name} (${admin.email})` : admin.email;
}

export function TourProductionManagementControl({
	tour,
	role,
	userId,
	onUpdated,
}: TourProductionManagementControlProps) {
	const [open, setOpen] = useState(false);
	const [admins, setAdmins] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const managerId = resolveProductionManagerAdminId(tour);
	const isOwnerManager = Boolean(userId) && isProductionManagerAdmin(tour, userId);

	const pickerAdmins = useMemo(() => {
		return admins.filter((admin) => admin.id && admin.id !== userId);
	}, [admins, userId]);

	useEffect(() => {
		if (!open) {
			return;
		}
		let cancelled = false;
		setLoading(true);
		tourService
			.getOrganizationAdmins()
			.then((response) => {
				if (cancelled) {
					return;
				}
				const list = response.users ?? [];
				setAdmins(list);
				const currentManager = managerId && list.some((a) => a.id === managerId) ? managerId : null;
				const fallback = list.find((a) => a.id !== userId)?.id ?? null;
				setSelectedId(currentManager && currentManager !== userId ? currentManager : fallback);
			})
			.catch((error) => {
				if (!cancelled) {
					toast.error('Impossible de charger les administrateurs', {
						description: getErrorMessage(error),
					});
					setOpen(false);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [open, managerId, userId]);

	const handleReclaim = async () => {
		if (!tour.id || !userId) {
			return;
		}
		setSubmitting(true);
		try {
			await tourService.transferProductionManagement(tour.id, userId);
			toast.success('Gestion reprise', {
				description: 'Vous gérez à nouveau ce parcours en production.',
			});
			setOpen(false);
			await onUpdated();
		} catch (error) {
			toast.error('Action impossible', { description: getErrorMessage(error) });
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelegate = async () => {
		if (!tour.id || !selectedId) {
			toast.error('Sélectionnez un administrateur gestionnaire');
			return;
		}
		setSubmitting(true);
		try {
			await tourService.transferProductionManagement(tour.id, selectedId);
			toast.success('Gestion déléguée', {
				description:
					selectedId === userId
						? 'Vous gérez ce parcours en production.'
						: 'L’administrateur sélectionné gère ce parcours ; vous passez en lecture seule.',
			});
			setOpen(false);
			await onUpdated();
		} catch (error) {
			toast.error('Délégation impossible', { description: getErrorMessage(error) });
		} finally {
			setSubmitting(false);
		}
	};

	if (role !== 'ADMIN' || !userId || tour.createdBy !== userId || tour.environment !== 'production') {
		return null;
	}

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-8 w-full border-indigo-300/50 bg-indigo-50/80 text-xs font-medium text-indigo-900 hover:bg-indigo-100/90 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:bg-indigo-500/20"
				onClick={() => setOpen(true)}
			>
				<Icons.users className="mr-1.5 h-3.5 w-3.5" />
				{isOwnerManager ? 'Déléguer la gestion prod' : 'Reprendre ou déléguer la gestion'}
			</Button>

			{open
				? createPortal(
						<div
							className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
							role="presentation"
							onClick={() => !submitting && setOpen(false)}
						>
							<div
								role="dialog"
								aria-modal="true"
								aria-labelledby="prod-management-title"
								className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-slate-950"
								onClick={(e) => e.stopPropagation()}
							>
								<h3
									id="prod-management-title"
									className="text-base font-semibold text-slate-900 dark:text-slate-100"
								>
									Gestion production
								</h3>
								<p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
									Un seul administrateur gère ce parcours en production. Les autres admins
									restent en lecture seule.
								</p>

								{!isOwnerManager ? (
									<div className="mt-4">
										<Button
											type="button"
											className={cn('w-full', PHOENIX_PRIMARY_BUTTON_CLASS)}
											disabled={submitting}
											onClick={handleReclaim}
										>
											Reprendre la gestion
										</Button>
									</div>
								) : null}

								<div className="mt-4 space-y-2">
									<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
										Déléguer à un administrateur
									</p>
									<div className="min-h-[8.5rem] max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
										{loading ? (
											<p className="py-6 text-center text-sm text-slate-500">Chargement…</p>
										) : pickerAdmins.length === 0 ? (
											<p className="py-4 text-sm text-slate-500">
												Aucun autre administrateur disponible.
											</p>
										) : (
											pickerAdmins.map((admin) => {
												const id = admin.id;
												if (!id) {
													return null;
												}
												const checked = selectedId === id;
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
														<input
															type="radio"
															name={`prod-manager-${tour.id}`}
															checked={checked}
															disabled={submitting}
															onChange={() => setSelectedId(id)}
															className="mt-1 h-4 w-4 accent-orange-500"
															aria-label={formatAdminLabel(admin)}
														/>
														<span className="text-slate-800 dark:text-slate-200">
															{formatAdminLabel(admin)}
														</span>
													</label>
												);
											})
										)}
									</div>
								</div>

								<div className="mt-5 flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										disabled={submitting}
										onClick={() => setOpen(false)}
									>
										Annuler
									</Button>
									<Button
										type="button"
										className={PHOENIX_PRIMARY_BUTTON_CLASS}
										disabled={submitting || loading || !selectedId}
										onClick={handleDelegate}
									>
										{submitting ? 'Enregistrement…' : 'Confirmer la délégation'}
									</Button>
								</div>
							</div>
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
