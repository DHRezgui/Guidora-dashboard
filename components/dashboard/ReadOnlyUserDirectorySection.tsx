'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { User } from '@/lib/types';
import DashboardStatGrid, { type DashboardStatItem } from '@/components/dashboard/DashboardStatGrid';

const PAGE_SIZE = 10;

type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export type ReadOnlyUserDirectorySectionProps = {
  title: string;
  subtitle: string;
  users: User[];
  loading: boolean;
  error?: string;
  stats: DashboardStatItem[];
  emptyTitle: string;
  emptyHint: string;
  userColumnLabel?: string;
  avatarGradient?: string;
};

export default function ReadOnlyUserDirectorySection({
  title,
  subtitle,
  users,
  loading,
  error,
  stats,
  emptyTitle,
  emptyHint,
  userColumnLabel = 'Utilisateur',
  avatarGradient = 'from-orange-500 to-pink-600',
}: ReadOnlyUserDirectorySectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.id.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.firstName?.toLowerCase().includes(q) ||
          user.lastName?.toLowerCase().includes(q),
      );
    }

    if (activeFilter !== 'ALL') {
      result = result.filter((user) =>
        activeFilter === 'ACTIVE' ? user.isActive : !user.isActive,
      );
    }

    return result;
  }, [users, searchQuery, activeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, users.length]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, safeCurrentPage]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      <DashboardStatGrid stats={stats} />

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

      {error ? (
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-destructive text-sm">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Icons.spinner className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Chargement...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="rounded-2xl bg-muted/50 p-4 mb-4">
              <Icons.users className="h-8 w-8 opacity-40" />
            </div>
            <p className="font-medium">{emptyTitle}</p>
            <p className="text-sm mt-1">{emptyHint}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {userColumnLabel}
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
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br ${avatarGradient} text-xs font-semibold text-white shadow-soft`}
                        >
                          {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[13px]">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.email}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                          user.isActive ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.isActive ? 'bg-emerald-500' : 'bg-red-400'
                          }`}
                        />
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredUsers.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 bg-slate-100/70 px-4 py-3 dark:bg-slate-900/35">
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} personne{filteredUsers.length > 1 ? 's' : ''} au total
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
