'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { userService, organizationService, getErrorMessage } from '@/lib/api';
import { User, Organization } from '@/lib/types';
import Link from 'next/link';

const editUserSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  role: z.enum(['ADMIN', 'DEVELOPER', 'USER']),
  isActive: z.boolean(),
});

type EditUserForm = z.infer<typeof editUserSchema>;

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orgName, setOrgName] = useState<string | null>(null);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [selectedOrgName, setSelectedOrgName] = useState('');
  const [assigning, setAssigning] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
  });
  const roleValue = watch('role');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await userService.getById(params.id as string);
        const u = response.user;
        if (u) {
          setUser(u);
          reset({
            email: u.email,
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            role: u.role,
            isActive: u.isActive,
          });
          // Fetch organization name if user has one
          if (u.organizationId) {
            try {
              const orgRes = await organizationService.getById(u.organizationId);
              if (orgRes.organization) setOrgName(orgRes.organization.name);
            } catch {
              setOrgName(null);
            }
          }
        }
        // Fetch all orgs for the assign dropdown
        try {
          const orgsRes = await organizationService.getAll();
          setAllOrgs(orgsRes.organizations || []);
        } catch { /* ignore */ }
      } catch {
        setError('Utilisateur introuvable');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [params.id, reset]);

  const onSubmit = async (data: EditUserForm) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await userService.update(params.id as string, data);
      if (response.user) {
        setUser(response.user);
      }
      setSuccess('Utilisateur mis à jour avec succès');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la mise à jour'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignOrg = async () => {
    if (!selectedOrgName) return;
    try {
      setAssigning(true);
      setError('');
      const response = await userService.assignOrganization(params.id as string, selectedOrgName);
      if (response.user) {
        setUser(response.user);
        setOrgName(selectedOrgName);
        setSelectedOrgName('');
      }
      setSuccess('Organisation assignée avec succès');
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur lors de l'assignation"));
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveOrg = async () => {
    try {
      setAssigning(true);
      setError('');
      const response = await userService.removeOrganization(params.id as string);
      if (response.user) {
        setUser(response.user);
        setOrgName(null);
      }
      setSuccess('Organisation retirée avec succès');
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur lors du retrait de l'organisation"));
    } finally {
      setAssigning(false);
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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <div className="rounded-2xl bg-muted/50 p-4 mb-4">
          <Icons.warning className="h-8 w-8 opacity-40" />
        </div>
        <p className="font-medium">Utilisateur introuvable</p>
        <Button variant="outline" className="mt-4 rounded-xl" asChild>
          <Link href="/dashboard/users">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-lg" asChild>
          <Link href="/dashboard/users">
            <Icons.chevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modifier l&apos;utilisateur</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Edit form */}
        <div className="md:col-span-2 rounded-2xl bg-card border border-border/60 shadow-card">
          <div className="p-6 border-b border-border/60">
            <h2 className="text-lg font-semibold">Informations</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Modifiez les informations de l&apos;utilisateur</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="role" className="text-[13px]">Rôle</Label>
                <input type="hidden" {...register('role')} />
                <Select
                  value={roleValue}
                  onValueChange={(value) => setValue('role', value as EditUserForm['role'], { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger
                    id="role"
                    className="h-9 w-full rounded-xl border-slate-300 bg-white/90 px-3 text-sm text-slate-700 hover:border-orange-400/40 focus-visible:ring-orange-400/40 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-950/55 dark:text-slate-100"
                  >
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]">
                    <SelectItem value="USER" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Utilisateur</SelectItem>
                    <SelectItem value="DEVELOPER" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Développeur</SelectItem>
                    <SelectItem value="ADMIN" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  className="h-4 w-4 rounded border-slate-300 bg-white/90 text-orange-500 accent-orange-500 focus:ring-2 focus:ring-orange-400/35 dark:border-white/25 dark:bg-slate-950/55"
                />
                <Label htmlFor="isActive" className="text-[13px]">Compte actif</Label>
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

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-xl" asChild>
                  <Link href="/dashboard/users">Annuler</Link>
                </Button>
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

        {/* User info sidebar */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-card h-fit">
          <div className="p-6 border-b border-border/60">
            <h2 className="text-lg font-semibold">Détails</h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-orange-500 to-pink-600 text-2xl font-bold text-white shadow-soft">
                {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-[11px]">{user.id}</span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Dernière connexion</span>
                <span className="text-[13px]">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Jamais'}</span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Créé le</span>
                <span className="text-[13px]">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Email vérifié</span>
                <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${user.emailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${user.emailVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {user.emailVerified ? 'Vérifié' : 'Non vérifié'}
                </span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Mis à jour</span>
                <span className="text-[13px]">{user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
            </div>
            <div className="border-t border-border/60 pt-5">
              <h4 className="text-sm font-semibold mb-3">Organisation</h4>
              {user.organizationId && orgName ? (
                <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
                  <span className="text-[13px] font-medium">{orgName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={handleRemoveOrg}
                    disabled={assigning}
                  >
                    {assigning ? <Icons.spinner className="h-3 w-3 animate-spin" /> : 'Retirer'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">Aucune organisation assignée</p>
                  <div className="flex gap-1.5">
                    <Select
                      value={selectedOrgName}
                      onValueChange={setSelectedOrgName}
                    >
                    <SelectTrigger className="h-8 w-full rounded-lg border-slate-300 bg-white/90 px-2 text-xs text-slate-700 hover:border-orange-400/40 focus-visible:ring-orange-400/40 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-950/55 dark:text-slate-100">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]">
                        {allOrgs.map((org) => (
                          <SelectItem key={org.id} value={org.name} className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs rounded-lg transition-transform hover:scale-105 active:scale-[0.99]"
                      onClick={handleAssignOrg}
                      disabled={!selectedOrgName || assigning}
                    >
                      {assigning ? <Icons.spinner className="h-3 w-3 animate-spin" /> : 'Assigner'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-border/60 pt-5">
              <Button
                variant="destructive"
                className="w-full rounded-xl transition-transform hover:scale-[1.01] active:scale-[0.99]"
                size="sm"
                onClick={() => {
                  if (confirm('Supprimer cet utilisateur ?')) {
                    userService.delete(user.id).then(() => router.push('/dashboard/users'));
                  }
                }}
              >
                <Icons.trash className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
