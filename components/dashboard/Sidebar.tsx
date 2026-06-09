'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/ui/icons';
import { authService } from '@/lib/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/dashboard/sidebar-context';

export default function Sidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const user = authService.getUser();
	const { collapsed, toggle } = useSidebar();

	const isActive = (path: string) =>
		path === '/dashboard' ? pathname === path : pathname.startsWith(path);

	const role = user?.role as string | undefined;

	const navigation = [
		{ name: 'Tableau de bord', href: '/dashboard', icon: Icons.dashboard, roles: ['ADMIN', 'DEVELOPER', 'USER'] },
		{ name: 'Utilisateurs', href: '/dashboard/users', icon: Icons.users, roles: ['ADMIN'] },
		{ name: 'Organisations', href: '/dashboard/organizations', icon: Icons.building, roles: ['ADMIN', 'DEVELOPER'] },
		{ name: 'Parcours', href: '/dashboard/tours', icon: Icons.tours, roles: ['ADMIN', 'DEVELOPER', 'USER'] },
		{ name: 'SDK Tests', href: '/dashboard/sdk-tests', icon: Icons.sdkTests, roles: ['ADMIN', 'DEVELOPER'] },
		{ name: 'Blueprints', href: '/dashboard/blueprints', icon: Icons.blueprints, roles: ['ADMIN', 'DEVELOPER'] },
	].filter((item) => !role || item.roles.includes(role));

	const navLinkClass = (active: boolean) =>
		cn(
			'group flex items-center rounded-xl text-[13px] font-medium transition-all duration-200',
			collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
			active
				? 'phoenix-active text-orange-500 dark:text-orange-300'
				: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
		);

	const renderNavItem = (item: (typeof navigation)[number]) => {
		const Icon = item.icon;
		const active = isActive(item.href);
		const link = (
			<Link href={item.href} className={navLinkClass(active)} aria-current={active ? 'page' : undefined}>
				<Icon
					className={cn(
						'h-4.5 w-4.5 shrink-0 transition-colors',
						active ? 'text-orange-500 dark:text-orange-300' : 'text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200',
					)}
				/>
				{!collapsed && <span className="truncate">{item.name}</span>}
			</Link>
		);

		if (!collapsed) return <div key={item.href}>{link}</div>;

		return (
			<Tooltip key={item.href}>
				<TooltipTrigger className="block w-full">{link}</TooltipTrigger>
				<TooltipContent side="right" sideOffset={8}>
					{item.name}
				</TooltipContent>
			</Tooltip>
		);
	};

	return (
		<TooltipProvider delay={200}>
			<div className="relative shrink-0">
				<aside
					className={cn(
						'flex h-full flex-col border-r border-slate-200/80 bg-white/75 backdrop-blur-xl transition-[width] duration-300 ease-in-out dark:border-white/10 dark:bg-slate-950/55',
						collapsed ? 'w-[4.25rem]' : 'w-64',
					)}
					aria-label="Navigation principale"
					data-collapsed={collapsed ? 'true' : 'false'}
				>
				<div className={cn('pb-4 pt-6', collapsed ? 'px-2' : 'px-5')}>
					<div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
						<div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl shadow-soft">
							<Icons.logo className="h-full w-full object-contain" />
						</div>
						{!collapsed && (
							<div className="min-w-0 flex-1">
								<h2 className="truncate text-[15px] font-bold tracking-tight text-slate-800 dark:text-white">Guidora</h2>
								<p className="text-[11px] font-medium text-orange-300/90">Onboarding</p>
							</div>
						)}
					</div>
				</div>

				<div className={cn(collapsed ? 'px-2' : 'px-5')}>
					<div className="h-px bg-slate-200 dark:bg-white/10" />
				</div>

				<nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
					{!collapsed && (
						<p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
							Menu
						</p>
					)}
					<div className="space-y-0.5">{navigation.map((item) => renderNavItem(item))}</div>
				</nav>

				<div className={cn('pb-4', collapsed ? 'px-2' : 'px-3')}>
					{collapsed ? (
						<Tooltip>
							<TooltipTrigger
								className="phoenix-glass flex w-full cursor-pointer items-center justify-center rounded-xl p-2 transition-all hover:border-orange-400/30 hover:bg-slate-100/80 dark:hover:bg-white/5"
								onClick={() => router.push('/dashboard/settings')}
								aria-label="Paramètres du compte"
							>
								<div className="phoenix-primary flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-white shadow-soft">
									{user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
								</div>
							</TooltipTrigger>
							<TooltipContent side="right" sideOffset={8}>
								{user?.firstName || user?.email || 'Compte'} — {user?.role?.toLowerCase()}
							</TooltipContent>
						</Tooltip>
					) : (
						<div
							className="phoenix-glass cursor-pointer rounded-xl p-3 transition-all hover:border-orange-400/30 hover:bg-slate-100/80 dark:hover:bg-white/5"
							onClick={() => router.push('/dashboard/settings')}
							role="button"
							tabIndex={0}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									router.push('/dashboard/settings');
								}
							}}
						>
							<div className="flex items-center gap-3">
								<div className="phoenix-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white shadow-soft">
									{user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
										{user?.firstName || user?.email}
									</p>
									<p className="truncate text-[11px] capitalize text-slate-500 dark:text-slate-400">
										{user?.role?.toLowerCase()}
									</p>
								</div>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										authService.logout();
									}}
									className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-orange-500 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-orange-300"
									title="Déconnexion"
									aria-label="Déconnexion"
								>
									<Icons.logout className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}
					{collapsed && (
						<Tooltip>
							<TooltipTrigger
								type="button"
								onClick={() => authService.logout()}
								aria-label="Déconnexion"
								className="mt-2 flex w-full items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 p-2.5 text-slate-600 shadow-sm transition-colors hover:border-orange-400/45 hover:bg-orange-50 hover:text-orange-600 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-orange-400/35 dark:hover:bg-orange-500/15 dark:hover:text-orange-300"
							>
								<Icons.logout className="h-4 w-4 shrink-0" />
							</TooltipTrigger>
							<TooltipContent side="right" sideOffset={8}>
								Déconnexion
							</TooltipContent>
						</Tooltip>
					)}
				</div>
				</aside>

				{/*
				 * Base du triangle toujours sur l’extrémité droite du sidebar.
				 * - Ouvert : base sur le bord, pointe vers l’intérieur (gauche).
				 * - Fermé : base sur le bord, pointe vers l’extérieur (droite).
				 */}
				<button
					type="button"
					onClick={toggle}
					className={cn(
						'absolute top-1/2 left-full z-30 h-14 w-3.5 p-0',
						'bg-slate-300/95 transition-[clip-path,transform,background-color] duration-300 ease-in-out',
						'hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70',
						'dark:bg-slate-700/95 dark:hover:bg-orange-500',
						'[filter:drop-shadow(1px_0_4px_rgba(2,6,23,0.25))]',
						collapsed ? '-translate-y-1/2' : '-translate-x-full -translate-y-1/2',
					)}
					style={{
						clipPath: collapsed
							? 'polygon(100% 50%, 0 0, 0 100%)'
							: 'polygon(0 50%, 100% 0, 100% 100%)',
					}}
					aria-label={collapsed ? 'Développer le menu' : 'Réduire le menu'}
					aria-expanded={!collapsed}
					title={collapsed ? 'Développer le menu' : 'Réduire le menu'}
				/>
			</div>
		</TooltipProvider>
	);
}
