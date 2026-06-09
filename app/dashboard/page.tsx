'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { authService, userService, organizationService } from '@/lib/api';
import { canAccessOrganizations, canAccessSdkLab, canCreateTours, getDashboardRole } from '@/lib/dashboard-roles';
import Link from 'next/link';

export default function DashboardPage() {
  const user = authService.getUser();
  const role = getDashboardRole(user);
  const isAdmin = role === 'ADMIN';
  const showTourCreate = canCreateTours(role);
  const showSdkLab = canAccessSdkLab(role);
  const showOrgStats = canAccessOrganizations(role);

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
          showOrgStats ? organizationService.getAll() : Promise.resolve(null),
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
  }, [isAdmin, showOrgStats]);

  const statCards = [
    {
      title: 'Total utilisateurs',
      value: stats.totalUsers,
      subtitle: 'Comptes enregistres',
      delta: '+12.4%',
      icon: Icons.users,
      tone: 'from-slate-100 to-white dark:from-slate-800/90 dark:to-slate-900/70',
      visible: isAdmin,
    },
    {
      title: 'Utilisateurs actifs',
      value: stats.activeUsers,
      subtitle: !loading && stats.totalUsers > 0 ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% du total` : 'Aucun utilisateur',
      delta: '+5.2%',
      icon: Icons.active,
      tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70',
      visible: isAdmin,
    },
    {
      title: 'Administrateurs',
      value: stats.adminCount,
      subtitle: 'Gestion des comptes',
      delta: 'Stable',
      icon: Icons.admin,
      tone: 'from-purple-100 to-white dark:from-purple-600/20 dark:to-slate-900/70',
      visible: isAdmin,
    },
    {
      title: 'Organisations',
      value: stats.totalOrganizations,
      subtitle: 'Organisations enregistrees',
      delta: '+8.0%',
      icon: Icons.building,
      tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70',
      visible: showOrgStats,
    },
  ].filter((card) => card.visible);

  return (
    <div className="space-y-6">
      <section className="relative flex min-h-[125px] items-center overflow-hidden rounded-3xl border border-slate-200 bg-white px-7 py-4 text-slate-900 shadow-[0_14px_34px_rgba(2,6,23,0.12)] dark:border-white/10 dark:bg-[#0a1324] dark:text-white dark:shadow-[0_24px_60px_rgba(5,10,24,0.5)] md:min-h-[138px] md:px-8 md:py-5">
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        >
          <source src="/dashboard-hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.72)_55%,rgba(255,255,255,0.88)_100%)] dark:bg-[linear-gradient(90deg,rgba(5,10,24,0.78)_0%,rgba(7,16,34,0.66)_55%,rgba(8,14,30,0.82)_100%)]" />
        <div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-10 -bottom-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 w-full">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">Bonjour, {user?.firstName || 'Admin'}</h1>
          <p className="mt-2.5 text-base text-slate-900 dark:text-slate-200 md:text-lg">Bienvenue sur votre tableau de bord Guidora Onboarding.</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${card.tone} p-4 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm min-h-[96px] dark:border-white/10 dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.title}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{loading ? '...' : card.value}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-orange-500 dark:border-white/10 dark:bg-slate-950/65 dark:text-orange-300">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-500">{card.subtitle}</p>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Actions rapides</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {isAdmin && (
            <div className="group rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400/35 hover:bg-white hover:shadow-elevated dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900/65">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary/20">
                  <Icons.users className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Gerer les utilisateurs</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Créez, modifiez et supprimez les comptes utilisateurs.</p>
                </div>
              </div>
              <Button className="mt-4 rounded-xl" asChild>
                <Link href="/dashboard/users?create=1">
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Nouvel utilisateur
                </Link>
              </Button>
            </div>
          )}

          {showTourCreate ? (
            <div className="group rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-400/35 hover:bg-white hover:shadow-elevated dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900/65">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-pink-500/10 p-2.5 text-pink-400 transition-colors group-hover:bg-pink-500/20">
                  <Icons.tours className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Creer un parcours</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Concevez des parcours guides interactifs pour vos utilisateurs.</p>
                </div>
              </div>
              <Button className="mt-4 rounded-xl" asChild>
                <Link href="/dashboard/tours/create" prefetch={false}>
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Nouveau parcours
                </Link>
              </Button>
            </div>
          ) : null}

          {showSdkLab ? (
            <div className="group rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/35 hover:bg-white hover:shadow-elevated dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900/65">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                  <Icons.sdkLab className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">SDK Test Lab</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ouvrez les interfaces de test pour valider le moteur contextuel.</p>
                </div>
              </div>
              <Button className="mt-4 rounded-xl" asChild>
                <Link href="/dashboard/sdk-tests">
                  <Icons.play className="mr-2 h-4 w-4" />
                  Ouvrir le lab
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}