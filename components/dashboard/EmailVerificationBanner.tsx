'use client';

import { useState } from 'react';
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

  if (dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      await authService.resendVerification();
      setSent(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de l\'envoi'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-8 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-100 p-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          {sent ? (
            <p className="text-sm text-amber-800">
              <Mail className="inline h-3.5 w-3.5 mr-1" />
              Email de vérification envoyé à <strong>{userEmail}</strong>. Vérifiez votre boîte de réception.
            </p>
          ) : (
            <p className="text-sm text-amber-800">
              Votre adresse email n&apos;est pas vérifiée.{' '}
              <button
                onClick={handleResend}
                disabled={sending}
                className="font-semibold underline underline-offset-2 hover:text-amber-900 transition-colors"
              >
                {sending ? (
                  <>
                    <Icons.spinner className="inline h-3 w-3 animate-spin mr-1" />
                    Envoi...
                  </>
                ) : (
                  'Renvoyer l\'email de vérification'
                )}
              </button>
            </p>
          )}
          {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
