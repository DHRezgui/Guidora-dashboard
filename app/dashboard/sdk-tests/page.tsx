import Link from 'next/link';
import {
	ArrowRight,
	CheckCircle2,
	Layers3,
	FlaskConical,
	Sparkles,
	AlertTriangle,
	HeartPulse,
	LayoutPanelTop,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { SdkLabShell } from './_components';

const scenarios = [
  {
    title: 'Interface simple',
    description:
      'Page courte avec quelques CTA pour tester les sélections primaires, le filtrage du bruit, et le moniteur Abandon (score + toast proactif).',
    icon: Sparkles,
    href: '/dashboard/sdk-tests/simple',
    tags: ['CTA', 'cartes', 'abandon'],
  },
  {
    title: 'Interface moyenne',
    description:
      'Navigation + formulaire + validation : parcours multi-zones, et friction formulaire suivie par le moniteur Abandon.',
    icon: Layers3,
    href: '/dashboard/sdk-tests/medium',
    tags: ['formulaire', 'validation', 'abandon'],
  },
  {
    title: 'Interface dynamique',
    description:
      'Loaders, modals, toasts et rafales DOM pour le batching / anti-bruit, avec Abandon actif sous mutations.',
    icon: FlaskConical,
    href: '/dashboard/sdk-tests/dynamic',
    tags: ['mutations', 'anti-bruit', 'abandon'],
  },
  {
    title: 'Stress sévère',
    description:
      'Signaux contradictoires, chaos DOM et faux CTA : robustesse du moteur et stabilité du score Abandon.',
    icon: AlertTriangle,
    href: '/dashboard/sdk-tests/stress',
    tags: ['chaos DOM', 'anti-biais', 'abandon'],
  },
  {
    title: 'Single-page — 7 slots',
    description:
      'Mock SaaS avec singlePageTour (1 draft, chaîne 7 slots) et moniteur Abandon en parallèle du parcours.',
    icon: LayoutPanelTop,
    href: '/dashboard/sdk-tests/single-page',
    tags: ['singlePageTour', '7 slots', 'abandon'],
  },
  {
    title: 'Intégration réelle',
    description:
      'Pack healthtechBlueprints (remplaçable), feedback runtime, et Abandon comme sur une app cliente.',
    icon: HeartPulse,
    href: '/dashboard/sdk-tests/integration',
    tags: ['blueprints', 'runtime', 'abandon'],
  },
];

export default function SdkTestsHubPage() {
  return (
    <SdkLabShell
      title="Lab de test du SDK"
      description="Validez la génération contextuelle de bout en bout : moteur, publication API, boucle feedback, lecture des parcours sur le DOM réel, et prédiction d’abandon (LightGBM + toast proactif) sur chaque scénario."
      badges={['sandbox', 'validation SDK', 'abandon', 'production-style']}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;

          return (
            <Card key={scenario.title} className="group border-border/60 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-[17px]">
                      <Icon className="h-4.5 w-4.5 text-primary" />
                      {scenario.title}
                    </CardTitle>
                    <CardDescription className="mt-2 leading-relaxed">{scenario.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{scenario.tags.length} zones</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {scenario.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button className="rounded-xl" asChild>
                  <Link href={scenario.href}>
                    Ouvrir le scénario
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-slate-200 bg-white/85 shadow-card dark:border-white/10 dark:bg-slate-900/45">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">Ce que tu peux vérifier</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">
            Chaque scénario partage le même moteur, le moniteur Abandon (score LightGBM + toast proactif) et la preview
            « Jouer ». Single-page ajoute la chaîne 7 slots / singlePageTour ; Intégration valide les blueprints métier.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            'Génération + publication API (parcours inactifs par défaut, activation via dashboard)',
            'Feedback shown / clicked / completed synchronisé avec le backend',
            'Abandon sur tous les scénarios : badge risque local / LightGBM + toast proactif',
            'Multi-drafts (Simple → Stress) : conflits, bruit, rankings par intent',
            'Single-page : carte « 7 slots » filled/skipped + ordre des étapes = ordre des slots',
            'Surbrillance activée sur chaque étape des parcours autogénérés',
            'Intégration : blueprints métier + preview runtime sur app fictive',
            'Dynamique / Stress : batching et anti-bruit sous mutations DOM',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </SdkLabShell>
  );
}