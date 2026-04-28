'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { userService, getErrorMessage } from '@/lib/api';
import Image from 'next/image';

const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  role: z.enum(['ADMIN', 'DEVELOPER', 'USER']),
  organizationName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type CreateUserForm = z.infer<typeof createUserSchema>;

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'USER',
    },
  });

  const onSubmit = async (data: CreateUserForm) => {
    try {
      setLoading(true);
      setError('');
      const { confirmPassword, ...payload } = data;
      void confirmPassword;
      if (!payload.organizationName) delete payload.organizationName;
      await userService.create(payload);
      onCreated();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  const roleValue = watch('role');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-4xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elevated animate-scale-in">
        <div className="grid md:grid-cols-[260px_1fr]">
          <div className="relative hidden border-r border-border/60 md:block">
            <Image
              src="/handshake.jpg"
              alt="Handshake visual"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.2)_0%,rgba(2,6,23,0.85)_80%)]" />
            <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/15 bg-slate-950/55 p-3 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-200">Nouveau profil</p>
              <p className="mt-1 text-base font-semibold text-white">Renforcez votre equipe avec Guidora.</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between border-b border-border/60 p-6">
              <h2 className="text-lg font-semibold">Nouvel utilisateur</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-muted/50">
                <Icons.close className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-[13px]">Prénom</Label>
                    <Input id="firstName" {...register('firstName')} placeholder="Dhia" className="rounded-xl" />
                    {errors.firstName && (
                      <p className="text-[11px] text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-[13px]">Nom</Label>
                    <Input id="lastName" {...register('lastName')} placeholder="Rezgui" className="rounded-xl" />
                    {errors.lastName && (
                      <p className="text-[11px] text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[13px]">Email</Label>
                  <Input id="email" type="email" {...register('email')} placeholder="dhia@trustdev.com" className="rounded-xl" />
                  {errors.email && (
                    <p className="text-[11px] text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[13px]">Mot de passe</Label>
                  <Input id="password" type="password" {...register('password')} placeholder="••••••••" className="rounded-xl" />
                  {errors.password && (
                    <p className="text-[11px] text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[13px]">Confirmer le mot de passe</Label>
                  <Input id="confirmPassword" type="password" {...register('confirmPassword')} placeholder="••••••••" className="rounded-xl" />
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-[13px]">Rôle</Label>
                  <input type="hidden" {...register('role')} />
                  <Select
                    value={roleValue}
                    onValueChange={(value) => setValue('role', value as CreateUserForm['role'], { shouldValidate: true })}
                  >
                    <SelectTrigger
                      id="role"
                      className="h-9 w-full rounded-xl border-white/15 bg-slate-950/55 px-3 text-sm text-slate-100 hover:border-orange-400/40 focus-visible:ring-orange-400/40 data-[popup-open]:border-orange-400/60"
                    >
                      <SelectValue placeholder="Choisir un rôle" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-white/15 bg-slate-900 text-slate-100 shadow-[0_12px_35px_rgba(2,6,23,0.55)]">
                      <SelectItem value="USER" className="text-slate-100 focus:bg-orange-500/20 focus:text-white">Utilisateur</SelectItem>
                      <SelectItem value="DEVELOPER" className="text-slate-100 focus:bg-orange-500/20 focus:text-white">Développeur</SelectItem>
                      <SelectItem value="ADMIN" className="text-slate-100 focus:bg-orange-500/20 focus:text-white">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-[11px] text-destructive">{errors.role.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-[13px]">Organisation <span className="text-muted-foreground text-[11px]">(optionnel)</span></Label>
                  <Input id="organizationName" {...register('organizationName')} placeholder="Nom de l'organisation" className="rounded-xl" />
                </div>

                {error && (
                  <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(249,115,22,0.32)] active:translate-y-0 active:scale-[0.99]"
                  >
                    {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    Créer
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
