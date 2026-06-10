'use client';

import Link from 'next/link';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';
import { DashboardWelcomeHero } from '@/components/dashboard/DashboardWelcomeHero';
import { Icons } from '@/components/ui/icons';
import { authService } from '@/lib/api';
import { PHOENIX_PANEL_CLASS } from '@/app/dashboard/blueprints/blueprint-shared';
import { cn } from '@/lib/utils';

const tiles = [
	{
		title: 'Organisations',
		description: 'Créer et gérer les organisations clientes, plans et clés API.',
		href: '/dashboard/platform/organizations',
		icon: Icons.building,
	},
	{
		title: 'Administrateurs clients',
		description: 'Créer et gérer les comptes administrateur par organisation cliente.',
		href: '/dashboard/platform/admins',
		icon: Icons.users,
	},
];

export default function PlatformConsolePage() {
	const user = authService.getUser();

	return (
		<RoleRouteGuard access="platform">
			<div className="space-y-6">
				<DashboardWelcomeHero
					firstName={user?.firstName}
					subtitle="Bienvenue sur la console plateforme Guidora Onboarding."
				/>

				<div>
					<h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Console plateforme</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Espace réservé aux super administrateurs Trustdev pour l’onboarding des clients.
					</p>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					{tiles.map((tile) => {
						const Icon = tile.icon;
						return (
							<Link
								key={tile.href}
								href={tile.href}
								className={cn(
									PHOENIX_PANEL_CLASS,
									'block p-6 transition-all hover:scale-[1.01] hover:border-orange-400/40',
								)}
							>
								<div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-soft">
									<Icon className="h-5 w-5" />
								</div>
								<h3 className="text-lg font-semibold">{tile.title}</h3>
								<p className="mt-2 text-sm text-muted-foreground">{tile.description}</p>
							</Link>
						);
					})}
				</div>
			</div>
		</RoleRouteGuard>
	);
}
