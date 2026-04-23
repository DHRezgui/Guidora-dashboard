'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/ui/icons';
import { userService, getErrorMessage } from '@/lib/api';
import axios from 'axios';
import { User } from '@/lib/types';
import Link from 'next/link';
import CreateUserModal from '@/components/dashboard/CreateUserModal';
import DeleteUserModal from '@/components/dashboard/DeleteUserModal';

const roleBadgeStyles: Record<string, string> = {
  ADMIN: 'bg-red-50 text-red-700 ring-red-600/10',
  DEVELOPER: 'bg-blue-50 text-blue-700 ring-blue-600/10',
  USER: 'bg-gray-50 text-gray-700 ring-gray-600/10',
};

export default function UsersPage() {
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
        <Button className="rounded-xl shadow-soft" onClick={() => setShowCreateModal(true)}>
          <Icons.plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'Total', value: users.length, icon: Icons.users, gradient: 'gradient-card-blue', iconBg: 'bg-primary/10 text-primary' },
          { title: 'Administrateurs', value: users.filter((u) => u.role === 'ADMIN').length, icon: Icons.admin, gradient: 'gradient-card-purple', iconBg: 'bg-purple-500/10 text-purple-600' },
          { title: 'Actifs', value: users.filter((u) => u.isActive).length, icon: Icons.active, gradient: 'gradient-card-green', iconBg: 'bg-emerald-500/10 text-emerald-600' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className={`${stat.gradient} rounded-2xl p-5 shadow-card border border-white/60`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${stat.iconBg}`}>
                  <Icon className="h-5 w-5" />
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

      {/* Users table */}
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
                        <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-white font-semibold text-xs shadow-soft">
                          {user.firstName?.[0] || user.email[0].toUpperCase()}
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
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${roleBadgeStyles[user.role] || 'bg-gray-50 text-gray-700 ring-gray-600/10'}`}>
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
      </div>

      {!loading && filteredUsers.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-card">
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
