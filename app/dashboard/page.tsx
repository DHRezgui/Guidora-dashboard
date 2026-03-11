'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { authService, userService, organizationService } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const user = authService.getUser();
  const isAdmin = user?.role === 'ADMIN';

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminCount: 0,
    totalOrganizations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, orgsRes] = await Promise.all([
          isAdmin ? userService.getAll(1, 10000) : Promise.resolve(null),
          isAdmin || user?.role === 'DEVELOPER' ? organizationService.getAll() : Promise.resolve(null),
        ]);

        const users = usersRes?.users || [];
        const orgs = orgsRes?.organizations || [];

        setStats({
          totalUsers: users.length,
          activeUsers: users.filter((u) => u.isActive).length,
          adminCount: users.filter((u) => u.role === 'ADMIN').length,
          totalOrganizations: orgs.length,
        });
      } catch {
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isAdmin, user?.role]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bonjour, {user?.firstName || 'Admin'} 👋</h1>
        <p className="text-muted-foreground">Bienvenue sur votre tableau de bord TrustDev Onboarding</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total utilisateurs</CardTitle>
            <Icons.users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Comptes enregistrés</p>
          </CardContent>
        </Card>
        )}

        {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
            <Icons.active className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {!loading && stats.totalUsers > 0
                ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% du total`
                : 'Aucun utilisateur'}
            </p>
          </CardContent>
        </Card>
        )}

        {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrateurs</CardTitle>
            <Icons.admin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.adminCount}</div>
            <p className="text-xs text-muted-foreground">Gestion des comptes</p>
          </CardContent>
        </Card>
        )}

        {(isAdmin || user?.role === 'DEVELOPER') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisations</CardTitle>
            <Icons.building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">Organisations enregistrées</p>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Actions rapides</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.users className="h-5 w-5" />
                Gérer les utilisateurs
              </CardTitle>
              <CardDescription>
                Créez, modifiez et supprimez les comptes utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/users">
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Nouvel utilisateur
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.tours className="h-5 w-5" />
                Créer un parcours
              </CardTitle>
              <CardDescription>
                Concevez des parcours guidés interactifs pour vos utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/tours/create">
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Nouveau parcours
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}