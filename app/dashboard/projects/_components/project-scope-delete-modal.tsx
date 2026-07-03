'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage, projectService, type ProjectDeleteScopePreview } from '@/lib/api';
import { formatProjectTitle } from '@/lib/project';
import { PHOENIX_FIELD_CLASS } from '@/app/dashboard/blueprints/blueprint-shared';
import {
  PHOENIX_DESTRUCTIVE_BUTTON_CLASS,
  PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
  PHOENIX_MODAL_OVERLAY_CLASS,
  PHOENIX_MODAL_PANEL_DANGER_CLASS,
} from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';

type ProjectScopeDeleteModalProps = {
  projectKey: string | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
};

export function ProjectScopeDeleteModal({
  projectKey,
  open,
  onClose,
  onDeleted,
}: ProjectScopeDeleteModalProps) {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<ProjectDeleteScopePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmValue, setConfirmValue] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !projectKey) {
      setPreview(null);
      setPreviewError(null);
      setConfirmValue('');
      setDeleteError(null);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);
    setPreviewError(null);
    void (async () => {
      try {
        const data = await projectService.getDeleteScopePreview(projectKey);
        if (!cancelled) setPreview(data);
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(getErrorMessage(err, 'Impossible de préparer la suppression'));
        }
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, projectKey]);

  const confirmMatches = useMemo(
    () => Boolean(projectKey && confirmValue.trim() === projectKey),
    [confirmValue, projectKey],
  );

  const canConfirmDelete = Boolean(
    preview?.canDelete && confirmMatches && !deleting && !loadingPreview,
  );

  const handleDelete = async () => {
    if (!projectKey || !canConfirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await projectService.deleteScope(projectKey, confirmValue.trim());
      await onDeleted();
      onClose();
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Impossible de supprimer le scope projet'));
    } finally {
      setDeleting(false);
    }
  };

  if (!open || !projectKey) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={PHOENIX_MODAL_OVERLAY_CLASS}
        onClick={deleting ? undefined : onClose}
        aria-hidden
      />
      <div
        className={cn(PHOENIX_MODAL_PANEL_DANGER_CLASS, 'mx-4 max-w-lg animate-scale-in')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-scope-delete-title"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-rose-400/35 bg-rose-500/15 p-2.5">
            <Icons.warning className="h-5 w-5 text-rose-500 dark:text-rose-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="project-scope-delete-title"
              className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
            >
              Supprimer le scope projet
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {formatProjectTitle(projectKey)}{' '}
              <span className="font-mono text-xs text-orange-700 dark:text-orange-200/90">
                ({projectKey})
              </span>
            </p>
          </div>
        </div>

        {loadingPreview ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500 dark:text-slate-400">
            <Icons.spinner className="h-4 w-4 animate-spin" />
            Analyse du scope…
          </div>
        ) : null}

        {previewError ? (
          <p className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
            {previewError}
          </p>
        ) : null}

        {preview ? (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <p>
              Cette action supprime définitivement les ressources du scope SDK :
            </p>
            <ul className="space-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-white/10 dark:bg-slate-900/40">
              <li>
                <strong className="text-slate-900 dark:text-white">{preview.faqCount}</strong>{' '}
                question{preview.faqCount !== 1 ? 's' : ''} FAQ
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">{preview.tourCount}</strong>{' '}
                parcours lié{preview.tourCount !== 1 ? 's' : ''}
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">{preview.blueprintCount}</strong>{' '}
                blueprint{preview.blueprintCount !== 1 ? 's' : ''}
              </li>
            </ul>

            {preview.labTourSkippedCount > 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {preview.labTourSkippedCount} parcours lab SDK seront conservés (hors scope).
              </p>
            ) : null}

            {!preview.canDelete && preview.blockReason ? (
              <p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                {preview.blockReason}
                {preview.productionTours.length > 0 ? (
                  <span className="mt-2 block text-xs">
                    Bloqué :{' '}
                    {preview.productionTours
                      .map((tour) => tour.name)
                      .slice(0, 3)
                      .join(', ')}
                    {preview.productionTours.length > 3 ? '…' : ''}
                  </span>
                ) : null}
              </p>
            ) : null}

            {preview.canDelete ? (
              <div className="space-y-3">
                <Label
                  htmlFor="confirm-project-key"
                  className="block text-sm font-medium normal-case tracking-normal text-slate-600 dark:text-slate-400"
                >
                  Saisissez <code className="font-mono text-xs">{projectKey}</code> pour confirmer
                </Label>
                <Input
                  id="confirm-project-key"
                  value={confirmValue}
                  disabled={deleting}
                  onChange={(e) => setConfirmValue(e.target.value)}
                  placeholder={projectKey}
                  className={PHOENIX_FIELD_CLASS}
                  autoComplete="off"
                />
              </div>
            ) : null}

            {deleteError ? (
              <p className="text-sm text-rose-700 dark:text-rose-200">{deleteError}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
            className={PHOENIX_MODAL_CANCEL_BUTTON_CLASS}
          >
            Annuler
          </Button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={!canConfirmDelete}
            className={cn(
              PHOENIX_DESTRUCTIVE_BUTTON_CLASS,
              !canConfirmDelete && 'cursor-not-allowed opacity-50',
            )}
          >
            {deleting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Suppression…
              </>
            ) : (
              'Supprimer le scope'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
