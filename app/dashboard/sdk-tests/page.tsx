import Link from 'next/link';
import { ArrowRight, CheckCircle2, Layers3, FlaskConical, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { SdkLabShell } from './_components';

const scenarios = [
  {
    title: 'Interface simple',
    description: 'Une page courte avec quelques CTA, utile pour tester les sélections primaires et le filtrage du bruit.',
    icon: Sparkles,
    href: '/dashboard/sdk-tests/simple',
    tags: ['CTA', 'cartes', 'navigation simple'],
  },
  {
    title: 'Interface moyenne',
    description: 'Un écran plus riche avec navigation + formulaire + validation de champs.',
    icon: Layers3,
    href: '/dashboard/sdk-tests/medium',
    tags: ['navigation', 'formulaire', 'validation'],
  },
  {
    title: 'Interface dynamique',
    description: 'Un scénario avec loaders, modals, toasts et rafales DOM pour tester le batching et l’anti-bruit.',
    icon: FlaskConical,
    href: '/dashboard/sdk-tests/dynamic',
    tags: ['loaders', 'modal', 'toast', 'mutations rapides'],
  },
];

export default function SdkTestsHubPage() {
  return (
    <SdkLabShell
      title="Lab de test du SDK"
      description="Point d’entrée pour valider les heuristiques, le ranking, le contexte session et la robustesse DOM sur trois interfaces de complexité croissante."
      badges={["sandbox", "validation SDK", "production-style"]}
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

      <Card className="border-border/60 shadow-card">
        <CardHeader>
          <CardTitle>Ce que tu peux vérifier</CardTitle>
          <CardDescription>Utilise ces interfaces pour observer les tours proposés, le debug report et les comportements de filtrage/conflict resolution.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            'La qualité des drafts générés',
            'La stabilité des sélecteurs sur différents layouts',
            'Le comportement sur DOM dynamique et bruit UI',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </SdkLabShell>
  );
}