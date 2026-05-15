'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, FlaskConical, Grid3X3, HeartPulse, Layers3, Sparkles } from 'lucide-react';

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
  { href: '/dashboard/sdk-tests/integration', label: 'Intégration', icon: HeartPulse },
] as const;

type LabScenarioKey = 'hub' | 'simple' | 'medium' | 'dynamic' | 'stress' | 'integration';

const LAB_TEST_TIPS: Record<LabScenarioKey, string> = {
	hub: 'Choisissez un scénario selon la complexité à valider : CTA simple, formulaire + navigation, DOM dynamique, stress anti-bruit, ou intégration par blueprints. Chaque écran utilise le même moteur SDK (génération, publication, feedback, lecture runtime).',
	simple:
		'Validez la hiérarchie des intentions sur une page courte : CTA principal, actions secondaires et sélecteurs stables. Lancez l’analyse, simulez du feedback (shown / clicked), puis « Jouer » pour vérifier le parcours en conditions réelles sur cette page.',
	medium:
		'Testez navigation interne, formulaire et validation avant enregistrement. Vérifiez que le moteur propose des drafts form-flow et primary-action cohérents, puis utilisez feedback + lecture runtime pour confirmer le parcours multi-zones.',
	dynamic:
		'Observez le comportement sous mutations DOM, modals et toasts : le batching et le filtrage du bruit doivent garder une action utile visible. Relancez l’analyse après une rafale DOM pour comparer drafts et rapport debug.',
	stress:
		'Scénario volontairement bruyant : faux signaux, éléments transitoires et scores contradictoires. Le moteur doit résister au chaos et publier au plus une action métier claire — contrôlez les rejets bruit et les conflits dans le rapport debug.',
	integration:
		'Exemple d’intégration avec un pack de blueprints (healthtechBlueprints, remplaçable en production par vos journeyBlueprints). Validez les drafts « blueprint », le feedback backend et la lecture runtime sur l’interface fictive portail patient.',
};

function resolveLabScenarioKey(pathname: string): LabScenarioKey {
	const segment = pathname.split('/').filter(Boolean).at(-1);
	if (segment === 'simple' || segment === 'medium' || segment === 'dynamic' || segment === 'stress' || segment === 'integration') {
		return segment;
	}
	return 'hub';
}

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
  const scenarioKey = resolveLabScenarioKey(pathname);
  const pageKey = scenarioKey;
  const testTip = LAB_TEST_TIPS[scenarioKey];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-6 text-slate-900 shadow-[0_12px_26px_rgba(2,6,23,0.12)] dark:border-white/10 dark:bg-[#08142b] dark:text-white dark:shadow-elevated md:px-8">
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        >
          <source src="/lab.mp4" type="video/mp4" />
        </video>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.7)_55%,rgba(248,250,252,0.84)_100%)] dark:bg-[linear-gradient(90deg,rgba(4,9,22,0.84)_0%,rgba(8,18,42,0.72)_55%,rgba(8,20,43,0.86)_100%)]" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-100 dark:border-white/15 dark:bg-slate-950/65 dark:text-slate-100 dark:hover:bg-slate-900">
                SDK test lab
              </Badge>
              {badges.map((badge) => (
                <Badge key={badge} variant="outline" className="border-slate-300 bg-white/85 text-slate-700 dark:border-white/15 dark:bg-slate-950/55 dark:text-slate-200">
                  {badge}
                </Badge>
              ))}
            </div>
            <div>
              <h1 data-tour-id={`tour-sdk-lab-heading-${pageKey}`} className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-900 dark:text-slate-200 md:text-base">{description}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap gap-2">
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
                    : 'border-slate-300 bg-white/90 text-slate-700 hover:border-orange-300/35 hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-slate-950/55 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white'
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

      <Card className="border-slate-200 bg-white/85 shadow-card dark:border-white/10 dark:bg-slate-900/45">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">Conseil de test</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">{testTip}</CardDescription>
        </CardHeader>
      </Card>

      {children}
    </div>
  );
}