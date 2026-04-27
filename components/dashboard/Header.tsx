'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { authService } from '@/lib/api';
import Link from 'next/link';

export default function Header() {
  const user = authService.getUser();

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/45 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6">
        <div />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:bg-white/5 hover:text-orange-300" asChild>
            <Link href="/dashboard/settings">
              <Icons.settings className="h-4.5 w-4.5" />
            </Link>
          </Button>

          <div className="mx-1 h-6 w-px bg-white/15" />

          <div className="phoenix-glass flex items-center gap-2.5 rounded-xl px-2.5 py-1.5">
            <div className="h-7 w-7 rounded-lg phoenix-primary flex items-center justify-center text-white font-semibold text-xs">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-[13px] font-semibold leading-tight text-white">{user?.firstName || user?.email}</p>
              <p className="text-[10px] capitalize text-slate-400">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}