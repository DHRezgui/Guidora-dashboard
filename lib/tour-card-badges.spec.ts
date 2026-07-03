import { describe, expect, it } from 'vitest';
import { getTourCardStatusBadges } from './tour-card-badges';
import type { GuidedTour } from './types';

const DEV = 'dev-1';
const PREV_DEV = 'dev-prev';

function baseTour(overrides: Partial<GuidedTour> = {}): GuidedTour {
	return {
		id: 'tour-1',
		name: 'Nouveau parcours',
		targetUrl: '/dashboard',
		isActive: false,
		environment: 'sandbox',
		sandboxStatus: 'returned',
		createdBy: DEV,
		developerPrivate: true,
		assignedAdminIds: ['admin-1'],
		...overrides,
	};
}

describe('getTourCardStatusBadges', () => {
	it('shows Transféré (not Retour) for new owner after transfer', () => {
		const tour = baseTour({
			sandboxRejectionReason: 'Parcours transféré à un autre développeur. Motif : handover',
		});
		const badges = getTourCardStatusBadges(tour, 'DEVELOPER', DEV);
		const labels = badges.map((b) => b.label);
		expect(labels).toContain('Transféré');
		expect(labels).not.toContain('Retour');
		expect(labels).not.toContain('Retourné');
	});

	it('shows Transféré for previous owner with view grant', () => {
		const tour = baseTour({
			createdBy: DEV,
			sandboxRejectionReason: 'Parcours transféré à un autre développeur. Motif : handover',
			accessGrants: [{ userId: PREV_DEV, accessMode: 'view' }],
		});
		const badges = getTourCardStatusBadges(tour, 'DEVELOPER', PREV_DEV);
		const labels = badges.map((b) => b.label);
		expect(labels).toContain('Transféré');
		expect(labels).toContain('Lecture');
		expect(labels).not.toContain('Retour');
	});

	it('shows Retour for classic admin return (not transfer)', () => {
		const tour = baseTour({
			sandboxRejectionReason: 'Merci de corriger les étapes 2 et 3.',
		});
		const badges = getTourCardStatusBadges(tour, 'DEVELOPER', DEV);
		const labels = badges.map((b) => b.label);
		expect(labels).toContain('Retour');
		expect(labels).not.toContain('Transféré');
	});
});
