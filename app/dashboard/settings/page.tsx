'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authService, userService, getErrorMessage } from '@/lib/api';
import { User } from '@/lib/types';
import Link from 'next/link';

const profileSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  role: z.enum(['ADMIN', 'DEVELOPER', 'USER']),
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) return false;
  return true;
}, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });
  const roleValue = watch('role');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userService.getCurrentUser();
        const userData = response.user || response as unknown as User;
        if (userData) {
          setUser(userData);
          const storedUser = authService.getUser();
          setIsAdmin(storedUser?.role === 'ADMIN');
          reset({
            email: userData.email,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            role: userData.role,
            newPassword: '',
            confirmPassword: '',
          });
        }
      } catch {
        setError('Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [reset]);

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const { confirmPassword, ...rest } = data;
      const payload: Record<string, unknown> = { ...rest };
      if (!payload.newPassword) {
        delete payload.newPassword;
      }
      if (!isAdmin) {
        delete payload.role;
      }
      void confirmPassword;
      const response = await userService.update(user.id, payload);
      if (response.user) {
        setUser(response.user);
        const stored = authService.getUser();
        if (stored) {
          const updated = { ...stored, ...response.user };
          localStorage.setItem('user', JSON.stringify(updated));
        }
      }
      setSuccess('Profil mis à jour avec succès');
      reset({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la mise à jour'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Icons.spinner className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-14 top-3 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute right-[-50px] top-28 h-56 w-56 rounded-full bg-pink-500/10 blur-3xl" />
      </div>
      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-[0_14px_30px_rgba(2,6,23,0.12)] dark:border-white/10 dark:shadow-[0_16px_36px_rgba(2,6,23,0.35)]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src="/settings.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(249,115,22,0.14),transparent_40%),linear-gradient(160deg,rgba(255,255,255,0.82),rgba(255,255,255,0.72)_55%,rgba(248,250,252,0.86))] dark:bg-[radial-gradient(circle_at_18%_20%,rgba(249,115,22,0.2),transparent_40%),linear-gradient(160deg,rgba(15,23,42,0.84),rgba(15,23,42,0.78)_55%,rgba(2,6,23,0.9))]" />
        <div className="relative z-10 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Paramètres</h1>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-300">Gérez votre profil, vos préférences et la sécurité de votre compte.</p>
          </div>
          <Button
            variant="outline"
            className="h-10 w-full rounded-xl border-slate-300 bg-white/90 text-slate-700 transition-transform hover:scale-105 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.99] dark:border-white/15 dark:bg-slate-950/55 dark:text-slate-100 dark:hover:bg-slate-900 dark:hover:text-white sm:w-auto"
            asChild
          >
            <Link href="/dashboard">
              <Icons.chevronLeft className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile form */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white/85 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_14px_34px_rgba(2,6,23,0.32)]">
          <div className="p-6 border-b border-border/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Mon profil</h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">Modifiez vos informations personnelles</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-[13px]">Prénom</Label>
                  <Input id="firstName" {...register('firstName')} className="rounded-xl" />
                  {errors.firstName && (
                    <p className="text-[11px] text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[13px]">Nom</Label>
                  <Input id="lastName" {...register('lastName')} className="rounded-xl" />
                  {errors.lastName && (
                    <p className="text-[11px] text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px]">Email</Label>
                <Input id="email" type="email" {...register('email')} className="rounded-xl" />
                {errors.email && (
                  <p className="text-[11px] text-destructive">{errors.email.message}</p>
                )}
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-[13px]">Rôle</Label>
                  <input type="hidden" {...register('role')} />
                  <Select
                    value={roleValue}
                    onValueChange={(value) => setValue('role', value as ProfileForm['role'], { shouldValidate: true, shouldDirty: true })}
                  >
                    <SelectTrigger
                      id="role"
                      className="h-10 w-full rounded-xl border-slate-300 bg-white/90 px-3 text-sm text-slate-700 hover:border-orange-400/40 focus-visible:ring-orange-400/40 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-950/55 dark:text-slate-100"
                    >
                      <SelectValue placeholder="Choisir un rôle" />
                    </SelectTrigger>
                    <SelectContent
                      alignItemWithTrigger={false}
                      side="bottom"
                      sideOffset={8}
                      className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]"
                    >
                      <SelectItem value="ADMIN" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Admin</SelectItem>
                      <SelectItem value="DEVELOPER" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Développeur</SelectItem>
                      <SelectItem value="USER" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Utilisateur</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-[11px] text-destructive">{errors.role.message}</p>
                  )}
                </div>
              )}

              <div className="border-t border-border/60 pt-5 mt-5">
                <h3 className="text-sm font-semibold mb-4">Changer le mot de passe</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-[13px]">Nouveau mot de passe</Label>
                    <Input id="newPassword" type="password" placeholder="Laisser vide pour ne pas changer" {...register('newPassword')} className="rounded-xl" />
                    {errors.newPassword && (
                      <p className="text-[11px] text-destructive">{errors.newPassword.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[13px]">Confirmer le mot de passe</Label>
                    <Input id="confirmPassword" type="password" placeholder="Confirmer le nouveau mot de passe" {...register('confirmPassword')} className="rounded-xl" />
                    {errors.confirmPassword && (
                      <p className="text-[11px] text-destructive">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-destructive text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {success}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl shadow-soft transition-transform hover:scale-105 active:scale-[0.99]"
                >
                  {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Profile card */}
        <div className="h-fit rounded-2xl border border-slate-200 bg-white/85 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_14px_34px_rgba(2,6,23,0.32)]">
          <div className="p-6 border-b border-border/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Mon compte</h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-orange-500 to-pink-600 text-2xl font-bold text-white shadow-soft">
                {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Rôle</span>
                <span className="font-medium text-[13px]">{user?.role}</span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Statut</span>
                <span className={`flex items-center gap-1.5 font-medium text-[13px] ${user?.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${user?.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  {user?.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Email vérifié</span>
                <span className={`flex items-center gap-1.5 font-medium text-[13px] ${user?.emailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${user?.emailVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {user?.emailVerified ? 'Vérifié' : 'Non vérifié'}
                </span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Membre depuis</span>
                <span className="text-[13px]">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
