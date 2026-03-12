'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
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

  const statCards = [
    {
      title: 'Total utilisateurs',
      value: stats.totalUsers,
      subtitle: 'Comptes enregistrés',
      icon: Icons.users,
      gradient: 'gradient-card-blue',
      iconBg: 'bg-primary/10 text-primary',
      visible: isAdmin,
    },
    {
      title: 'Utilisateurs actifs',
      value: stats.activeUsers,
      subtitle: !loading && stats.totalUsers > 0 ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% du total` : 'Aucun utilisateur',
      icon: Icons.active,
      gradient: 'gradient-card-green',
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      visible: isAdmin,
    },
    {
      title: 'Administrateurs',
      value: stats.adminCount,
      subtitle: 'Gestion des comptes',
      icon: Icons.admin,
      gradient: 'gradient-card-purple',
      iconBg: 'bg-purple-500/10 text-purple-600',
      visible: isAdmin,
    },
    {
      title: 'Organisations',
      value: stats.totalOrganizations,
      subtitle: 'Organisations enregistrées',
      icon: Icons.building,
      gradient: 'gradient-card-amber',
      iconBg: 'bg-amber-500/10 text-amber-600',
      visible: isAdmin || user?.role === 'DEVELOPER',
    },
  ].filter((card) => card.visible);

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary px-8 py-8 text-white shadow-elevated">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-60" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {user?.firstName || 'Admin'} 👋
          </h1>
          <p className="mt-1 text-white/70 text-sm">
            Bienvenue sur votre tableau de bord TrustDev Onboarding
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`${card.gradient} rounded-2xl p-5 shadow-card border border-white/60 animate-slide-up`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">{card.title}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{loading ? '...' : card.value}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{card.subtitle}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-bold mb-4">Actions rapides</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="group rounded-2xl bg-card border border-border/60 p-6 shadow-card hover:shadow-elevated transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <Icons.users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[15px]">Gérer les utilisateurs</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Créez, modifiez et supprimez les comptes utilisateurs
                </p>
                <Button className="mt-4 rounded-xl" size="sm" asChild>
                  <Link href="/dashboard/users">
                    <Icons.plus className="mr-2 h-3.5 w-3.5" />
                    Nouvel utilisateur
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="group rounded-2xl bg-card border border-border/60 p-6 shadow-card hover:shadow-elevated transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-purple-500/10 p-3">
                <Icons.tours className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[15px]">Créer un parcours</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Concevez des parcours guidés interactifs pour vos utilisateurs
                </p>
                <Button className="mt-4 rounded-xl" size="sm" asChild>
                  <Link href="/dashboard/tours/create">
                    <Icons.plus className="mr-2 h-3.5 w-3.5" />
                    Nouveau parcours
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}