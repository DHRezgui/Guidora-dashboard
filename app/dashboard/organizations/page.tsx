'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/ui/icons';
import { authService, organizationService, getErrorMessage } from '@/lib/api';
import axios from 'axios';
import { Organization } from '@/lib/types';
import Link from 'next/link';
import CreateOrganizationModal from '@/components/dashboard/CreateOrganizationModal';
import DeleteOrganizationModal from '@/components/dashboard/DeleteOrganizationModal';

const planBadgeColors: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);
  const [error, setError] = useState('');
  const isAdmin = authService.getUser()?.role === 'ADMIN';

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await organizationService.getAll();
      setOrganizations(response.organizations || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Permission non accordée — vous n\'avez pas accès à cette ressource');
      } else {
        setError(getErrorMessage(err, 'Erreur lors du chargement des organisations'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    let result = organizations;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.apiKey.toLowerCase().includes(q) ||
          o.domain?.toLowerCase().includes(q)
      );
    }

    if (planFilter !== 'ALL') {
      result = result.filter((o) => o.plan === planFilter);
    }

    if (activeFilter !== 'ALL') {
      result = result.filter((o) => activeFilter === 'ACTIVE' ? o.isActive : !o.isActive);
    }

    setFilteredOrganizations(result);
  }, [organizations, searchQuery, planFilter, activeFilter]);

  const handleCreated = () => {
    setShowCreateModal(false);
    fetchOrganizations();
  };

  const handleDeleted = () => {
    setDeleteOrg(null);
    fetchOrganizations();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organisations</h1>
          <p className="text-muted-foreground">Gérez les organisations clientes et leurs abonnements</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Icons.plus className="mr-2 h-4 w-4" />
            Nouvelle organisation
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Icons.building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actives</CardTitle>
            <Icons.active className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.filter((o) => o.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro</CardTitle>
            <Icons.admin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.filter((o) => o.plan === 'PRO').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enterprise</CardTitle>
            <Icons.admin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.filter((o) => o.plan === 'ENTERPRISE').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 border rounded-lg p-2">
              <Icons.search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, clé API ou domaine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex gap-2 border rounded-lg p-2">
              {['ALL', 'FREE', 'STARTER', 'PRO', 'ENTERPRISE'].map((plan) => (
                <Button
                  key={plan}
                  variant={planFilter === plan ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlanFilter(plan)}
                >
                  {plan === 'ALL' ? 'Tous' : plan}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 border rounded-lg p-2">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
                <Button
                  key={status}
                  variant={activeFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter(status)}
                >
                  {status === 'ALL' ? 'Tous' : status === 'ACTIVE' ? 'Actives' : 'Inactives'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Organizations table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement...</span>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Icons.building className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">Aucune organisation trouvée</p>
              <p className="text-sm">Modifiez vos filtres ou créez une nouvelle organisation</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organisation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Limites</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Créée le</th>
                    {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrganizations.map((org) => (
                    <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                            {org.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{org.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{org.apiKey}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${planBadgeColors[org.plan] || 'bg-gray-100 text-gray-700'}`}>
                          {org.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${org.isActive ? 'text-green-600' : 'text-red-500'}`}>
                          <span className={`h-2 w-2 rounded-full ${org.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                          {org.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <div>{org.maxUsers} utilisateurs</div>
                        <div>{org.maxTours} parcours</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {org.createdAt ? new Date(org.createdAt).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/organizations/${org.id}`}>
                              <Icons.edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteOrg(org)}
                          >
                            <Icons.trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {deleteOrg && (
        <DeleteOrganizationModal
          organization={deleteOrg}
          onClose={() => setDeleteOrg(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
