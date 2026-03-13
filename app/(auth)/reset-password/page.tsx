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
        <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 text-sm text-destructive">
          Lien de réinitialisation invalide. Veuillez refaire une demande.
        </div>
        <Link href="/forgot-password" className="block">
          <Button variant="outline" className="w-full h-10 rounded-xl">
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
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700">
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
      {/* Background gradient decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        <div className="rounded-2xl bg-card border border-border/60 shadow-elevated overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-0 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-soft mb-5">
              <KeyRound className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Nouveau mot de passe</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
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
