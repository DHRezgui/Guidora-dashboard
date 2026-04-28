'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Mail, X } from 'lucide-react';
import { authService, getErrorMessage } from '@/lib/api';
import { Icons } from '@/components/ui/icons';

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
      // Prevent rapid-fire resend requests
      setRetryAt(Date.now() + 40_000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de l\'envoi'));
    } finally {
      setSending(false);
    }
  };

  const secondsLeft = Math.max(0, Math.ceil((retryAt - nowTs) / 1000));

  return (
    <div className="mx-6 mt-4 animate-slide-up rounded-2xl border border-orange-300/25 bg-[linear-gradient(120deg,rgba(255,107,0,0.16),rgba(187,0,140,0.08)_40%,rgba(15,23,42,0.72))] px-4 py-3 shadow-[0_10px_30px_rgba(2,6,23,0.35)] backdrop-blur-xl md:mx-8">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-orange-300/30 bg-orange-500/15 p-1.5">
          <AlertTriangle className="h-4 w-4 text-orange-200" />
        </div>
        <div className="min-w-0 flex-1 self-center">
          <p className="text-sm text-slate-100">
            {sent ? (
              <>
                <Mail className="mr-1 inline h-3.5 w-3.5 text-orange-200" />
                Email de vérification envoyé à <strong>{userEmail}</strong>. Vérifiez votre boîte de réception.
              </>
            ) : (
              <>Votre adresse email n&apos;est pas vérifiée.</>
            )}
          </p>
          {error && <p className="mt-1 text-[11px] text-red-300">{error}</p>}
        </div>
        <div className="flex items-center gap-2 self-center">
          <button
            onClick={handleResend}
            disabled={sending}
            className="inline-flex h-8 items-center rounded-lg border border-orange-300/40 bg-orange-500/15 px-3 text-xs font-semibold text-orange-100 transition-colors hover:bg-orange-500/25 disabled:opacity-70"
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
          {sent && (
            <button
              onClick={handleResend}
              disabled={sending || secondsLeft > 0}
              className="inline-flex h-8 items-center rounded-lg border border-white/20 bg-slate-950/55 px-3 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending
                ? 'Renvoi...'
                : secondsLeft > 0
                  ? `Renvoyer (${secondsLeft}s)`
                  : 'Renvoyer'}
            </button>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
