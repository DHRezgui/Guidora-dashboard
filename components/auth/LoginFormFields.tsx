'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { authService } from '@/lib/api';
import { getDashboardHomeHref, getDashboardRole } from '@/lib/dashboard-roles';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
});

type LoginForm = z.infer<typeof loginSchema>;

/** Champs montés uniquement côté client (évite les mismatches d’hydratation avec les extensions navigateur). */
export function LoginFormFields() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authService.login(data);

      if (response.success) {
        localStorage.setItem('auth_token', response.access_token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        const maxAge = response.expires_in > 0 ? response.expires_in : 3600;
        document.cookie = `auth_token=${response.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
        // Navigation complète : évite ChunkLoadError Turbopack après changement de layout.
        window.location.assign(getDashboardHomeHref(getDashboardRole(response.user)));
        return;
      }

      setError('Réponse de connexion invalide.');
    } catch (err: unknown) {
      const message: string =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erreur de connexion'
          : 'Erreur de connexion';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-5" aria-hidden>
        <div className="h-16 animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/10" />
        <div className="h-16 animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/10" />
        <div className="h-10 animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/10" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" suppressHydrationWarning>
      {error ? (
        <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-destructive text-sm">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[13px]">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="votre@email.com"
          suppressHydrationWarning
          {...register('email')}
          className={`rounded-xl h-10 ${errors.email ? 'border-destructive' : ''}`}
        />
        {errors.email ? <p className="text-[11px] text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[13px]">
          Mot de passe
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          suppressHydrationWarning
          {...register('password')}
          className={`rounded-xl h-10 ${errors.password ? 'border-destructive' : ''}`}
        />
        {errors.password ? (
          <p className="text-[11px] text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="w-full h-10 rounded-xl shadow-soft hover:scale-105 transition-transform active:scale-[0.99]"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            Connexion en cours...
          </>
        ) : (
          'Se connecter'
        )}
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Mot de passe oublié ?
        </Link>
      </div>
    </form>
  );
}
