'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { getErrorMessage, sdkTokenService } from '@/lib/api';
import {
  PHOENIX_DESTRUCTIVE_BUTTON_CLASS,
  PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
  PHOENIX_MODAL_ERROR_CLASS,
  PHOENIX_MODAL_OVERLAY_CLASS,
  PHOENIX_MODAL_PANEL_DANGER_CLASS,
} from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';

export type SdkTokenActionModalKind = 'revoke' | 'delete-revoked' | 'purge-revoked-history';

type SdkTokenActionModalProps = {
  kind: SdkTokenActionModalKind;
  tokenName?: string;
  revokedCount?: number;
  tokenId?: string;
  onClose: () => void;
  onCompleted: (message: string) => void;
};

const COPY: Record<
  SdkTokenActionModalKind,
  { title: string; description: (tokenName?: string, revokedCount?: number) => string; confirm: string; loading: string }
> = {
  revoke: {
    title: 'Révoquer le token',
    description: (tokenName) =>
      tokenName
        ? `Êtes-vous sûr de vouloir révoquer le token ${tokenName} ? Les applications qui l’utilisent cesseront de fonctionner.`
        : 'Êtes-vous sûr de vouloir révoquer ce token ? Les applications qui l’utilisent cesseront de fonctionner.',
    confirm: 'Révoquer',
    loading: 'Révocation…',
  },
  'delete-revoked': {
    title: 'Supprimer de l’historique',
    description: (tokenName) =>
      tokenName
        ? `Supprimer définitivement ${tokenName} de l’historique ? Cette action est irréversible.`
        : 'Supprimer définitivement ce token de l’historique ? Cette action est irréversible.',
    confirm: 'Supprimer',
    loading: 'Suppression…',
  },
  'purge-revoked-history': {
    title: 'Vider l’historique révoqué',
    description: (_tokenName, revokedCount) =>
      `Vider l’historique des ${revokedCount ?? 0} token(s) révoqué(s) affiché(s) ? Cette action est irréversible.`,
    confirm: 'Vider l’historique',
    loading: 'Suppression…',
  },
};

export function SdkTokenActionModal({
  kind,
  tokenName,
  revokedCount,
  tokenId,
  onClose,
  onCompleted,
}: SdkTokenActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const copy = COPY[kind];

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');

      if (kind === 'revoke') {
        if (!tokenId) {
          setError('Token introuvable.');
          return;
        }
        await sdkTokenService.revoke(tokenId);
        onCompleted('Token révoqué.');
        return;
      }

      if (kind === 'delete-revoked') {
        if (!tokenId) {
          setError('Token introuvable.');
          return;
        }
        await sdkTokenService.removeRevokedFromHistory(tokenId);
        onCompleted('Token supprimé de l’historique.');
        return;
      }

      const res = await sdkTokenService.purgeRevokedHistory();
      onCompleted(
        res.deletedCount > 0
          ? `${res.deletedCount} token(s) révoqué(s) supprimé(s) de l’historique.`
          : 'Aucun token révoqué à supprimer.',
      );
    } catch (err: unknown) {
      const fallback =
        kind === 'revoke'
          ? 'Échec de la révocation'
          : kind === 'delete-revoked'
            ? 'Échec de la suppression'
            : 'Échec du vidage de l’historique';
      setError(getErrorMessage(err, fallback));
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
        aria-labelledby="sdk-token-action-title"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-rose-400/35 bg-rose-500/15 p-2.5">
            <Icons.warning className="h-5 w-5 text-rose-500 dark:text-rose-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="sdk-token-action-title"
              className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
            >
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {kind === 'revoke' && tokenName ? (
                <>
                  Êtes-vous sûr de vouloir révoquer le token{' '}
                  <strong className="font-semibold text-slate-900 dark:text-white">{tokenName}</strong>{' '}
                  ? Les applications qui l’utilisent cesseront de fonctionner.
                </>
              ) : kind === 'delete-revoked' && tokenName ? (
                <>
                  Supprimer définitivement{' '}
                  <strong className="font-semibold text-slate-900 dark:text-white">{tokenName}</strong>{' '}
                  de l’historique ? Cette action est irréversible.
                </>
              ) : (
                copy.description(tokenName, revokedCount)
              )}
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
            onClick={() => void handleConfirm()}
            disabled={loading}
            className={PHOENIX_DESTRUCTIVE_BUTTON_CLASS}
          >
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {copy.loading}
              </>
            ) : (
              copy.confirm
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
