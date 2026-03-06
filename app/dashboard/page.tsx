'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { authService } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const user = authService.getUser();

  // Stats fictives pour la démo
  const stats = {
    totalUsers: 150,
    activeUsers: 120,
    adminCount: 5,
    toursCreated: 25,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bonjour, {user?.firstName || 'Admin'} 👋</h1>
        <p className="text-muted-foreground">Bienvenue sur votre tableau de bord TrustDev Onboarding</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total utilisateurs</CardTitle>
            <Icons.users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">+20% depuis le mois dernier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
            <Icons.active className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">80% du total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrateurs</CardTitle>
            <Icons.admin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.adminCount}</div>
            <p className="text-xs text-muted-foreground">Gestion des comptes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parcours créés</CardTitle>
            <Icons.tours className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.toursCreated}</div>
            <p className="text-xs text-muted-foreground">+5 cette semaine</p>
          </CardContent>
        </Card>
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