'use client';

import type { ReactNode } from 'react';
import { AppWindow, Cpu } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Grille principale : sujet de test (gauche) + console SDK (droite). */
export function SdkLabTwoZoneLayout({
	subject,
	sdk,
	className,
}: {
	subject: ReactNode;
	sdk: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]',
				className,
			)}
		>
			{subject}
			{sdk}
		</div>
	);
}

/** Zone gauche : interface métier fictive analysée par le SDK. */
export function SdkLabSubjectZone({
	title,
	description,
	subjectTitleTourId = 'tour-sdk-lab-subject-title',
	children,
	className,
}: {
	title?: string;
	description?: string;
	/** Ancre stable pour l’étape « point d’entrée » des parcours séquentiels. */
	subjectTitleTourId?: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			data-sdk-lab-subject
			className={cn(
				'rounded-3xl border-2 border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.07] via-card to-card p-5 shadow-card md:p-6',
				className,
			)}
			aria-label="Sujet de test"
		>
			<header className="mb-5 space-y-2 border-b border-emerald-500/15 pb-4">
				<div className="flex flex-wrap items-center gap-2">
					<Badge
						variant="outline"
						className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
					>
						<AppWindow className="h-3.5 w-3.5" />
						Sujet de test
					</Badge>
				</div>
				{title ? (
					<h2
						data-tour-id={subjectTitleTourId}
						className="text-lg font-semibold tracking-tight md:text-xl"
					>
						{title}
					</h2>
				) : null}
				{description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
			</header>
			<div className="min-w-0 space-y-5">{children}</div>
		</section>
	);
}

/** Zone droite : tout ce qui relève du SDK (analyse, métriques, rapports). */
export function SdkLabSdkZone({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<section
			data-sdk-lab-console
			className={cn(
				'xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto',
				'rounded-3xl border-2 border-orange-400/25 bg-gradient-to-br from-orange-500/[0.08] via-card to-pink-500/[0.06] p-5 shadow-card md:p-6',
				className,
			)}
			aria-label="Console SDK"
		>
			<header className="mb-5 space-y-2 border-b border-orange-400/20 pb-4">
				<Badge
					variant="outline"
					className="gap-1.5 border-orange-400/40 bg-orange-500/10 text-orange-900 dark:text-orange-100"
				>
					<Cpu className="h-3.5 w-3.5" />
					Console SDK
				</Badge>
				<p className="text-sm text-muted-foreground">
					Génération contextuelle, publication, feedback, lecture runtime et rapports techniques.
				</p>
			</header>
			<div className="space-y-5">{children}</div>
		</section>
	);
}
