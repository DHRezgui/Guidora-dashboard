'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/ui/icons';
import { authService, organizationService, getErrorMessage } from '@/lib/api';
import axios from 'axios';
import { Organization } from '@/lib/types';
import Link from 'next/link';
import CreateOrganizationModal from '@/components/dashboard/CreateOrganizationModal';
import DeleteOrganizationModal from '@/components/dashboard/DeleteOrganizationModal';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';
import { canManageOrganizations, getDashboardRole } from '@/lib/dashboard-roles';
import { isAdminResourceBeingEdited } from '@/lib/admin-resource-edit-lock';
import DashboardStatGrid from '@/components/dashboard/DashboardStatGrid';
import OrganizationTeamDirectoryPanel from '@/components/dashboard/OrganizationTeamDirectoryPanel';

const planBadgeStyles: Record<string, string> = {
  FREE: 'border border-slate-300/60 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-500/12 dark:text-slate-200',
  STARTER: 'border border-blue-300/50 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/12 dark:text-blue-200',
  PRO: 'border border-purple-300/50 bg-purple-50 text-purple-700 dark:border-purple-400/30 dark:bg-purple-500/12 dark:text-purple-200',
  ENTERPRISE: 'border border-orange-300/50 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/12 dark:text-orange-200',
};

export default function OrganizationsPage() {
  const PAGE_SIZE = 10;
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);
  const [error, setError] = useState('');
  const dashboardRole = getDashboardRole(authService.getUser());
  const canManage = canManageOrganizations(dashboardRole);
  const isDeveloperView = dashboardRole === 'DEVELOPER';
  const primaryOrganization = organizations[0];

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, planFilter, activeFilter, organizations.length]);

  const totalPages = Math.max(1, Math.ceil(filteredOrganizations.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrganizations = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredOrganizations.slice(start, start + PAGE_SIZE);
  }, [filteredOrganizations, safeCurrentPage]);

  const handleCreated = () => {
    setShowCreateModal(false);
    fetchOrganizations();
  };

  const handleDeleted = () => {
    setDeleteOrg(null);
    fetchOrganizations();
  };

  const developerOrgStats = useMemo(
    () => [
      {
        title: 'Plan',
        value: primaryOrganization?.plan ?? '—',
        icon: Icons.planPro,
        tone: 'from-purple-100 to-white dark:from-purple-600/20 dark:to-slate-900/70',
      },
      {
        title: 'Statut',
        value: primaryOrganization?.isActive ? 'Active' : 'Inactive',
        icon: Icons.active,
        tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70',
      },
      {
        title: 'Plafond utilisateurs',
        value: primaryOrganization?.maxUsers ?? 0,
        icon: Icons.users,
        tone: 'from-slate-100 to-white dark:from-slate-800/90 dark:to-slate-900/70',
      },
    ],
    [primaryOrganization],
  );

  return (
    <RoleRouteGuard access="organizations">
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isDeveloperView ? 'Mon organisation' : 'Organisations'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canManage
              ? 'Gérez les organisations clientes et leurs abonnements'
              : 'Consultez votre organisation, votre abonnement et les contacts de votre équipe'}
          </p>
        </div>
        {canManage && (
          <Button
            className="w-full shadow-sm hover:scale-105 transition-transform md:w-auto"
            onClick={() => setShowCreateModal(true)}
          >
            <Icons.plus className="mr-2 h-4 w-4" />
            Nouvelle organisation
          </Button>
        )}
      </div>

      {isDeveloperView ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Abonnement &amp; organisation</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Détails de votre organisation cliente</p>
          </div>
          <DashboardStatGrid stats={developerOrgStats} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { title: 'Total', value: organizations.length, icon: Icons.building, tone: 'from-slate-100 to-white dark:from-slate-800/90 dark:to-slate-900/70' },
            { title: 'Actives', value: organizations.filter((o) => o.isActive).length, icon: Icons.active, tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70' },
            { title: 'Pro', value: organizations.filter((o) => o.plan === 'PRO').length, icon: Icons.planPro, tone: 'from-purple-100 to-white dark:from-purple-600/20 dark:to-slate-900/70' },
            { title: 'Enterprise', value: organizations.filter((o) => o.plan === 'ENTERPRISE').length, icon: Icons.planEnterprise, tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${stat.tone} p-4 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm min-h-[96px] dark:border-white/10 dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-orange-500 dark:border-white/10 dark:bg-slate-950/65 dark:text-orange-300">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isDeveloperView && (
      <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, clé API ou domaine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
          <div className="flex gap-1.5 rounded-xl bg-muted/50 p-1">
            {['ALL', 'FREE', 'STARTER', 'PRO', 'ENTERPRISE'].map((plan) => (
              <button
                key={plan}
                onClick={() => setPlanFilter(plan)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  planFilter === plan
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {plan === 'ALL' ? 'Tous' : plan}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 rounded-xl bg-muted/50 p-1">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setActiveFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeFilter === status
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {status === 'ALL' ? 'Tous' : status === 'ACTIVE' ? 'Actives' : 'Inactives'}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Organizations table + pagination */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Icons.spinner className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Chargement...</span>
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="rounded-2xl bg-muted/50 p-4 mb-4">
              <Icons.building className="h-8 w-8 opacity-40" />
            </div>
            <p className="font-medium">Aucune organisation trouvée</p>
            <p className="text-sm mt-1">Modifiez vos filtres ou créez une nouvelle organisation</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Organisation</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Utilisateurs max</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Créée le</th>
                  {canManage && <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedOrganizations.map((org) => (
                  <tr key={org.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-orange-500 to-pink-600 text-xs font-semibold text-white shadow-soft">
                          {(org.name?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[13px]">{org.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{org.apiKey}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${planBadgeStyles[org.plan] || 'border border-slate-300/60 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-500/12 dark:text-slate-200'}`}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${org.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${org.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        {org.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                      {org.maxUsers} utilisateurs
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                      {org.createdAt ? new Date(org.createdAt).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    {canManage && (
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                          <Link href={`/dashboard/organizations/${org.id}`}>
                            <Icons.edit className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={isAdminResourceBeingEdited(org.editLock)}
                          title={
                            isAdminResourceBeingEdited(org.editLock)
                              ? 'En cours de modification par un autre admin'
                              : 'Supprimer'
                          }
                          onClick={() => setDeleteOrg(org)}
                        >
                          <Icons.trash className="h-3.5 w-3.5" />
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

        {!loading && filteredOrganizations.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 bg-slate-100/70 px-4 py-3 dark:bg-slate-900/35">
            <p className="text-sm text-muted-foreground">
              {filteredOrganizations.length} organisation{filteredOrganizations.length > 1 ? 's' : ''} au total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg"
              >
                Précédent
              </Button>
              <span className="text-sm font-medium text-foreground">
                Page {safeCurrentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-lg"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      {isDeveloperView ? <OrganizationTeamDirectoryPanel /> : null}

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
    </RoleRouteGuard>
  );
}
