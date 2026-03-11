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
    formState: { errors },
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
  });

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
        <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Icons.warning className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">Utilisateur introuvable</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/users">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/users">
            <Icons.chevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Modifier l&apos;utilisateur</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Edit form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
            <CardDescription>Modifiez les informations de l&apos;utilisateur</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <select
                  id="role"
                  {...register('role')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="USER">Utilisateur</option>
                  <option value="DEVELOPER">Développeur</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive">Compte actif</Label>
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
                  <Link href="/dashboard/users">Annuler</Link>
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* User info sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
                {user.firstName?.[0] || user.email[0].toUpperCase()}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dernière connexion</span>
                <span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Jamais'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créé le</span>
                <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mis à jour</span>
                <span>{user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
            </div>
            <hr />
            {/* Organization section */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Organisation</h4>
              {user.organizationId && orgName ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm font-medium">{orgName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={handleRemoveOrg}
                      disabled={assigning}
                    >
                      {assigning ? <Icons.spinner className="h-3 w-3 animate-spin" /> : 'Retirer'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Aucune organisation assignée</p>
                  <div className="flex gap-1">
                    <select
                      value={selectedOrgName}
                      onChange={(e) => setSelectedOrgName(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Sélectionner...</option>
                      {allOrgs.map((org) => (
                        <option key={org.id} value={org.name}>{org.name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleAssignOrg}
                      disabled={!selectedOrgName || assigning}
                    >
                      {assigning ? <Icons.spinner className="h-3 w-3 animate-spin" /> : 'Assigner'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <hr />
            <Button
              variant="destructive"
              className="w-full"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
