'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { authService } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Icons } from '@/components/ui/icons';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authService.login(data);

      if (response.success) {
        localStorage.setItem('auth_token', response.access_token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        document.cookie = `auth_token=${response.access_token}; path=/; max-age=${response.expires_in}`;
        router.push('/dashboard');
        router.refresh();
      }
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

  if (!isClientReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Icons.spinner className="h-4 w-4 animate-spin" />
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src="/background_login.jpg"
          alt="Login background"
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
            <div className="mb-5 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-soft">
              <Icons.logo className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Guidora Onboarding</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Connectez-vous pour accéder au tableau de bord
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  {...register('email')}
                  className={`rounded-xl h-10 ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && (
                  <p className="text-[11px] text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px]">Mot de passe</Label>
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
                <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}