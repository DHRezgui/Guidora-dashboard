'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { sdkTokenService, getErrorMessage } from '@/lib/api';
import {
  clearSdkTokenPlaintextSession,
  formatSdkTokenPlaintextRemaining,
  getSdkTokenPlaintextRemainingMs,
  markSdkTokenPlaintextCopied,
  plaintextSessionMatchesRevokedToken,
  readSdkTokenPlaintextSession,
  startSdkTokenPlaintextSession,
} from '@/lib/sdk-token-plaintext-session';
import { cn } from '@/lib/utils';
import {
  PHOENIX_ALERT_SUCCESS_PANEL_CLASS,
  PHOENIX_ALERT_TIMER_BADGE_CLASS,
  PHOENIX_ALERT_WARNING_ICON_WRAP_CLASS,
  PHOENIX_ALERT_WARNING_PANEL_CLASS,
  PHOENIX_CHECKBOX_CLASS,
  PHOENIX_DESTRUCTIVE_BUTTON_CLASS,
  PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
  PHOENIX_PRIMARY_BUTTON_CLASS,
  PHOENIX_SECRET_CODE_BLOCK_CLASS,
} from '@/lib/phoenix-ui';
import {
  SdkTokenActionModal,
  type SdkTokenActionModalKind,
} from '@/components/settings/SdkTokenActionModal';
import { SdkIntegrationGuidanceCollapsible } from '@/components/settings/SdkIntegrationGuidanceCollapsible';

type SdkTokenListItem = {
  id: string;
  name: string;
  tokenSuffix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
};

const DEFAULT_TOKEN_TTL_DAYS = 90;

/** Durées d’auto-masquage des notifications de succès (ms). Les erreurs restent affichées. */
const SDK_TOKEN_COPY_NOTICE_MS = 4_000;
const SDK_TOKEN_CREATION_NOTICE_MS = 8_000;
const SDK_TOKEN_LIST_NOTICE_MS = 6_000;

const SCOPE_LABELS: Record<string, string> = {
  'tours:runtime': 'Lire tours actifs + progression',
  'tours:sandbox': 'Tester vos parcours sandbox (non visible clients)',
  'blueprints:read': 'Lire blueprints publiés',
  'feedback:read': 'Lire agrégats feedback',
  'feedback:write': 'Envoyer feedback',
  'semantic:invoke': 'Inférence sémantique',
  'faq:search': 'Recherche FAQ sémantique',
  'tours:publish': 'Soumettre des brouillons SDK (sandbox)',
};

