'use client';

import { useState } from 'react';
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
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

const forgotSchema = z.object({
  email: z.string().email('Email invalide'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    setError('');

    try {
      await authService.forgotPassword(data.email);
      setIsSent(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Une erreur est survenue'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src="/background_login.jpg"
          alt="Forgot password background"
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
            <div className={`mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-soft ${isSent ? 'border border-white/15 bg-gradient-to-br from-orange-500 to-pink-600 shadow-[0_0_28px_rgba(255,107,0,0.28)]' : 'overflow-hidden'}`}>
              {isSent ? (
                <Mail className="h-7 w-7 text-white" />
              ) : (
                <Icons.logo className="h-full w-full object-contain" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              {isSent ? 'Email envoyé !' : 'Mot de passe oublié'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              {isSent
                ? 'Vérifiez votre boîte de réception'
                : 'Entrez votre email pour recevoir un lien de réinitialisation'}
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {isSent ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                  <p className="text-sm text-emerald-100">
                    Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques minutes.
                  </p>
                </div>

                <p className="text-center text-[13px] text-slate-300">
                  Pensez à vérifier vos spams si vous ne trouvez pas l&apos;email.
                </p>

                <Link href="/login" className="block">
                  <Button
                    variant="outline"
                    className="h-10 w-full rounded-xl border-white/15 bg-slate-950/55 text-slate-100 hover:bg-slate-900 hover:text-white hover:scale-105 transition-transform active:scale-[0.99]"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                  <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[13px]">Adresse email</Label>
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

                <Button
                  type="submit"
                  className="w-full h-10 rounded-xl shadow-soft hover:scale-105 transition-transform active:scale-[0.99]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Envoyer le lien
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
