'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, userService } from '@/lib/api';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import EmailVerificationBanner from '@/components/dashboard/EmailVerificationBanner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Vérifier l'authentification au chargement
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Check email verification status
    userService.getCurrentUser()
      .then((res: any) => {
        const user = res.user || res;
        setEmailVerified(user.emailVerified ?? true);
        setUserEmail(user.email || '');
      })
      .catch(() => {
        // If the call fails, don't show the banner
        setEmailVerified(true);
      });
  }, [router]);

  if (!authService.isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="mt-2 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Email verification banner */}
        {emailVerified === false && (
          <EmailVerificationBanner userEmail={userEmail} />
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}