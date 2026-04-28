'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/ui/icons';
import { userService, getErrorMessage } from '@/lib/api';
import axios from 'axios';
import { User } from '@/lib/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CreateUserModal from '@/components/dashboard/CreateUserModal';
import DeleteUserModal from '@/components/dashboard/DeleteUserModal';

const roleBadgeStyles: Record<string, string> = {
  ADMIN: 'border border-rose-400/30 bg-rose-500/12 text-rose-200',
  DEVELOPER: 'border border-blue-400/30 bg-blue-500/12 text-blue-200',
  USER: 'border border-slate-400/30 bg-slate-500/12 text-slate-200',
};

export default function UsersPage() {
  const searchParams = useSearchParams();
  const PAGE_SIZE = 10;
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getAll();
      setUsers(response.users || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Permission non accordée — vous n\'avez pas accès à cette ressource');
      } else {
        setError(getErrorMessage(err, 'Erreur lors du chargement des utilisateurs'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let result = users;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.id.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== 'ALL') {
      result = result.filter((u) => u.role === roleFilter);
    }

    if (activeFilter !== 'ALL') {
      result = result.filter((u) => activeFilter === 'ACTIVE' ? u.isActive : !u.isActive);
    }

    setFilteredUsers(result);
  }, [users, searchQuery, roleFilter, activeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, activeFilter, users.length]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, safeCurrentPage]);

  const handleCreated = () => {
    setShowCreateModal(false);
    fetchUsers();
  };

  const handleDeleted = () => {
    setDeleteUser(null);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérez les comptes utilisateurs et administrateurs</p>
        </div>
        <Button
          className="w-full shadow-sm hover:scale-105 transition-transform md:w-auto"
          onClick={() => setShowCreateModal(true)}
        >
          <Icons.plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { title: 'Total', value: users.length, icon: Icons.users, tone: 'from-slate-800/90 to-slate-900/70' },
          { title: 'Administrateurs', value: users.filter((u) => u.role === 'ADMIN').length, icon: Icons.admin, tone: 'from-purple-600/20 to-slate-900/70' },
          { title: 'Actifs', value: users.filter((u) => u.isActive).length, icon: Icons.active, tone: 'from-emerald-600/20 to-slate-900/70' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`rounded-2xl border border-white/10 bg-gradient-to-br ${stat.tone} p-4 shadow-[0_10px_30px_rgba(2,6,23,0.35)] backdrop-blur-sm min-h-[96px]`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{stat.title}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/65 p-2.5 text-orange-300">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
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
            {['ALL', 'ADMIN', 'DEVELOPER', 'USER'].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  roleFilter === role
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {role === 'ALL' ? 'Tous' : role}
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
                {status === 'ALL' ? 'Tous' : status === 'ACTIVE' ? 'Actifs' : 'Inactifs'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Users table + pagination */}
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
            <p className="font-medium">Aucun utilisateur trouvé</p>
            <p className="text-sm mt-1">Modifiez vos filtres ou créez un nouvel utilisateur</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rôle</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Créé le</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-orange-500 to-pink-600 text-xs font-semibold text-white shadow-soft">
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
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${roleBadgeStyles[user.role] || 'border border-slate-400/30 bg-slate-500/12 text-slate-200'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${user.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                          <Link href={`/dashboard/users/${user.id}`}>
                            <Icons.edit className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteUser(user)}
                        >
                          <Icons.trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredUsers.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 bg-slate-900/35 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} au total
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

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {deleteUser && (
        <DeleteUserModal
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
