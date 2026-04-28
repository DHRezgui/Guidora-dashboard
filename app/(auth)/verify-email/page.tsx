'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { authService, getErrorMessage } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Icons } from '@/components/ui/icons';
import { CheckCircle2, XCircle, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('Token de vérification manquant');

  useEffect(() => {
    if (!token) return;

    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setErrorMsg(getErrorMessage(err, 'Token de vérification invalide'));
      });
  }, [token]);

  if (!token) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3">
            <XCircle className="h-8 w-8 text-red-300" />
          </div>
          <p className="text-center text-sm font-medium text-red-200">{errorMsg}</p>
        </div>
        <Link href="/login" className="block">
          <Button
            variant="outline"
            className="h-10 w-full rounded-xl border-white/15 bg-slate-950/55 text-slate-100 hover:bg-slate-900 hover:text-white hover:scale-105 transition-transform active:scale-[0.99]"
          >
            Retour à la connexion
          </Button>
        </Link>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-slate-300">Vérification en cours...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          </div>
          <p className="text-center text-sm font-medium text-emerald-100">
            Votre adresse email a été vérifiée avec succès !
          </p>
        </div>
        <Link href="/dashboard" className="block">
          <Button className="w-full h-10 rounded-xl shadow-soft hover:scale-105 transition-transform active:scale-[0.99]">
            Continuer
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3">
          <XCircle className="h-8 w-8 text-red-300" />
        </div>
        <p className="text-center text-sm font-medium text-red-200">{errorMsg}</p>
      </div>
      <Link href="/login" className="block">
        <Button
          variant="outline"
          className="h-10 w-full rounded-xl border-white/15 bg-slate-950/55 text-slate-100 hover:bg-slate-900 hover:text-white hover:scale-105 transition-transform active:scale-[0.99]"
        >
          Retour à la connexion
        </Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src="/background_login.jpg"
          alt="Verify email background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.25),transparent_35%),linear-gradient(135deg,rgba(3,7,18,0.82),rgba(2,6,23,0.72)_45%,rgba(15,23,42,0.82))]" />
      </div>

      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        <div className="pointer-events-none absolute -inset-6 rounded-[28px] bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.18),transparent_48%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.14),transparent_52%),radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.14),transparent_58%)] blur-2xl" />
        <div className="relative rounded-2xl border border-white/15 bg-card/90 shadow-elevated shadow-[0_14px_45px_rgba(2,6,23,0.45),0_0_0_1px_rgba(255,255,255,0.03),0_0_28px_rgba(30,64,175,0.12)] backdrop-blur-xl overflow-hidden">
          <div className="p-8 pb-0 text-center">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-orange-500 to-pink-600 shadow-soft shadow-[0_0_24px_rgba(255,107,0,0.24)]">
              <Mail className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Vérification email</h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Validation de votre adresse email
            </p>
          </div>

          <div className="p-8">
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-6 w-6 animate-spin text-slate-300" />
              </div>
            }>
              <VerifyEmailContent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
