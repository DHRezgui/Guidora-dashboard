'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/ui/icons';
import CreateUserModal from '@/components/dashboard/CreateUserModal';
import DeleteUserModal from '@/components/dashboard/DeleteUserModal';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';
import { isAdminResourceBeingEdited } from '@/lib/admin-resource-edit-lock';
import { getErrorMessage, organizationService, userService } from '@/lib/api';
import type { Organization, User } from '@/lib/types';

const UNASSIGNED_KEY = '__unassigned__';

const roleBadgeStyles =
  'border border-rose-300/50 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/12 dark:text-rose-200';

/** Organisation : dégradé orange Phoenix (aligné liste organisations). */
const ORG_AVATAR_CLASS =
  'border border-white/15 bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-soft';

/** Administrateur : violet/indigo pour le distinguer de l’entité organisation. */
const ADMIN_AVATAR_CLASS =
  'border border-white/15 bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-soft';

const planBadgeStyles: Record<string, string> = {
  FREE: 'border border-slate-300/60 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-500/12 dark:text-slate-200',
  STARTER: 'border border-blue-300/50 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/12 dark:text-blue-200',
  PRO: 'border border-purple-300/50 bg-purple-50 text-purple-700 dark:border-purple-400/30 dark:bg-purple-500/12 dark:text-purple-200',
  ENTERPRISE:
    'border border-orange-300/50 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/12 dark:text-orange-200',
};

type AdminSection = {
  key: string;
  organization: Organization | null;
  title: string;
  users: User[];
};