export function SdkIntegrationTokensSection({
  isAdmin,
  canManage,
}: {
  isAdmin: boolean;
  canManage: boolean;
}) {
  const [tokens, setTokens] = useState<SdkTokenListItem[]>([]);
  const [catalogScopes, setCatalogScopes] = useState<string[]>([]);
  const [adminOnlyScopes, setAdminOnlyScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(DEFAULT_TOKEN_TTL_DAYS);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [plaintextToken, setPlaintextToken] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [error, setError] = useState('');
  const [creationNotice, setCreationNotice] = useState('');
  const [listNotice, setListNotice] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    kind: SdkTokenActionModalKind;
    tokenId?: string;
    tokenName?: string;
    revokedCount?: number;
  } | null>(null);

  useEffect(() => {
    if (!copySuccess) return;
    const id = window.setTimeout(() => setCopySuccess(''), SDK_TOKEN_COPY_NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [copySuccess]);

  useEffect(() => {
    if (!creationNotice) return;
    const id = window.setTimeout(() => setCreationNotice(''), SDK_TOKEN_CREATION_NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [creationNotice]);

  useEffect(() => {
    if (!listNotice) return;
    const id = window.setTimeout(() => setListNotice(''), SDK_TOKEN_LIST_NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [listNotice]);

  const load = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    try {
      setError('');
      const [listRes, catalogRes] = await Promise.all([
        sdkTokenService.list(),
        sdkTokenService.getCatalog(),
      ]);
      setTokens(listRes.tokens ?? []);
      const catalog = catalogRes.catalog;
      setCatalogScopes(catalog?.scopes ?? []);
      setAdminOnlyScopes(catalog?.adminOnly ?? []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Impossible de charger les tokens SDK'));
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    return () => {
      clearSdkTokenPlaintextSession();
    };
  }, []);

  useEffect(() => {
    if (!plaintextToken) {
      return;
    }

    const tick = () => {
      const session = readSdkTokenPlaintextSession();
      if (!session) {
        setPlaintextToken(null);
        setRemainingMs(0);
        setTokenCopied(false);
        setCopySuccess('');
        return;
      }

      const remaining = getSdkTokenPlaintextRemainingMs(session);
      if (remaining <= 0) {
        clearSdkTokenPlaintextSession();
        setPlaintextToken(null);
        setRemainingMs(0);
        setTokenCopied(false);
        setCopySuccess('');
        setCreationNotice('');
        return;
      }

      setRemainingMs(remaining);
      setPlaintextToken(session.token);
      setTokenCopied(session.copied);
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [plaintextToken]);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const catalogRes = await sdkTokenService.getCatalog();
        const catalog = catalogRes.catalog;
        const defaults = ((catalog?.scopes ?? []) as string[]).filter(
          (s) => !(catalog?.adminOnly ?? []).includes(s),
        );
        setSelectedScopes(defaults);
      } catch {
        /* defaults optional */
      }
      await load();
    })();
  }, [canManage, load]);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Indiquez un nom pour identifier ce token.');
      return;
    }
    try {
      setCreating(true);
      setError('');
      setCreationNotice('');
      setListNotice('');
      setCopySuccess('');
      setTokenCopied(false);
      clearSdkTokenPlaintextSession();
      setPlaintextToken(null);
      const res = await sdkTokenService.create({
        name: name.trim(),
        scopes: selectedScopes.length ? selectedScopes : undefined,
        expiresInDays,
      });
      const session = startSdkTokenPlaintextSession(res.token, res.tokenRecord?.id);
      setPlaintextToken(session.token);
      setRemainingMs(getSdkTokenPlaintextRemainingMs(session));
      setName('');
      setCreationNotice(
        'Token créé — vous disposez de 10 minutes pour le copier depuis cette page.',
      );
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Échec de la création du token'));
    } finally {
      setCreating(false);
    }
  };

  const revokedTokens = useMemo(
    () => tokens.filter((token) => Boolean(token.revokedAt)),
    [tokens],
  );

  const dismissPlaintextTokenDisplay = useCallback(() => {
    clearSdkTokenPlaintextSession();
    setPlaintextToken(null);
    setRemainingMs(0);
    setTokenCopied(false);
    setCopySuccess('');
    setCreationNotice('');
  }, []);

  const handleTokenActionCompleted = async (message: string) => {
    const action = pendingAction;
    setPendingAction(null);
    setError('');
    setListNotice(message);

    if (action?.kind === 'revoke' && action.tokenId) {
      const revoked = tokens.find((token) => token.id === action.tokenId);
      const session = readSdkTokenPlaintextSession();
      if (
        session &&
        plaintextSessionMatchesRevokedToken(session, action.tokenId, revoked?.tokenSuffix)
      ) {
        dismissPlaintextTokenDisplay();
      }
    }

    await load();
  };

  const copyToken = async () => {
    if (!plaintextToken) return;
    try {
      await navigator.clipboard.writeText(plaintextToken);
      markSdkTokenPlaintextCopied();
      setTokenCopied(true);
      setCopySuccess('Token copié dans le presse-papiers.');
      setCreationNotice('');
    } catch {
      setCopySuccess('');
      setError('Copie impossible — sélectionnez le token manuellement.');
    }
  };

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/85 p-6 dark:border-white/10 dark:bg-slate-900/55">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tokens SDK</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Réservé aux comptes Admin ou Développeur avec une organisation.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <SdkIntegrationGuidanceCollapsible />

      <div className="rounded-2xl border border-slate-200 bg-white/85 shadow-[0_10px_24px_rgba(2,6,23,0.12)] dark:border-white/10 dark:bg-slate-900/55">
        <div className="border-b border-border/60 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tokens d’intégration SDK</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Créez et gérez les tokens d&apos;accès pour vos applications clientes (scopes limités, révocables).
          </p>
        </div>

        <div className="space-y-6 p-6">
        {plaintextToken && remainingMs > 0 ? (
          <div className={PHOENIX_ALERT_WARNING_PANEL_CLASS}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className={PHOENIX_ALERT_WARNING_ICON_WRAP_CLASS}>
                  <Icons.key className="h-5 w-5 text-orange-500 dark:text-amber-300" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Copiez ce token avant la fin du délai — il ne sera plus affiché après expiration.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {tokenCopied
                      ? 'Le token reste visible sur cette page jusqu’à la fin du délai ou si vous quittez l’écran.'
                      : 'Copiez-le maintenant : un rechargement de page ou une navigation ailleurs le masque définitivement.'}
                  </p>
                </div>
              </div>
              <span className={PHOENIX_ALERT_TIMER_BADGE_CLASS} aria-live="polite">
                Temps restant :{' '}
                <span className="font-mono">{formatSdkTokenPlaintextRemaining(remainingMs)}</span>
              </span>
            </div>
            <pre className={cn('mt-3', PHOENIX_SECRET_CODE_BLOCK_CLASS)}>{plaintextToken}</pre>
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                onClick={() => void copyToken()}
                className={cn(PHOENIX_MODAL_CANCEL_BUTTON_CLASS, 'h-8 px-3 text-xs')}
              >
                Copier
              </Button>
            </div>
          </div>
        ) : null}

        {copySuccess || (creationNotice && plaintextToken && remainingMs > 0) ? (
          <div className={PHOENIX_ALERT_SUCCESS_PANEL_CLASS} role="status" aria-live="polite">
            {copySuccess || creationNotice}
          </div>
        ) : null}

        <div className="space-y-3">
          <Label htmlFor="sdk-token-name">Nom du token</Label>
          <Input
            id="sdk-token-name"
            placeholder="Ex. Nom-de-l-application"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="sdk-token-expiry">Expiration (jours)</Label>
          <Input
            id="sdk-token-expiry"
            type="number"
            min={7}
            max={365}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value) || DEFAULT_TOKEN_TTL_DAYS)}
            className="max-w-[10rem] rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            Obligatoire en production (défaut {DEFAULT_TOKEN_TTL_DAYS} jours, max 365).
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-[13px]">Permissions (scopes)</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {catalogScopes.map((scope) => {
              const adminOnly = adminOnlyScopes.includes(scope);
              const disabled = adminOnly && !isAdmin;
              const checked = selectedScopes.includes(scope);
              return (
                <label
                  key={scope}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors',
                    disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'border-slate-200 hover:border-orange-400/35 dark:border-white/10 dark:hover:border-orange-400/25',
                    checked &&
                      !disabled &&
                      'border-orange-400/40 bg-orange-500/[0.06] dark:border-orange-400/30 dark:bg-orange-500/10',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggleScope(scope)}
                    className={cn('mt-0.5', PHOENIX_CHECKBOX_CLASS)}
                    aria-label={SCOPE_LABELS[scope] ?? scope}
                  />
                  <span>
                    <span className="font-mono text-xs">{scope}</span>
                    <span className="mt-0.5 block text-muted-foreground text-xs">
                      {SCOPE_LABELS[scope] ?? scope}
                      {adminOnly ? ' (admin)' : ''}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          disabled={creating}
          onClick={() => void handleCreate()}
          className={PHOENIX_PRIMARY_BUTTON_CLASS}
        >
          {creating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Générer un token
        </Button>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="border-t border-border/60 pt-4">
          {listNotice ? (
            <div className={cn('mb-4', PHOENIX_ALERT_SUCCESS_PANEL_CLASS)} role="status" aria-live="polite">
              {listNotice}
            </div>
          ) : null}
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Tokens existants</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Chaque compte ne voit que ses propres tokens. Les tokens révoqués restent visibles 30 jours,
                ou supprimez-les manuellement ci-dessous. Sans action, ils disparaissent automatiquement de
                cette liste après 30 jours.
              </p>
            </div>
            {revokedTokens.length > 0 ? (
              <Button
                type="button"
                onClick={() =>
                  setPendingAction({
                    kind: 'purge-revoked-history',
                    revokedCount: revokedTokens.length,
                  })
                }
                className={cn(
                  PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
                  'h-8 shrink-0 px-3 text-xs text-rose-700 dark:text-rose-200',
                )}
              >
                <Icons.trash className="mr-1.5 h-3.5 w-3.5" />
                Vider l&apos;historique révoqué ({revokedTokens.length})
              </Button>
            ) : null}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icons.spinner className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun token pour cette organisation.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      …{t.tokenSuffix}
                    </span>
                    {t.revokedAt && (
                      <span className="ml-2 text-xs text-red-500">
                        révoqué le{' '}
                        {new Date(t.revokedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.scopes.join(', ')}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {t.expiresAt ? (
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        expire le{' '}
                        {new Date(t.expiresAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    ) : null}
                    {!t.revokedAt ? (
                      <Button
                        type="button"
                        onClick={() =>
                          setPendingAction({
                            kind: 'revoke',
                            tokenId: t.id,
                            tokenName: t.name,
                          })
                        }
                        className={cn(PHOENIX_DESTRUCTIVE_BUTTON_CLASS, 'h-8 px-3 text-xs')}
                      >
                        Révoquer
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() =>
                          setPendingAction({
                            kind: 'delete-revoked',
                            tokenId: t.id,
                            tokenName: t.name,
                          })
                        }
                        className={cn(
                          PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
                          'h-8 px-3 text-xs text-rose-700 dark:text-rose-200',
                        )}
                      >
                        <Icons.trash className="mr-1.5 h-3.5 w-3.5" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      </div>

      {pendingAction ? (
        <SdkTokenActionModal
          kind={pendingAction.kind}
          tokenId={pendingAction.tokenId}
          tokenName={pendingAction.tokenName}
          revokedCount={pendingAction.revokedCount}
          onClose={() => setPendingAction(null)}
          onCompleted={(message) => void handleTokenActionCompleted(message)}
        />
      ) : null}
    </div>
  );
}
