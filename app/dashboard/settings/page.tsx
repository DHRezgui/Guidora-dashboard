'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { authService, userService, getErrorMessage } from '@/lib/api';
import { User } from '@/lib/types';

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
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

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
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gérez votre profil et vos préférences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile form */}
        <div className="md:col-span-2 rounded-2xl bg-card border border-border/60 shadow-card">
          <div className="p-6 border-b border-border/60">
            <h2 className="text-lg font-semibold">Mon profil</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Modifiez vos informations personnelles</p>
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
                  <select
                    id="role"
                    {...register('role')}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="DEVELOPER">Développeur</option>
                    <option value="USER">Utilisateur</option>
                  </select>
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
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-700 text-sm">
                  {success}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving} className="rounded-xl shadow-soft">
                  {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Profile card */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-card h-fit">
          <div className="p-6 border-b border-border/60">
            <h2 className="text-lg font-semibold">Mon compte</h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-soft">
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
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