function AdminTable({
  users,
  onDelete,
}: {
  users: User[];
  onDelete: (user: User) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-10 text-muted-foreground">
        <Icons.users className="mb-3 h-7 w-7 opacity-35" />
        <p className="text-sm font-medium">Aucun administrateur pour cette organisation</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/60 bg-muted/20">
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Administrateur
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rôle
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Statut
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Créé le
            </th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {users.map((user) => {
            const displayName =
              user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email;

            return (
              <tr key={user.id} className="transition-colors hover:bg-muted/20">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold ${ADMIN_AVATAR_CLASS}`}
                    >
                      {(user.firstName?.[0] || user.email[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">{displayName}</p>
                      <p className="text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${roleBadgeStyles}`}
                  >
                    ADMIN
                  </span>
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
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                      <Link href={`/dashboard/platform/admins/${user.id}`}>
                        <Icons.edit className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={isAdminResourceBeingEdited(user.editLock)}
                      title={
                        isAdminResourceBeingEdited(user.editLock)
                          ? 'En cours de modification par un autre admin'
                          : 'Supprimer'
                      }
                      onClick={() => onDelete(user)}
                    >
                      <Icons.trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PlatformAdminsPage() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, orgsRes] = await Promise.all([
        userService.getAll(),
        organizationService.getAll(),
      ]);
      setUsers(usersRes.users || []);
      setOrganizations(orgsRes.organizations || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Permission non accordée — vous n\'avez pas accès à cette ressource');
      } else {
        setError(getErrorMessage(err, 'Erreur lors du chargement des administrateurs'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          u.email.toLowerCase().includes(q) ||
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q) ||
          (organizations.find((o) => o.id === u.organizationId)?.name ?? '')
            .toLowerCase()
            .includes(q),
      );
    }

    if (activeFilter !== 'ALL') {
      result = result.filter((u) => (activeFilter === 'ACTIVE' ? u.isActive : !u.isActive));
    }

    setFilteredUsers(result);
  }, [users, searchQuery, activeFilter, organizations]);

  const groupedSections = useMemo((): AdminSection[] => {
    const usersByOrg = new Map<string, User[]>();
    filteredUsers.forEach((user) => {
      const key = user.organizationId || UNASSIGNED_KEY;
      if (!usersByOrg.has(key)) usersByOrg.set(key, []);
      usersByOrg.get(key)!.push(user);
    });

    const sortUsers = (list: User[]) =>
      [...list].sort((a, b) => {
        const nameA = `${a.lastName ?? ''} ${a.firstName ?? ''}`.trim() || a.email;
        const nameB = `${b.lastName ?? ''} ${b.firstName ?? ''}`.trim() || b.email;
        return nameA.localeCompare(nameB, 'fr');
      });

    const sections: AdminSection[] = organizations.map((org) => ({
      key: org.id,
      organization: org,
      title: org.name,
      users: sortUsers(usersByOrg.get(org.id) || []),
    }));

    const unassigned = usersByOrg.get(UNASSIGNED_KEY);
    if (unassigned?.length) {
      sections.push({
        key: UNASSIGNED_KEY,
        organization: null,
        title: 'Sans organisation',
        users: sortUsers(unassigned),
      });
    }

    return sections;
  }, [filteredUsers, organizations]);

  const visibleSections = useMemo(() => {
    const hasUserFilters = Boolean(searchQuery) || activeFilter !== 'ALL';
    if (!hasUserFilters) {
      return groupedSections;
    }
    return groupedSections.filter(
      (section) => section.users.length > 0 || section.key === UNASSIGNED_KEY,
    );
  }, [groupedSections, searchQuery, activeFilter]);

  const orgsWithAdmin = new Set(users.map((u) => u.organizationId).filter(Boolean)).size;
  const orgsWithoutAdmin = organizations.filter(
    (org) => !users.some((u) => u.organizationId === org.id),
  ).length;

  const handleCreated = () => {
    setShowCreateModal(false);
    fetchData();
  };

  const handleDeleted = () => {
    setDeleteUser(null);
    fetchData();
  };

  const hasNoVisibleContent =
    !loading && visibleSections.length === 0 && filteredUsers.length === 0;

  return (
    <RoleRouteGuard access="platformAdmins">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Administrateurs clients</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Comptes chef d&apos;équipe regroupés par organisation cliente
            </p>
          </div>
          <Button
            className="w-full shadow-sm transition-transform hover:scale-105 md:w-auto"
            onClick={() => setShowCreateModal(true)}
          >
            <Icons.plus className="mr-2 h-4 w-4" />
            Nouvel administrateur
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            {
              title: 'Total',
              value: users.length,
              icon: Icons.users,
              tone: 'from-slate-100 to-white dark:from-slate-800/90 dark:to-slate-900/70',
            },
            {
              title: 'Actifs',
              value: users.filter((u) => u.isActive).length,
              icon: Icons.active,
              tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70',
            },
            {
              title: 'Organisations couvertes',
              value: orgsWithAdmin,
              icon: Icons.building,
              tone: 'from-purple-100 to-white dark:from-purple-600/20 dark:to-slate-900/70',
            },
            {
              title: 'Sans admin',
              value: orgsWithoutAdmin,
              icon: Icons.warning,
              tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70',
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className={`min-h-[96px] rounded-2xl border border-slate-200 bg-gradient-to-br ${stat.tone} p-4 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm dark:border-white/10 dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-orange-500 dark:border-white/10 dark:bg-slate-950/65 dark:text-orange-300">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou organisation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border-0 bg-muted/50 pl-9 focus-visible:ring-1"
              />
            </div>
            <div className="flex gap-1.5 rounded-xl bg-muted/50 p-1">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
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
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card py-16 shadow-card">
            <Icons.spinner className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Chargement...</span>
          </div>
        ) : hasNoVisibleContent ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card py-16 text-muted-foreground shadow-card">
            <div className="mb-4 rounded-2xl bg-muted/50 p-4">
              <Icons.users className="h-8 w-8 opacity-40" />
            </div>
            <p className="font-medium">Aucun administrateur trouvé</p>
            <p className="mt-1 text-sm">Modifiez vos filtres ou créez un nouvel administrateur</p>
          </div>
        ) : (
          <div>
            {visibleSections.map((section, index) => (
              <div key={section.key}>
                {index > 0 ? (
                  <div
                    className="my-6 border-t border-dashed border-slate-300/70 dark:border-white/20"
                    role="separator"
                    aria-hidden
                  />
                ) : null}
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
                <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold ${ORG_AVATAR_CLASS}`}
                    >
                      {(section.title[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold">{section.title}</h2>
                        {section.organization?.plan ? (
                          <span
                            className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                              planBadgeStyles[section.organization.plan] ??
                              planBadgeStyles.FREE
                            }`}
                          >
                            {section.organization.plan}
                          </span>
                        ) : null}
                        {section.organization ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              section.organization.isActive
                                ? 'text-emerald-600'
                                : 'text-red-500'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                section.organization.isActive ? 'bg-emerald-500' : 'bg-red-400'
                              }`}
                            />
                            {section.organization.isActive ? 'Active' : 'Inactive'}
                          </span>
                        ) : null}
                      </div>
                      {section.organization?.apiKey ? (
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {section.organization.apiKey}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {section.users.length} administrateur{section.users.length > 1 ? 's' : ''}
                  </span>
                </div>

                <AdminTable users={section.users} onDelete={setDeleteUser} />
                </div>
              </div>
            ))}

            <div className="mt-6 rounded-2xl border border-border/60 bg-slate-100/70 px-4 py-3 dark:bg-slate-900/35">
              <p className="text-sm text-muted-foreground">
                {filteredUsers.length} administrateur{filteredUsers.length > 1 ? 's' : ''} au total
                {' · '}
                {visibleSections.length} organisation{visibleSections.length > 1 ? 's' : ''}{' '}
                affichée{visibleSections.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {showCreateModal && (
          <CreateUserModal
            mode="platform-admin"
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
    </RoleRouteGuard>
  );
}
