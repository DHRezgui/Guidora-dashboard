'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, FlaskConical, Grid3X3, HeartPulse, Layers3, LayoutPanelTop, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const routes = [
  { href: '/dashboard/sdk-tests', label: 'Hub', icon: Grid3X3 },
  { href: '/dashboard/sdk-tests/simple', label: 'Simple', icon: Sparkles },
  { href: '/dashboard/sdk-tests/medium', label: 'Moyenne', icon: Layers3 },
  { href: '/dashboard/sdk-tests/dynamic', label: 'Dynamique', icon: FlaskConical },
  { href: '/dashboard/sdk-tests/stress', label: 'Stress', icon: AlertTriangle },
  { href: '/dashboard/sdk-tests/single-page', label: 'Single-page', icon: LayoutPanelTop },
  { href: '/dashboard/sdk-tests/integration', label: 'Intégration', icon: HeartPulse },
] as const;

type LabScenarioKey = 'hub' | 'simple' | 'medium' | 'dynamic' | 'stress' | 'single-page' | 'integration';

const LAB_TEST_TIPS: Record<LabScenarioKey, string> = {
	hub:
		'Parcourez les scénarios via les onglets : génération contextuelle, publication API, feedback, preview « Jouer », et le moniteur Abandon (score LightGBM + toast proactif) commun à chaque page. Pour la chaîne générique à 7 slots (profil singlePageTour, un draft, surbrillance sur chaque étape), ouvrez Single-page. Simple à Stress couvrent le mode multi-drafts et les filtres bruit / conflits. Les contrôles session (stratégie, stage, progression) s’appliquent au prochain « Analyser ».',
	simple:
		'Surface hôte réduite à la vue métier (CTA principal, actions secondaires, repères sélecteurs). Validez la hiérarchie des intentions : lancez l’analyse, simulez du feedback (shown / clicked), puis « Jouer ». Surveillez aussi le badge Abandon pendant l’interaction (clics, idle) pour valider le score local / LightGBM.',
	medium:
		'Testez navigation interne, formulaire et validation avant enregistrement. Vérifiez que le moteur propose des drafts form-flow et primary-action cohérents, puis utilisez feedback + lecture runtime. Le moniteur Abandon reste actif : friction formulaire (retry, abandon de champs) doit faire évoluer le risque.',
	dynamic:
		'Observez le comportement sous mutations DOM, modals et toasts : le batching et le filtrage du bruit doivent garder une action utile visible. Relancez l’analyse quand le DOM est calme pour activer la fusion sémantique, ou juste après une rafale pour comparer bypass et heuristiques. Le moniteur Abandon vérifie que le bruit DOM n’explose pas artificiellement le score.',
	stress:
		'Scénario volontairement bruyant : faux signaux, flux mouvant et événements transitoires. Le moteur doit résister au chaos et isoler une action métier claire — contrôlez rejets bruit et conflits dans le rapport debug. Utilisez « Lancer burst DOM » puis réanalysez. Vérifiez que l’Abandon reste interprétable malgré le chaos (pas de faux positifs systématiques).',
	'single-page':
		'Profil singlePageTour : un seul draft séquentiel (jusqu’à 7 étapes). Après « Analyser », consultez la carte « Single-page chain (7 slots) » (filled / skipped par slot), les candidate rankings, puis publiez. Vérifiez que l’ordre des étapes suit la chaîne (primary → search → secondary → nav → analytics → settings), que chaque étape a la surbrillance active, et que « Jouer » reflète le parcours sur le mock dashboard. Le moniteur Abandon reste disponible en parallèle du parcours.',
	integration:
		'Exemple d’intégration avec un pack de blueprints (healthtechBlueprints, remplaçable en production par vos journeyBlueprints). Validez les drafts « blueprint », le feedback backend et la lecture runtime sur l’interface fictive portail patient. Le moniteur Abandon confirme que la prédiction fonctionne aussi dans un contexte « app cliente ».',
};

function resolveLabScenarioKey(pathname: string): LabScenarioKey {
	const segment = pathname.split('/').filter(Boolean).at(-1);
	if (
		segment === 'simple' ||
		segment === 'medium' ||
		segment === 'dynamic' ||
		segment === 'stress' ||
		segment === 'single-page' ||
		segment === 'integration'
	) {
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