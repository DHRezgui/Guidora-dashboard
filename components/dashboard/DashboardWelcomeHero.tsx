type DashboardWelcomeHeroProps = {
	firstName?: string | null;
	subtitle: string;
	eyebrow?: string;
};

export function DashboardWelcomeHero({
	firstName,
	subtitle,
	eyebrow = 'Tableau de bord',
}: DashboardWelcomeHeroProps) {
	return (
		<section className="relative flex min-h-[158px] items-center overflow-hidden rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-900 shadow-[0_14px_34px_rgba(2,6,23,0.12)] dark:border-white/10 dark:bg-[#0a1324] dark:text-white dark:shadow-[0_24px_60px_rgba(5,10,24,0.5)] md:min-h-[184px] md:px-10 md:py-8">
			<video
				className="pointer-events-none absolute inset-0 h-full w-full object-cover"
				autoPlay
				loop
				muted
				playsInline
				preload="metadata"
			>
				<source src="/dashboard-hero-bg.mp4" type="video/mp4" />
			</video>
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.72)_55%,rgba(255,255,255,0.88)_100%)] dark:bg-[linear-gradient(90deg,rgba(5,10,24,0.78)_0%,rgba(7,16,34,0.66)_55%,rgba(8,14,30,0.82)_100%)]" />
			<div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
			<div className="pointer-events-none absolute right-10 -bottom-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-400/35 to-transparent" />
			<div className="relative z-10 w-full">
				<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600/90 dark:text-orange-300/90">
					{eyebrow}
				</p>
				<h1 className="mt-2 text-[2rem] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white md:text-[2.65rem] lg:text-5xl">
					Bonjour, {firstName || 'Admin'}
				</h1>
				<p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-700 dark:text-slate-200 md:text-lg">
					{subtitle}
				</p>
			</div>
		</section>
	);
}
