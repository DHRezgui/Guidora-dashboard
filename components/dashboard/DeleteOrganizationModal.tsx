'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { getErrorMessage, organizationService } from '@/lib/api';
import { isAdminResourceBeingEdited } from '@/lib/admin-resource-edit-lock';
import {
	PHOENIX_DESTRUCTIVE_BUTTON_CLASS,
	PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
	PHOENIX_MODAL_ERROR_CLASS,
	PHOENIX_MODAL_OVERLAY_CLASS,
	PHOENIX_MODAL_PANEL_DANGER_CLASS,
} from '@/lib/phoenix-ui';
import { Organization } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DeleteOrganizationModalProps {
	organization: Organization;
	onClose: () => void;
	onDeleted: () => void;
}

function getEditLockDeleteMessage(organization: Organization): string | null {
	if (!isAdminResourceBeingEdited(organization.editLock)) {
		return null;
	}
	const label = organization.editLock?.heldByDisplayName?.trim() || 'un autre administrateur';
	return `Suppression impossible : cette organisation est en cours de modification par ${label}.`;
}

export default function DeleteOrganizationModal({
	organization,
	onClose,
	onDeleted,
}: DeleteOrganizationModalProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const editInProgress = isAdminResourceBeingEdited(organization.editLock);
	const lockMessage = getEditLockDeleteMessage(organization);

	useEffect(() => {
		if (lockMessage) {
			setError(lockMessage);
		}
	}, [lockMessage]);

	const handleDelete = async () => {
		if (editInProgress) {
			setError(
				lockMessage ?? 'Suppression impossible : cette organisation est en cours de modification.',
			);
			return;
		}
		try {
			setLoading(true);
			setError('');
			await organizationService.delete(organization.id);
			onDeleted();
		} catch (err: unknown) {
			setError(getErrorMessage(err, 'Erreur lors de la suppression'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className={PHOENIX_MODAL_OVERLAY_CLASS} onClick={loading ? undefined : onClose} />
			<div
				className={cn(PHOENIX_MODAL_PANEL_DANGER_CLASS, 'mx-4 max-w-sm animate-scale-in')}
				role="dialog"
				aria-modal="true"
				aria-labelledby="delete-org-title"
			>
				<div className="mb-4 flex items-start gap-3">
					<div className="mt-0.5 rounded-xl border border-rose-400/35 bg-rose-500/15 p-2.5">
						<Icons.warning className="h-5 w-5 text-rose-500 dark:text-rose-300" />
					</div>
					<div className="min-w-0 flex-1">
						<h2
							id="delete-org-title"
							className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
						>
							Supprimer l&apos;organisation
						</h2>
						<p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
							Êtes-vous sûr de vouloir supprimer{' '}
							<strong className="font-semibold text-slate-900 dark:text-white">
								{organization.name}
							</strong>{' '}
							? Cette action est irréversible et dissociera tous les utilisateurs associés.
						</p>
					</div>
				</div>

				{error ? <div className={cn(PHOENIX_MODAL_ERROR_CLASS, 'mb-4')}>{error}</div> : null}

				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={loading}
						className={PHOENIX_MODAL_CANCEL_BUTTON_CLASS}
					>
						Annuler
					</Button>
					<button
						type="button"
						onClick={() => void handleDelete()}
						disabled={loading || editInProgress}
						className={PHOENIX_DESTRUCTIVE_BUTTON_CLASS}
					>
						{loading ? (
							<>
								<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
								Suppression…
							</>
						) : (
							'Supprimer'
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
