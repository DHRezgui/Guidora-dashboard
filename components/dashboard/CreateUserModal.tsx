'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { organizationService, userService, getErrorMessage } from '@/lib/api';
import { Organization } from '@/lib/types';
import Image from 'next/image';

const baseUserFields = {
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
};

const teamUserSchema = z
  .object({
    ...baseUserFields,
    role: z.enum(['DEVELOPER', 'USER']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

const platformAdminSchema = z
  .object({
    ...baseUserFields,
    organizationId: z.string().uuid('Organisation requise'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type TeamUserForm = z.infer<typeof teamUserSchema>;
type PlatformAdminForm = z.infer<typeof platformAdminSchema>;

export type CreateUserModalMode = 'team' | 'platform-admin';

const MODAL_SELECT_TRIGGER_CLASS =
  'h-9 w-full rounded-xl border-slate-300 bg-white/90 px-3 text-sm text-slate-700 hover:border-orange-400/40 focus-visible:ring-orange-400/40 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-950/55 dark:text-slate-100';

const MODAL_SELECT_CONTENT_CLASS =
  'rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]';

const MODAL_SELECT_ITEM_CLASS =
  'text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white';

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => void;
  mode?: CreateUserModalMode;
}

export default function CreateUserModal({
  onClose,
  onCreated,
  mode = 'team',
}: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const isPlatformAdminMode = mode === 'platform-admin';

  const teamForm = useForm<TeamUserForm>({
    resolver: zodResolver(teamUserSchema),
    defaultValues: { role: 'USER' },
  });

  const platformForm = useForm<PlatformAdminForm>({
    resolver: zodResolver(platformAdminSchema),
  });

  useEffect(() => {
    if (!isPlatformAdminMode) return;
    organizationService
      .getAll()
      .then((res) => setOrganizations(res.organizations || []))
      .catch(() => setOrganizations([]));
  }, [isPlatformAdminMode]);

  const onSubmitTeam = async (data: TeamUserForm) => {
    try {
      setLoading(true);
      setError('');
      const { confirmPassword, ...payload } = data;
      void confirmPassword;
      await userService.create(payload);
      onCreated();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPlatform = async (data: PlatformAdminForm) => {
    try {
      setLoading(true);
      setError('');
      const { confirmPassword, organizationId, ...rest } = data;
      void confirmPassword;
      await userService.create({
        ...rest,
        role: 'ADMIN',
        organizationId,
      });
      onCreated();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  const teamRoleValue = teamForm.watch('role');
  const orgIdValue = platformForm.watch('organizationId');

  const title = isPlatformAdminMode ? 'Nouvel administrateur client' : 'Nouveau membre d’équipe';
  const subtitle = isPlatformAdminMode
    ? 'Compte chef d’équipe rattaché à une organisation cliente.'
    : 'Développeur ou utilisateur de votre organisation.';

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
              <p className="mt-1 text-base font-semibold text-white">{subtitle}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between border-b border-border/60 p-6">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-muted/50">
                <Icons.close className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6">
              {isPlatformAdminMode ? (
                <form onSubmit={platformForm.handleSubmit(onSubmitPlatform)} className="space-y-4">
                  <NameEmailPasswordFields
                    register={platformForm.register}
                    errors={platformForm.formState.errors}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="organizationId" className="text-[13px]">Organisation cliente</Label>
                    <input type="hidden" {...platformForm.register('organizationId')} />
                    <Select
                      value={orgIdValue || ''}
                      onValueChange={(value) =>
                        platformForm.setValue('organizationId', value, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger id="organizationId" className={MODAL_SELECT_TRIGGER_CLASS}>
                        <SelectValue placeholder="Sélectionner une organisation..." />
                      </SelectTrigger>
                      <SelectContent
                        alignItemWithTrigger={false}
                        side="bottom"
                        sideOffset={8}
                        className={MODAL_SELECT_CONTENT_CLASS}
                      >
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id} className={MODAL_SELECT_ITEM_CLASS}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {platformForm.formState.errors.organizationId && (
                      <p className="text-[11px] text-destructive">
                        {platformForm.formState.errors.organizationId.message}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Le rôle sera automatiquement <strong>Administrateur organisation</strong>.
                  </p>

                  {error && <ErrorBox message={error} />}

                  <SubmitRow loading={loading} onClose={onClose} />
                </form>
              ) : (
                <form onSubmit={teamForm.handleSubmit(onSubmitTeam)} className="space-y-4">
                  <NameEmailPasswordFields
                    register={teamForm.register}
                    errors={teamForm.formState.errors}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-[13px]">Rôle</Label>
                    <input type="hidden" {...teamForm.register('role')} />
                    <Select
                      value={teamRoleValue}
                      onValueChange={(value) =>
                        teamForm.setValue('role', value as TeamUserForm['role'], { shouldValidate: true })
                      }
                    >
                      <SelectTrigger id="role" className={MODAL_SELECT_TRIGGER_CLASS}>
                        <SelectValue placeholder="Choisir un rôle" />
                      </SelectTrigger>
                      <SelectContent
                        alignItemWithTrigger={false}
                        side="bottom"
                        sideOffset={8}
                        className={MODAL_SELECT_CONTENT_CLASS}
                      >
                        <SelectItem value="USER" className={MODAL_SELECT_ITEM_CLASS}>
                          Utilisateur
                        </SelectItem>
                        <SelectItem value="DEVELOPER" className={MODAL_SELECT_ITEM_CLASS}>
                          Développeur
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Le compte sera rattaché automatiquement à votre organisation.
                  </p>

                  {error && <ErrorBox message={error} />}

                  <SubmitRow loading={loading} onClose={onClose} />
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NameEmailPasswordFields({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm>['register'];
  errors: Record<string, { message?: string } | undefined>;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-[13px]">Prénom</Label>
          <Input id="firstName" {...register('firstName')} placeholder="Dhia" className="rounded-xl" />
          {errors.firstName && <p className="text-[11px] text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-[13px]">Nom</Label>
          <Input id="lastName" {...register('lastName')} placeholder="Rezgui" className="rounded-xl" />
          {errors.lastName && <p className="text-[11px] text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[13px]">Email</Label>
        <Input id="email" type="email" {...register('email')} placeholder="dhia@trustdev.com" className="rounded-xl" />
        {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-[13px]">Mot de passe</Label>
        <Input id="password" type="password" {...register('password')} placeholder="••••••••" className="rounded-xl" />
        {errors.password && <p className="text-[11px] text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-[13px]">Confirmer le mot de passe</Label>
        <Input id="confirmPassword" type="password" {...register('confirmPassword')} placeholder="••••••••" className="rounded-xl" />
        {errors.confirmPassword && (
          <p className="text-[11px] text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>
    </>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-destructive text-sm">
      {message}
    </div>
  );
}

function SubmitRow({ loading, onClose }: { loading: boolean; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
        Annuler
      </Button>
      <Button
        type="submit"
        disabled={loading}
        className="rounded-xl shadow-soft transition-transform hover:scale-105 hover:from-orange-400 hover:to-pink-500 active:scale-[0.99] disabled:hover:scale-100"
      >
        {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
        Créer
      </Button>
    </div>
  );
}
