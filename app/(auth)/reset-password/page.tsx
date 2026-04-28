'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { authService, getErrorMessage } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Icons } from '@/components/ui/icons';
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';

const resetSchema = z.object({
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type ResetForm = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
      setError('Token de réinitialisation manquant');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.resetPassword(token, data.password);
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Token invalide ou expiré'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-sm text-red-200">
          Lien de réinitialisation invalide. Veuillez refaire une demande.
        </div>
        <Link href="/forgot-password" className="block">
          <Button variant="outline" className="h-10 w-full rounded-xl border-white/15 bg-slate-950/55 text-slate-100 hover:bg-slate-900 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Demander un nouveau lien
          </Button>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
          <p className="text-sm text-emerald-100">
            Votre mot de passe a été réinitialisé avec succès !
          </p>
        </div>

        <Link href="/login" className="block">
          <Button className="w-full h-10 rounded-xl shadow-soft">
            Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[13px]">Nouveau mot de passe</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          className={`rounded-xl h-10 ${errors.password ? 'border-destructive' : ''}`}
        />
        {errors.password && (
          <p className="text-[11px] text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-[13px]">Confirmer le mot de passe</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          {...register('confirmPassword')}
          className={`rounded-xl h-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
        />
        {errors.confirmPassword && (
          <p className="text-[11px] text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full h-10 rounded-xl shadow-soft" disabled={isLoading}>
        {isLoading ? (
          <>
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            Réinitialisation...
          </>
        ) : (
          <>
            <KeyRound className="mr-2 h-4 w-4" />
            Réinitialiser le mot de passe
          </>
        )}
      </Button>

      <div className="text-center pt-2">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la connexion
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src="/background_login.jpg"
          alt="Reset password background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.25),transparent_35%),linear-gradient(135deg,rgba(3,7,18,0.82),rgba(2,6,23,0.72)_45%,rgba(15,23,42,0.82))]" />
      </div>

      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        <div className="pointer-events-none absolute -inset-6 rounded-[28px] bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.18),transparent_48%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.14),transparent_52%),radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.14),transparent_58%)] blur-2xl" />
        <div className="relative rounded-2xl bg-card/90 border border-white/15 shadow-elevated shadow-[0_14px_45px_rgba(2,6,23,0.45),0_0_0_1px_rgba(255,255,255,0.03),0_0_28px_rgba(30,64,175,0.12)] backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-0 text-center">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-orange-500 to-pink-600 shadow-soft shadow-[0_0_24px_rgba(255,107,0,0.24)]">
              <KeyRound className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Nouveau mot de passe</h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Choisissez un nouveau mot de passe sécurisé
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
