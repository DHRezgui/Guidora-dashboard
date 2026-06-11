'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icons } from '@/components/ui/icons';
import { authService, getErrorMessage, userService } from '@/lib/api';
import { User } from '@/lib/types';
import { getDashboardRole } from '@/lib/dashboard-roles';
import ReadOnlyUserDirectorySection from '@/components/dashboard/ReadOnlyUserDirectorySection';
import axios from 'axios';

export default function OrganizationTeamDirectoryPanel() {
  const isDeveloper = getDashboardRole(authService.getUser()) === 'DEVELOPER';

  const [admins, setAdmins] = useState<User[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDirectory = useCallback(async () => {
    if (!isDeveloper) return;
    try {
      setLoading(true);
      setError('');
      const response = await userService.getOrganizationTeamDirectory();
      setAdmins(response.admins || []);
      setDevelopers(response.developers || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Permission non accordée — vous n\'avez pas accès à cette ressource');
      } else {
        setError(getErrorMessage(err, 'Erreur lors du chargement de l\'équipe'));
      }
    } finally {
      setLoading(false);
    }
  }, [isDeveloper]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const adminStats = useMemo(
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

  const developerStats = useMemo(
    () => [
      {
        title: 'Développeurs',
        value: developers.length,
        icon: Icons.sdkTests,
        tone: 'from-purple-100 to-white dark:from-purple-600/20 dark:to-slate-900/70',
      },
      {
        title: 'Actifs',
        value: developers.filter((developer) => developer.isActive).length,
        icon: Icons.active,
        tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70',
      },
    ],
    [developers],
  );

  if (!isDeveloper) {
    return null;
  }

  return (
    <div className="space-y-10">
      <ReadOnlyUserDirectorySection
        title="Administrateurs"
        subtitle="Comptes responsables de la modération et de la gestion de votre organisation"
        users={admins}
        loading={loading}
        error={error}
        stats={adminStats}
        emptyTitle="Aucun administrateur trouvé"
        emptyHint="Modifiez vos filtres ou aucun admin n'est rattaché à l'organisation"
        userColumnLabel="Administrateur"
        avatarGradient="from-rose-500 to-orange-600"
      />

      <ReadOnlyUserDirectorySection
        title="Développeurs de l'équipe"
        subtitle="Autres développeurs de votre organisation (hors votre compte)"
        users={developers}
        loading={loading}
        stats={developerStats}
        emptyTitle="Aucun autre développeur trouvé"
        emptyHint="Modifiez vos filtres ou vous êtes le seul développeur de l'organisation"
        userColumnLabel="Développeur"
        avatarGradient="from-blue-500 to-indigo-600"
      />
    </div>
  );
}
