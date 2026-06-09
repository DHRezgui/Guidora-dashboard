'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { getErrorMessage, userService } from '@/lib/api';
import { isAdminResourceBeingEdited } from '@/lib/admin-resource-edit-lock';
import {
	PHOENIX_DESTRUCTIVE_BUTTON_CLASS,
	PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
	PHOENIX_MODAL_ERROR_CLASS,
	PHOENIX_MODAL_OVERLAY_CLASS,
	PHOENIX_MODAL_PANEL_DANGER_CLASS,
} from '@/lib/phoenix-ui';
import { User } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DeleteUserModalProps {
	user: User;
	onClose: () => void;
	onDeleted: () => void;
}

function getEditLockDeleteMessage(user: User): string | null {
	if (!isAdminResourceBeingEdited(user.editLock)) {
		return null;
	}
	const label = user.editLock?.heldByDisplayName?.trim() || 'un autre administrateur';
	return `Suppression impossible : cet utilisateur est en cours de modification par ${label}.`;
}

export default function DeleteUserModal({ user, onClose, onDeleted }: DeleteUserModalProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const editInProgress = isAdminResourceBeingEdited(user.editLock);
	const lockMessage = getEditLockDeleteMessage(user);

	useEffect(() => {
		if (lockMessage) {
			setError(lockMessage);
		}
	}, [lockMessage]);

	const handleDelete = async () => {
		if (editInProgress) {
			setError(lockMessage ?? 'Suppression impossible : cet utilisateur est en cours de modification.');
			return;
		}
		try {
			setLoading(true);
			setError('');
			await userService.delete(user.id);
			onDeleted();
		} catch (err: unknown) {
			setError(getErrorMessage(err, 'Erreur lors de la suppression'));
		} finally {
			setLoading(false);
		}
	};

	const displayName =
		user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className={PHOENIX_MODAL_OVERLAY_CLASS} onClick={loading ? undefined : onClose} />
			<div
				className={cn(PHOENIX_MODAL_PANEL_DANGER_CLASS, 'mx-4 max-w-sm animate-scale-in')}
				role="dialog"
				aria-modal="true"
				aria-labelledby="delete-user-title"
			>
				<div className="mb-4 flex items-start gap-3">
					<div className="mt-0.5 rounded-xl border border-rose-400/35 bg-rose-500/15 p-2.5">
						<Icons.warning className="h-5 w-5 text-rose-500 dark:text-rose-300" />
					</div>
					<div className="min-w-0 flex-1">
						<h2
							id="delete-user-title"
							className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
						>
							Supprimer l&apos;utilisateur
						</h2>
						<p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
							Êtes-vous sûr de vouloir supprimer{' '}
							<strong className="font-semibold text-slate-900 dark:text-white">{displayName}</strong>{' '}
							? Cette action est irréversible.
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
