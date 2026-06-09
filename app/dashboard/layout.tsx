'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, userService } from '@/lib/api';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import EmailVerificationBanner from '@/components/dashboard/EmailVerificationBanner';
import { SidebarProvider } from '@/components/dashboard/sidebar-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    const token = authService.getToken();

    // Keep cookie auth in sync for middleware/server navigation checks.
    if (token && typeof document !== 'undefined' && !document.cookie.includes('auth_token=')) {
      document.cookie = `auth_token=${token}; path=/; max-age=3600; SameSite=Lax`;
    }

    if (!token) {
      setAuthState('unauthenticated');
      router.replace('/login');
      return;
    }

    setAuthState('authenticated');

    // Check email verification status (non-blocking for shell render)
    userService
      .getCurrentUser()
      .then((res: { user?: { emailVerified?: boolean; email?: string }; emailVerified?: boolean; email?: string }) => {
        const user = res.user || res;
        setEmailVerified(user.emailVerified ?? true);
        setUserEmail(user.email || '');
      })
      .catch(() => {
        setEmailVerified(true);
      });
  }, [router]);

  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="mt-2 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="phoenix-bg flex h-screen overflow-hidden text-slate-900 dark:text-slate-100">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />

          {emailVerified === false && (
            <EmailVerificationBanner userEmail={userEmail} />
          )}

          <main className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
            <div className="animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}