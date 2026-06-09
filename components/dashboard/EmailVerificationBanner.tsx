'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Mail, X } from 'lucide-react';
import { authService, getErrorMessage } from '@/lib/api';
import { Icons } from '@/components/ui/icons';
import { PHOENIX_PRIMARY_BUTTON_CLASS } from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';

interface EmailVerificationBannerProps {
  userEmail?: string;
}

export default function EmailVerificationBanner({ userEmail }: EmailVerificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState<number>(0);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (retryAt <= Date.now()) return;
    const interval = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [retryAt]);

  if (dismissed) return null;

  const handleResend = async () => {
    const now = Date.now();
    if (now < retryAt) return;

    setSending(true);
    setError('');
    try {
      await authService.resendVerification();
      setSent(true);
      setRetryAt(Date.now() + 40_000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de l\'envoi'));
    } finally {
      setSending(false);
    }
  };

  const secondsLeft = Math.max(0, Math.ceil((retryAt - nowTs) / 1000));

  return (
    <div
      className={cn(
        'mx-6 mt-4 animate-slide-up rounded-2xl px-4 py-3 backdrop-blur-xl md:mx-8',
        'phoenix-glass border-orange-300/50 ring-1 ring-orange-200/70',
        'shadow-[0_12px_32px_rgba(249,115,22,0.1)]',
        'dark:border-orange-300/25 dark:bg-[linear-gradient(120deg,rgba(255,107,0,0.16),rgba(187,0,140,0.08)_40%,rgba(15,23,42,0.72))]',
        'dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)] dark:ring-orange-500/15',
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'rounded-lg border p-1.5',
            'border-orange-300/55 bg-orange-100/90',
            'dark:border-orange-300/30 dark:bg-orange-500/15',
          )}
        >
          <AlertTriangle
            className={cn(
              'h-4 w-4',
              'text-orange-600 dark:text-orange-200',
            )}
          />
        </div>
        <div className="min-w-0 flex-1 self-center">
          <p
            className={cn(
              'text-sm',
              'text-slate-800 dark:text-slate-100',
            )}
          >
            {sent ? (
              <>
                <Mail
                  className={cn(
                    'mr-1 inline h-3.5 w-3.5',
                    'text-orange-600 dark:text-orange-200',
                  )}
                />
                Email de vérification envoyé à <strong>{userEmail}</strong>. Vérifiez votre boîte de réception.
              </>
            ) : (
              <>Votre adresse email n&apos;est pas vérifiée.</>
            )}
          </p>
          {error ? (
            <p className="mt-1 text-[11px] text-rose-600 dark:text-red-300">{error}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 self-center">
          <button
            onClick={handleResend}
            disabled={sending}
            className={cn(
              'inline-flex h-8 items-center px-3 text-xs font-semibold disabled:opacity-70',
              PHOENIX_PRIMARY_BUTTON_CLASS,
            )}
          >
            {sending && !sent ? (
              <>
                <Icons.spinner className="mr-1 h-3 w-3 animate-spin" />
                Envoi...
              </>
            ) : (
              'Envoyer'
            )}
          </button>
          {sent ? (
            <button
              onClick={handleResend}
              disabled={sending || secondsLeft > 0}
              className={cn(
                'inline-flex h-8 items-center rounded-xl border px-3 text-xs font-semibold transition-colors',
                'phoenix-glass border-slate-300/70 text-slate-700 hover:border-orange-400/40 hover:bg-orange-50/80',
                'disabled:cursor-not-allowed disabled:opacity-60',
                'dark:border-white/20 dark:text-slate-100 dark:hover:bg-slate-900/55',
              )}
            >
              {sending
                ? 'Renvoi...'
                : secondsLeft > 0
                  ? `Renvoyer (${secondsLeft}s)`
                  : 'Renvoyer'}
            </button>
          ) : null}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={cn(
            'rounded-lg p-1 transition-colors',
            'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
            'dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
