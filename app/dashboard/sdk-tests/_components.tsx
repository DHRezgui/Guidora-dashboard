'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ArrowLeft, FlaskConical, Grid3X3, Layers3, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const routes = [
  { href: '/dashboard/sdk-tests', label: 'Hub', icon: Grid3X3 },
  { href: '/dashboard/sdk-tests/simple', label: 'Simple', icon: Sparkles },
  { href: '/dashboard/sdk-tests/medium', label: 'Moyenne', icon: Layers3 },
  { href: '/dashboard/sdk-tests/dynamic', label: 'Dynamique', icon: FlaskConical },
  { href: '/dashboard/sdk-tests/stress', label: 'Stress', icon: AlertTriangle },
] as const;

export function SdkLabShell({
  title,
  description,
  badges = [],
  children,
}: {
  title: string;
  description: string;
  badges?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageKey = pathname.split('/').filter(Boolean).at(-1) ?? 'hub';

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#071126] via-[#0b1835] to-[#102346] px-6 py-6 text-white shadow-elevated md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border border-white/15 bg-slate-950/65 text-slate-100 hover:bg-slate-900">
                SDK test lab
              </Badge>
              {badges.map((badge) => (
                <Badge key={badge} variant="outline" className="border-white/15 bg-slate-950/55 text-slate-200">
                  {badge}
                </Badge>
              ))}
            </div>
            <div>
              <h1 data-tour-id={`tour-sdk-lab-heading-${pageKey}`} className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-200 md:text-base">{description}</p>
            </div>
          </div>

          <Button variant="secondary" className="rounded-xl border border-white/15 bg-slate-950/75 text-slate-100 hover:bg-slate-900" asChild>
            <Link href="/dashboard" data-tour-id="tour-sdk-lab-action-back-dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour dashboard
            </Link>
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {routes.map((route) => {
            const Icon = route.icon;
            const active = pathname === route.href;

            return (
              <Button
                key={route.href}
                variant={active ? 'default' : 'outline'}
                className={cn(
                  'rounded-full border px-4',
                  active
                    ? 'border-orange-300/45 bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-[0_0_18px_rgba(255,107,0,0.28)] hover:from-orange-400 hover:to-pink-500'
                    : 'border-white/15 bg-slate-950/55 text-slate-200 hover:border-orange-300/35 hover:bg-slate-900 hover:text-white'
                )}
                asChild
              >
                <Link
                  href={route.href}
                  data-tour-id={`tour-sdk-lab-nav-${route.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-4 w-4" />
                  {route.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>

      <Card className="border-white/10 bg-slate-900/45 shadow-card">
        <CardHeader>
          <CardTitle className="text-slate-100">Conseil de test</CardTitle>
          <CardDescription className="text-slate-300">
            Lance chaque écran avec le hook de génération contextuelle pour vérifier la pertinence des tours, la
            robustesse face au bruit et le comportement sur DOM dynamique.
          </CardDescription>
        </CardHeader>
      </Card>

      {children}
    </div>
  );
}