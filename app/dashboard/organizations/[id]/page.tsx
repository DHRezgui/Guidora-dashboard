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
import { organizationService, getErrorMessage } from '@/lib/api';
import { Organization } from '@/lib/types';
import Link from 'next/link';

const editOrgSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  apiKey: z.string().min(1, 'La clé API est requise'),
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
  domain: z.string().optional().or(z.literal('')),
  maxTours: z.number().min(1).max(1000),
  maxUsers: z.number().min(1).max(10000),
  isActive: z.boolean(),
});

type EditOrgForm = z.infer<typeof editOrgSchema>;

export default function EditOrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userCount, setUserCount] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditOrgForm>({
    resolver: zodResolver(editOrgSchema),
  });

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await organizationService.getById(params.id as string);
        const org = response.organization;
        if (org) {
          setOrganization(org);
          reset({
            name: org.name,
            apiKey: org.apiKey,
            plan: org.plan,
            domain: org.domain || '',
            maxTours: org.maxTours,
            maxUsers: org.maxUsers,
            isActive: org.isActive,
          });
        }
        // Fetch user count
        try {
          const countRes = await organizationService.getUserCount(params.id as string);
          setUserCount(countRes.count);
        } catch { /* ignore */ }
      } catch {
        setError('Organisation introuvable');
      } finally {
        setLoading(false);
      }
    };
    fetchOrganization();
  }, [params.id, reset]);

  const onSubmit = async (data: EditOrgForm) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const payload = { ...data };
      if (!payload.domain) delete payload.domain;
      const response = await organizationService.update(params.id as string, payload);
      if (response.organization) {
        setOrganization(response.organization);
      }
      setSuccess('Organisation mise à jour avec succès');
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

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <div className="rounded-2xl bg-muted/50 p-4 mb-4">
          <Icons.warning className="h-8 w-8 opacity-40" />
        </div>
        <p className="font-medium">Organisation introuvable</p>
        <Button variant="outline" className="mt-4 rounded-xl" asChild>
          <Link href="/dashboard/organizations">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-lg" asChild>
          <Link href="/dashboard/organizations">
            <Icons.chevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modifier l&apos;organisation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{organization.name}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Edit form */}
        <div className="md:col-span-2 rounded-2xl bg-card border border-border/60 shadow-card">
          <div className="p-6 border-b border-border/60">
            <h2 className="text-lg font-semibold">Informations</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Modifiez les informations de l&apos;organisation</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[13px]">Nom</Label>
                <Input id="name" {...register('name')} className="rounded-xl" />
                {errors.name && (
                  <p className="text-[11px] text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-[13px]">Clé API</Label>
                <Input id="apiKey" {...register('apiKey')} className="font-mono rounded-xl" />
                {errors.apiKey && (
                  <p className="text-[11px] text-destructive">{errors.apiKey.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan" className="text-[13px]">Plan</Label>
                  <select
                    id="plan"
                    {...register('plan')}
                    className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="FREE">Free</option>
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain" className="text-[13px]">Domaine</Label>
                  <Input id="domain" {...register('domain')} placeholder="exemple.com" className="rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers" className="text-[13px]">Max utilisateurs</Label>
                  <Input id="maxUsers" type="number" {...register('maxUsers', { valueAsNumber: true })} className="rounded-xl" />
                  {errors.maxUsers && (
                    <p className="text-[11px] text-destructive">{errors.maxUsers.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTours" className="text-[13px]">Max parcours</Label>
                  <Input id="maxTours" type="number" {...register('maxTours', { valueAsNumber: true })} className="rounded-xl" />
                  {errors.maxTours && (
                    <p className="text-[11px] text-destructive">{errors.maxTours.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="text-[13px]">Organisation active</Label>
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

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-xl" asChild>
                  <Link href="/dashboard/organizations">Annuler</Link>
                </Button>
                <Button type="submit" disabled={saving} className="rounded-xl shadow-soft">
                  {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Organization info sidebar */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-card h-fit">
          <div className="p-6 border-b border-border/60">
            <h2 className="text-lg font-semibold">Détails</h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-soft">
                {organization.name[0].toUpperCase()}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-[11px]">{organization.id}</span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium text-[13px]">{organization.plan}</span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Utilisateurs</span>
                <span className="font-medium text-[13px]">{userCount !== null ? `${userCount} / ${organization.maxUsers}` : '...'}</span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Statut</span>
                <span className={`flex items-center gap-1.5 font-medium text-[13px] ${organization.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${organization.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  {organization.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Créée le</span>
                <span className="text-[13px]">{organization.createdAt ? new Date(organization.createdAt).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Mis à jour</span>
                <span className="text-[13px]">{organization.updatedAt ? new Date(organization.updatedAt).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
            </div>
            <div className="border-t border-border/60 pt-5">
              <Button
                variant="destructive"
                className="w-full rounded-xl"
                size="sm"
                onClick={() => {
                  if (confirm('Supprimer cette organisation ?')) {
                    organizationService.delete(organization.id).then(() => router.push('/dashboard/organizations'));
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
