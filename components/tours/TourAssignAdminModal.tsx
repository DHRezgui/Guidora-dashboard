'use client';

import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';
import { PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;

export type TourAssignAdminModalProps = {
	open: boolean;
	title?: string;
	description: string;
	admins: User[];
	loading: boolean;
	selectedAdminId: string | null;
	onSelectAdmin: (id: string) => void;
	message: string;
	onMessageChange: (value: string) => void;
	submitting: boolean;
	submitLabel: string;
	pickerName: string;
	onClose: () => void;
	onSubmit: () => void;
};

function formatAdminLabel(admin: User): string {
	const name = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim();
	return name ? `${name} (${admin.email})` : admin.email;
}

export function TourAssignAdminModal({
	open,
	title = 'Assigner à un administrateur',
	description,
	admins,
	loading,
	selectedAdminId,
	onSelectAdmin,
	message,
	onMessageChange,
	submitting,
	submitLabel,
	pickerName,
	onClose,
	onSubmit,
}: TourAssignAdminModalProps) {
	if (!open || typeof document === 'undefined') {
		return null;
	}

	const trimmedMessage = message.trim();
	const messageTooShort =
		trimmedMessage.length > 0 && trimmedMessage.length < MIN_MESSAGE_LENGTH;
	const messageTooLong = trimmedMessage.length > MAX_MESSAGE_LENGTH;

	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="assign-admin-modal-title"
			onClick={() => !submitting && onClose()}
		>
			<div
				className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-950"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 id="assign-admin-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
					{title}
				</h2>
				<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>

				<div className="mt-4 min-h-[8.5rem] max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
					{loading ? (
						<p className="py-6 text-center text-sm text-slate-500">Chargement…</p>
					) : admins.length === 0 ? (
						<p className="py-4 text-sm text-slate-500">
							Aucun administrateur actif dans cette organisation.
						</p>
					) : (
						admins.map((admin) => {
							const id = admin.id;
							if (!id) {
								return null;
							}
							const checked = selectedAdminId === id;
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
										name={pickerName}
										checked={checked}
										disabled={submitting}
										onChange={() => onSelectAdmin(id)}
										className="mt-1 h-4 w-4 accent-orange-500"
										aria-label={formatAdminLabel(admin)}
									/>
									<span className="text-slate-800 dark:text-slate-200">{formatAdminLabel(admin)}</span>
								</label>
							);
						})
					)}
				</div>

				<div className="mt-4 space-y-1.5">
					<label
						htmlFor={`${pickerName}-message`}
						className="text-sm font-medium text-slate-800 dark:text-slate-200"
					>
						Message pour l’administrateur
						<span className="ml-1 font-normal text-slate-500 dark:text-slate-400">(optionnel)</span>
					</label>
					<textarea
						id={`${pickerName}-message`}
						value={message}
						onChange={(e) => onMessageChange(e.target.value)}
						disabled={submitting}
						rows={4}
						maxLength={MAX_MESSAGE_LENGTH}
						placeholder="Contexte, points à vérifier, changements depuis la dernière soumission…"
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
							? `Minimum ${MIN_MESSAGE_LENGTH} caractères si un message est renseigné.`
							: messageTooLong
								? `Maximum ${MAX_MESSAGE_LENGTH} caractères.`
								: `${trimmedMessage.length}/${MAX_MESSAGE_LENGTH} — laissez vide pour envoyer sans message.`}
					</p>
				</div>

				<div className="mt-6 flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
						Annuler
					</Button>
					<Button
						type="button"
						onClick={onSubmit}
						disabled={
							submitting || loading || !selectedAdminId || messageTooShort || messageTooLong
						}
						className={PHOENIX_PRIMARY_BUTTON_CLASS}
					>
						{submitting ? 'Envoi…' : submitLabel}
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
