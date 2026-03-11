'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
        <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Icons.warning className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">Organisation introuvable</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/organizations">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/organizations">
            <Icons.chevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Modifier l&apos;organisation</h1>
          <p className="text-muted-foreground">{organization.name}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Edit form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
            <CardDescription>Modifiez les informations de l&apos;organisation</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">Clé API</Label>
                <Input id="apiKey" {...register('apiKey')} className="font-mono" />
                {errors.apiKey && (
                  <p className="text-xs text-destructive">{errors.apiKey.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <select
                    id="plan"
                    {...register('plan')}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="FREE">Free</option>
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domaine</Label>
                  <Input id="domain" {...register('domain')} placeholder="exemple.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Max utilisateurs</Label>
                  <Input id="maxUsers" type="number" {...register('maxUsers', { valueAsNumber: true })} />
                  {errors.maxUsers && (
                    <p className="text-xs text-destructive">{errors.maxUsers.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTours">Max parcours</Label>
                  <Input id="maxTours" type="number" {...register('maxTours', { valueAsNumber: true })} />
                  {errors.maxTours && (
                    <p className="text-xs text-destructive">{errors.maxTours.message}</p>
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
                <Label htmlFor="isActive">Organisation active</Label>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-green-50 p-3 text-green-700 text-sm">
                  {success}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/organizations">Annuler</Link>
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Organization info sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
                {organization.name[0].toUpperCase()}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs">{organization.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{organization.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Utilisateurs</span>
                <span className="font-medium">{userCount !== null ? `${userCount} / ${organization.maxUsers}` : '...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut</span>
                <span className={`font-medium ${organization.isActive ? 'text-green-600' : 'text-red-500'}`}>
                  {organization.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créée le</span>
                <span>{organization.createdAt ? new Date(organization.createdAt).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mis à jour</span>
                <span>{organization.updatedAt ? new Date(organization.updatedAt).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
            </div>
            <hr />
            <Button
              variant="destructive"
              className="w-full"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
