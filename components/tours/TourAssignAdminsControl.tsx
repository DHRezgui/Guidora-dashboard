'use client';



import { useEffect, useMemo, useRef, useState } from 'react';

import { Icons } from '@/components/ui/icons';

import { TourAssignAdminModal } from '@/components/tours/TourAssignAdminModal';

import { getErrorMessage, tourService } from '@/lib/api';

import type { GuidedTour, User } from '@/lib/types';

import {

	canDeveloperAssignTourToAdmins,

	getDedicatedModeratorAdminId,

	isDeveloperPrivateUnassigned,

	mustReassignToDedicatedModerator,

	normalizeAssignedAdminIds,

} from '@/lib/tour-sandbox';

import type { DashboardRole } from '@/lib/dashboard-roles';

import { cn } from '@/lib/utils';

import { toast } from 'sonner';



type TourAssignAdminsControlProps = {

	tour: GuidedTour;

	role: DashboardRole | null;

	userId?: string;

	cardVisuallyActive?: boolean;

	onAssigned: () => void | Promise<void>;

};



export function TourAssignAdminsControl({

	tour,

	role,

	userId,

	cardVisuallyActive = false,

	onAssigned,

}: TourAssignAdminsControlProps) {

	const [open, setOpen] = useState(false);

	const [admins, setAdmins] = useState<User[]>([]);

	const [loadingAdmins, setLoadingAdmins] = useState(false);

	const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

	const [submissionMessage, setSubmissionMessage] = useState('');

	const [submitting, setSubmitting] = useState(false);



	const canAssign = canDeveloperAssignTourToAdmins(tour, role, userId);

	const isPrivate = isDeveloperPrivateUnassigned(tour);

	const alreadyAssigned = useMemo(

		() => normalizeAssignedAdminIds(tour.assignedAdminIds),

		[tour.assignedAdminIds],

	);

	const dedicatedModeratorId = useMemo(() => getDedicatedModeratorAdminId(tour), [tour]);

	const lockDedicatedModerator = mustReassignToDedicatedModerator(tour);

	const fetchStartedRef = useRef(false);



	useEffect(() => {

		if (!open) {

			fetchStartedRef.current = false;

			setSubmissionMessage('');

			return;

		}

		if (!canAssign || fetchStartedRef.current) {

			return;

		}

		fetchStartedRef.current = true;



		let cancelled = false;

		setLoadingAdmins(true);

		tourService

			.getOrganizationAdmins()

			.then((response) => {

				if (cancelled) {

					return;

				}

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

				setSelectedAdminId(current);

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

					setLoadingAdmins(false);

				}

			});

		return () => {

			cancelled = true;

		};

	}, [open, canAssign, tour.id, lockDedicatedModerator, dedicatedModeratorId, alreadyAssigned]);



	const handleSubmit = async () => {

		if (!tour.id || !selectedAdminId) {

			toast.error('Sélectionnez un administrateur modérateur');

			return;

		}

		setSubmitting(true);

		try {

			await tourService.assignAdmins(tour.id, [selectedAdminId], submissionMessage);

			toast.success('Parcours assigné', {

				description: 'L’administrateur sélectionné modère ce parcours.',

			});

			setOpen(false);

			await onAssigned();

		} catch (error) {

			toast.error('Assignation impossible', {

				description: getErrorMessage(error),

			});

		} finally {

			setSubmitting(false);

		}

	};



	if (!canAssign) {

		return (

			<div

				className={cn(

					'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',

					cardVisuallyActive

						? 'border-emerald-400/35 bg-gradient-to-br from-emerald-500/25 to-teal-600/15'

						: 'border-slate-300/50 bg-gradient-to-br from-slate-400/15 to-slate-500/10 dark:border-white/12 dark:from-slate-600/30 dark:to-slate-700/20',

				)}

			>

				<Icons.tours

					className={cn(

						'h-5 w-5',

						cardVisuallyActive ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400',

					)}

				/>

			</div>

		);

	}



	return (

		<>

			<button

				type="button"

				onClick={() => setOpen(true)}

				className={cn(

					'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',

					!open && 'transition-transform hover:scale-105',

					'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50',

					isPrivate

						? 'border-violet-300/55 bg-gradient-to-br from-violet-500/20 to-indigo-600/15 dark:border-violet-400/35'

						: cardVisuallyActive

							? 'border-emerald-400/35 bg-gradient-to-br from-emerald-500/25 to-teal-600/15'

							: 'border-slate-300/50 bg-gradient-to-br from-slate-400/15 to-slate-500/10 dark:border-white/12',

				)}

				title={

					isPrivate

						? 'Parcours privé — cliquer pour assigner à un administrateur'

						: 'Modifier les administrateurs assignés'

				}

			>

				<Icons.tours

					className={cn(

						'h-5 w-5',

						isPrivate ? 'text-violet-600 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400',

					)}

				/>

			</button>



			<TourAssignAdminModal

				open={open}

				description={

					lockDedicatedModerator

						? `${tour.name || 'Parcours'} — renvoi au modérateur dédié déjà en charge.`

						: `${tour.name || 'Parcours'} — un seul modérateur par parcours.`

				}

				admins={admins}

				loading={loadingAdmins}

				selectedAdminId={selectedAdminId}

				onSelectAdmin={setSelectedAdminId}

				message={submissionMessage}

				onMessageChange={setSubmissionMessage}

				submitting={submitting}

				submitLabel={alreadyAssigned.length > 0 ? 'Mettre à jour' : 'Assigner'}

				pickerName={`assign-admin-${tour.id ?? 'new'}`}

				onClose={() => !submitting && setOpen(false)}

				onSubmit={handleSubmit}

			/>

		</>

	);

}

