'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import {
  PHOENIX_ALERT_WARNING_ICON_WRAP_CLASS,
  PHOENIX_DESTRUCTIVE_BUTTON_CLASS,
  PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
  PHOENIX_MODAL_OVERLAY_CLASS,
  PHOENIX_MODAL_PANEL_CLASS,
  PHOENIX_MODAL_PANEL_DANGER_CLASS,
  PHOENIX_PRIMARY_BUTTON_CLASS,
} from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';

export type PhoenixConfirmModalVariant = 'danger' | 'default';

type PhoenixConfirmModalProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Optional third action (e.g. keep collaborators on take-over). */
  secondaryLabel?: string;
  onSecondary?: () => void | Promise<void>;
  /** Icon for the default (non-danger) variant. Default: warning. */
  icon?: 'warning' | 'users' | 'info';
  variant?: PhoenixConfirmModalVariant;
  loading?: boolean;
  loadingLabel?: string;
  maxWidthClassName?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function PhoenixConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Annuler',
  secondaryLabel,
  onSecondary,
  icon = 'warning',
  variant = 'default',
  loading = false,
  loadingLabel,
  maxWidthClassName = 'max-w-sm',
  onClose,
  onConfirm,
}: PhoenixConfirmModalProps) {
  if (!open) {
    return null;
  }

  const isDanger = variant === 'danger';
  const titleId = 'phoenix-confirm-modal-title';
  const hasSecondary = Boolean(secondaryLabel && onSecondary);
  const DefaultIcon =
    icon === 'users' ? Icons.users : icon === 'info' ? Icons.info : Icons.warning;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={PHOENIX_MODAL_OVERLAY_CLASS} onClick={loading ? undefined : onClose} aria-hidden />
      <div
        className={cn(
          isDanger ? PHOENIX_MODAL_PANEL_DANGER_CLASS : PHOENIX_MODAL_PANEL_CLASS,
          'mx-auto max-h-[min(90vh,40rem)] overflow-y-auto animate-scale-in',
          maxWidthClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-4 flex items-start gap-3">
          <div
            className={
              isDanger
                ? 'mt-0.5 rounded-xl border border-rose-400/35 bg-rose-500/15 p-2.5'
                : PHOENIX_ALERT_WARNING_ICON_WRAP_CLASS
            }
          >
            {isDanger ? (
              <Icons.warning className="h-5 w-5 text-rose-500 dark:text-rose-300" />
            ) : (
              <DefaultIcon className="h-5 w-5 text-orange-600 dark:text-orange-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
            >
              {title}
            </h2>
            <div className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{description}</div>
          </div>
        </div>

        <div
          className={cn(
            hasSecondary
              ? 'flex w-full min-w-0 flex-col-reverse gap-2'
              : 'flex flex-wrap justify-end gap-2',
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className={cn(
              PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
              hasSecondary && 'h-10 w-full justify-center',
            )}
          >
            {cancelLabel}
          </Button>
          {hasSecondary ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void onSecondary?.()}
              disabled={loading}
              className={cn(
                PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
                'h-10 w-full justify-center border-orange-400/40 text-orange-800 dark:text-orange-200',
              )}
            >
              {secondaryLabel}
            </Button>
          ) : null}
          {isDanger ? (
            <button
              type="button"
              onClick={() => void onConfirm()}
              disabled={loading}
              className={cn(PHOENIX_DESTRUCTIVE_BUTTON_CLASS, hasSecondary && 'w-full')}
            >
              {loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {loadingLabel ?? confirmLabel}
                </>
              ) : (
                confirmLabel
              )}
            </button>
          ) : (
            <Button
              type="button"
              onClick={() => void onConfirm()}
              disabled={loading}
              className={cn(
                PHOENIX_PRIMARY_BUTTON_CLASS,
                hasSecondary && 'h-10 w-full justify-center',
              )}
            >
              {loading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  {loadingLabel ?? confirmLabel}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
