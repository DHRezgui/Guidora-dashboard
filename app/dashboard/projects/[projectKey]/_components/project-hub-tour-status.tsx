'use client';

import type { ProjectOverview } from '@/lib/api';
import { authService } from '@/lib/api';
import { getDashboardRole } from '@/lib/dashboard-roles';
import { getTourCardStatusBadges } from '@/lib/tour-card-badges';
import { cn } from '@/lib/utils';

type HubTour = ProjectOverview['recentTours'][number];

export function ProjectHubTourStatusBadges({
	tour,
	className,
	compact = false,
}: {
	tour: HubTour;
	className?: string;
	compact?: boolean;
}) {
	const user = authService.getUser();
	const role = getDashboardRole(user);
	const badges = getTourCardStatusBadges(tour as HubTour & { id: string }, role, user?.id);

	return (
		<div
			className={cn(
				'flex flex-wrap gap-1',
				compact ? 'justify-start' : 'shrink-0 justify-end',
				className,
			)}
		>
			{badges.map((badge) => (
				<span
					key={badge.key}
					className={cn(
						'rounded-full border font-semibold uppercase tracking-wide',
						compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]',
						badge.className,
					)}
				>
					{badge.label}
				</span>
			))}
		</div>
	);
}
