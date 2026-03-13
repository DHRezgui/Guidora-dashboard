'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { authService, getErrorMessage } from '@/lib/api';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { CheckCircle2, XCircle, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Token de vérification manquant');
      return;
    }

    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setErrorMsg(getErrorMessage(err, 'Token de vérification invalide'));
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Vérification en cours...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl p-3 bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <p className="text-sm text-emerald-700 text-center font-medium">
            Votre adresse email a été vérifiée avec succès !
          </p>
        </div>
        <Link href="/dashboard" className="block">
          <Button className="w-full h-10 rounded-xl shadow-soft">
            Continuer
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-xl p-3 bg-destructive/10">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-sm text-destructive text-center font-medium">{errorMsg}</p>
      </div>
      <Link href="/login" className="block">
        <Button variant="outline" className="w-full h-10 rounded-xl">
          Retour à la connexion
        </Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background gradient decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        <div className="rounded-2xl bg-card border border-border/60 shadow-elevated overflow-hidden">
          <div className="p-8 pb-0 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-soft mb-5">
              <Mail className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Vérification email</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Validation de votre adresse email
            </p>
          </div>

          <div className="p-8">
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
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
