'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { sdkTokenService, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PHOENIX_CHECKBOX_CLASS, PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';

type SdkTokenListItem = {
  id: string;
  name: string;
  tokenSuffix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

const SCOPE_LABELS: Record<string, string> = {
  'tours:runtime': 'Lire tours actifs + progression',
  'tours:sandbox': 'Tester vos parcours sandbox (non visible clients)',
  'blueprints:read': 'Lire blueprints publiés',
  'blueprints:manage': 'Gérer blueprints (admin)',
  'feedback:read': 'Lire agrégats feedback',
  'feedback:write': 'Envoyer feedback',
  'semantic:invoke': 'Inférence sémantique',
  'tours:publish': 'Publier drafts SDK (admin)',
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
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [plaintextToken, setPlaintextToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setSuccess('');
      setPlaintextToken(null);
      const res = await sdkTokenService.create({
        name: name.trim(),
        scopes: selectedScopes.length ? selectedScopes : undefined,
      });
      setPlaintextToken(res.token);
      setName('');
      setSuccess('Token créé — copiez-le maintenant, il ne sera plus affiché.');
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Échec de la création du token'));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Révoquer ce token ? Les applications qui l’utilisent cesseront de fonctionner.')) {
      return;
    }
    try {
      setError('');
      await sdkTokenService.revoke(id);
      setSuccess('Token révoqué.');
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Échec de la révocation'));
    }
  };

  const copyToken = async () => {
    if (!plaintextToken) return;
    try {
      await navigator.clipboard.writeText(plaintextToken);
      setSuccess('Token copié dans le presse-papiers.');
    } catch {
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
    <div className="rounded-2xl border border-slate-200 bg-white/85 shadow-[0_10px_24px_rgba(2,6,23,0.12)] dark:border-white/10 dark:bg-slate-900/55">
      <div className="border-b border-border/60 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tokens d’intégration SDK</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Générez un token d’intégration à portée limitée pour vos applications clientes. Configurez-le
          dans la variable d’environnement{' '}
          <code className="text-xs">NEXT_PUBLIC_TRUSTDEV_SDK_TOKEN</code> de l’application hôte.
        </p>
      </div>

      <div className="space-y-6 p-6">
        {plaintextToken && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Copiez ce token maintenant — il ne sera plus affiché
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">
              {plaintextToken}
            </pre>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => void copyToken()}>
                Copier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPlaintextToken(null)}
              >
                J’ai copié le token
              </Button>
            </div>
          </div>
        )}

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
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-500/10 dark:text-emerald-300">
            {success}
          </div>
        )}

        <div className="border-t border-border/60 pt-4">
          <h3 className="text-sm font-semibold mb-3">Tokens existants</h3>
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
                  <div>
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      …{t.tokenSuffix}
                    </span>
                    {t.revokedAt && (
                      <span className="ml-2 text-xs text-red-500">révoqué</span>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.scopes.join(', ')}
                    </div>
                  </div>
                  {!t.revokedAt && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleRevoke(t.id)}
                    >
                      Révoquer
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
