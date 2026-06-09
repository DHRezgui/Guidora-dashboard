import type { DashboardRole } from '@/lib/dashboard-roles';
import type { GuidedTour, TourExportPayload } from '@/lib/types';
import { resolveTourEditorAccess } from '@/lib/tour-sandbox';

/** Nom de fichier sûr (pas de traversal ni caractères spéciaux). */
export function buildTourExportFilename(tourName: string | undefined): string {
	const base = (tourName || 'parcours')
		.trim()
		.slice(0, 80)
		.replace(/[^a-zA-Z0-9-_]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return `${base || 'parcours'}.json`;
}

export function canExportTour(
	tour: Pick<GuidedTour, 'accessGrants' | 'createdBy' | 'inCollaboration' | 'targetUrl' | 'triggerConditions'>,
	role: DashboardRole | null,
	userId?: string,
): boolean {
	const mode = resolveTourEditorAccess(tour, role, userId, null);
	return mode !== null;
}

export function downloadTourExportJson(payload: TourExportPayload, filename: string): void {
	const blob = new Blob([JSON.stringify(payload, null, 2)], {
		type: 'application/json;charset=utf-8',
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.rel = 'noopener';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
