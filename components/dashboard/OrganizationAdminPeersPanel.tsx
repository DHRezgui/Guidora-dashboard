'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { authService, getErrorMessage, userService } from '@/lib/api';
import { User } from '@/lib/types';
import { getDashboardRole, isOrgAdmin } from '@/lib/dashboard-roles';
import DashboardStatGrid from '@/components/dashboard/DashboardStatGrid';
import axios from 'axios';

const PAGE_SIZE = 10;

export default function OrganizationAdminPeersPanel() {
  const currentUser = authService.getUser();
  const showPanel = isOrgAdmin(getDashboardRole(currentUser));

  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAdmins = useCallback(async () => {
    if (!showPanel) return;
    try {
      setLoading(true);
      setError('');
      const response = await userService.getOrganizationAdminPeers();
      setAdmins(response.users || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Permission non accordée — vous n\'avez pas accès à cette ressource');
      } else {
        setError(getErrorMessage(err, 'Erreur lors du chargement des administrateurs'));
      }
    } finally {
      setLoading(false);
    }
  }, [showPanel]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const filteredAdmins = useMemo(() => {
    let result = admins;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (admin) =>
          admin.id.toLowerCase().includes(q) ||
          admin.email.toLowerCase().includes(q) ||
          admin.firstName?.toLowerCase().includes(q) ||
          admin.lastName?.toLowerCase().includes(q),
      );
    }

    if (activeFilter !== 'ALL') {
      result = result.filter((admin) =>
        activeFilter === 'ACTIVE' ? admin.isActive : !admin.isActive,
      );
    }

    return result;
  }, [admins, searchQuery, activeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, admins.length]);

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAdmins = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredAdmins.slice(start, start + PAGE_SIZE);
  }, [filteredAdmins, safeCurrentPage]);

  const adminPeerStats = useMemo(
    () => [
      {
        title: 'Administrateurs',
        value: admins.length,
        icon: Icons.admin,
        tone: 'from-rose-100 to-white dark:from-rose-600/20 dark:to-slate-900/70',
      },
      {
        title: 'Actifs',
        value: admins.filter((admin) => admin.isActive).length,
        icon: Icons.active,
        tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70',
      },
    ],
    [admins],
  );

  if (!showPanel) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Administrateurs de l&apos;organisation</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Autres comptes administrateur de votre organisation (hors votre compte)
        </p>
      </div>

      <DashboardStatGrid stats={adminPeerStats} />

      <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par ID, nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
            />
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
                {status === 'ALL' ? 'Tous' : status === 'ACTIVE' ? 'Actifs' : 'Inactifs'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Icons.spinner className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Chargement...</span>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="rounded-2xl bg-muted/50 p-4 mb-4">
              <Icons.admin className="h-8 w-8 opacity-40" />
            </div>
            <p className="font-medium">Aucun autre administrateur trouvé</p>
            <p className="text-sm mt-1">Modifiez vos filtres ou vous êtes le seul admin de l&apos;organisation</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Administrateur
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Créé le
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Dernière connexion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-rose-500 to-orange-600 text-xs font-semibold text-white shadow-soft">
                          {(admin.firstName?.[0] || admin.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[13px]">
                            {admin.firstName && admin.lastName
                              ? `${admin.firstName} ${admin.lastName}`
                              : admin.email}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                          admin.isActive ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            admin.isActive ? 'bg-emerald-500' : 'bg-red-400'
                          }`}
                        />
                        {admin.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                      {new Date(admin.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredAdmins.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 bg-slate-100/70 px-4 py-3 dark:bg-slate-900/35">
            <p className="text-sm text-muted-foreground">
              {filteredAdmins.length} administrateur{filteredAdmins.length > 1 ? 's' : ''} au total
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
    </div>
  );
}
