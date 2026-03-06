'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { authService } from '@/lib/api';
import Link from 'next/link';

export default function Header() {
  const user = authService.getUser();

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Gestion de l'onboarding intelligent</p>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/settings">
              <Icons.settings className="mr-2 h-4 w-4" />
              Paramètres
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user?.firstName || user?.email}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => authService.logout()}>
              <Icons.logout className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}