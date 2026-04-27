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
      subtitle: 'Comptes enregistres',
      delta: '+12.4%',
      icon: Icons.users,
      iconBg: 'text-orange-400 bg-orange-500/10',
      visible: isAdmin,
    },
    {
      title: 'Utilisateurs actifs',
      value: stats.activeUsers,
      subtitle: !loading && stats.totalUsers > 0 ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% du total` : 'Aucun utilisateur',
      delta: '+5.2%',
      icon: Icons.active,
      iconBg: 'text-pink-400 bg-pink-500/10',
      visible: isAdmin,
    },
    {
      title: 'Administrateurs',
      value: stats.adminCount,
      subtitle: 'Gestion des comptes',
      delta: 'Stable',
      icon: Icons.admin,
      iconBg: 'text-amber-300 bg-amber-400/10',
      visible: isAdmin,
    },
    {
      title: 'Organisations',
      value: stats.totalOrganizations,
      subtitle: 'Organisations enregistrees',
      delta: '+8.0%',
      icon: Icons.building,
      iconBg: 'text-orange-300 bg-orange-400/10',
      visible: isAdmin || user?.role === 'DEVELOPER',
    },
  ].filter((card) => card.visible);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#16131f] via-[#101a32] to-[#051733] p-6 text-white shadow-[0_24px_60px_rgba(5,10,24,0.5)]">
        <div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-10 -bottom-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Bonjour, {user?.firstName || 'Admin'}</h1>
          <p className="mt-2 text-sm text-slate-200 md:text-base">Bienvenue sur votre tableau de bord TrustDev Onboarding.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-slate-400">{card.title}</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-white">{loading ? '...' : card.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">{card.subtitle}</p>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-100">Actions rapides</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {isAdmin && (
            <div className="group rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400/35 hover:bg-slate-900/65 hover:shadow-elevated">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary/20">
                  <Icons.users className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100">Gerer les utilisateurs</h3>
                  <p className="text-sm text-slate-400">Créez, modifiez et supprimez les comptes utilisateurs.</p>
                </div>
              </div>
              <Button className="mt-4 rounded-xl" asChild>
                <Link href="/dashboard/users/create">
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Nouvel utilisateur
                </Link>
              </Button>
            </div>
          )}

          <div className="group rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-400/35 hover:bg-slate-900/65 hover:shadow-elevated">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-pink-500/10 p-2.5 text-pink-400 transition-colors group-hover:bg-pink-500/20">
                <Icons.tours className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-100">Creer un parcours</h3>
                <p className="text-sm text-slate-400">Concevez des parcours guides interactifs pour vos utilisateurs.</p>
              </div>
            </div>
            <Button className="mt-4 rounded-xl" asChild>
              <Link href="/dashboard/tours/create">
                <Icons.plus className="mr-2 h-4 w-4" />
                Nouveau parcours
              </Link>
            </Button>
          </div>

          <div className="group rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/35 hover:bg-slate-900/65 hover:shadow-elevated">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                <Icons.analytics className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-100">SDK Test Lab</h3>
                <p className="text-sm text-slate-400">Ouvrez les interfaces de test pour valider le moteur contextuel.</p>
              </div>
            </div>
            <Button className="mt-4 rounded-xl" asChild>
              <Link href="/dashboard/sdk-tests">
                <Icons.eye className="mr-2 h-4 w-4" />
                Ouvrir le lab
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}