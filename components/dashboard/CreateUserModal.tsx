'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { userService, getErrorMessage } from '@/lib/api';

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
      if (!payload.organizationName) delete payload.organizationName;
      await userService.create(payload);
      onCreated();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-card border border-border/60 shadow-elevated animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-border/60">
          <h2 className="text-lg font-semibold">Nouvel utilisateur</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted/50 transition-colors">
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
              <select
                id="role"
                {...register('role')}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="USER">Utilisateur</option>
                <option value="DEVELOPER">Développeur</option>
                <option value="ADMIN">Administrateur</option>
              </select>
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
              <Button type="submit" disabled={loading} className="rounded-xl shadow-soft">
                {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
