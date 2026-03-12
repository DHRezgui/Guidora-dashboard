'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { authService } from '@/lib/api';
import Link from 'next/link';

export default function Header() {
  const user = authService.getUser();

  return (
    <header className="sticky top-0 z-10 border-b border-border/40 bg-card/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6">
        <div />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-foreground" asChild>
            <Link href="/dashboard/settings">
              <Icons.settings className="h-[18px] w-[18px]" />
            </Link>
          </Button>

          <div className="h-6 w-px bg-border/60 mx-1" />

          <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-2.5 py-1.5">
            <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center text-white font-semibold text-xs">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-[13px] font-semibold leading-tight">{user?.firstName || user?.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}