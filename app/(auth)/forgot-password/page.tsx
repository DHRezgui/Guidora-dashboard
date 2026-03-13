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
              {isSent ? (
                <Mail className="h-7 w-7 text-white" />
              ) : (
                <Icons.logo className="h-7 w-7 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isSent ? 'Email envoyé !' : 'Mot de passe oublié'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isSent
                ? 'Vérifiez votre boîte de réception'
                : 'Entrez votre email pour recevoir un lien de réinitialisation'}
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {isSent ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-700">
                    Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques minutes.
                  </p>
                </div>

                <p className="text-[13px] text-muted-foreground text-center">
                  Pensez à vérifier vos spams si vous ne trouvez pas l&apos;email.
                </p>

                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full h-10 rounded-xl">
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

                <Button type="submit" className="w-full h-10 rounded-xl shadow-soft" disabled={isLoading}>
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
