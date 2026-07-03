import { describe, expect, it } from 'vitest';
import {
  canOpenProjectHubTourEditor,
  getProjectHubTourEditorBlockReason,
  type ProjectHubTourAccessFields,
} from './tour-sandbox';

const DEV = 'dev-1';
const ADMIN_A = 'admin-a';
const ADMIN_B = 'admin-b';
const PREV_DEV = 'dev-prev';

function baseTour(
  overrides: Partial<ProjectHubTourAccessFields> = {},
): ProjectHubTourAccessFields {
  return {
    id: 'tour-1',
    name: 'Test',
    targetUrl: '/dashboard',
    isActive: false,
    environment: 'sandbox',
    sandboxStatus: 'pending',
    createdBy: DEV,
    developerPrivate: true,
    assignedAdminIds: [],
    ...overrides,
  };
}

describe('canOpenProjectHubTourEditor', () => {
  it('allows developer to edit returned tour (renvoi admin)', () => {
    const tour = baseTour({ sandboxStatus: 'returned', assignedAdminIds: [ADMIN_A] });
    expect(canOpenProjectHubTourEditor(tour, 'DEVELOPER', DEV)).toBe(true);
  });

  it('allows developer to edit rejected tour', () => {
    const tour = baseTour({ sandboxStatus: 'rejected', assignedAdminIds: [ADMIN_A] });
    expect(canOpenProjectHubTourEditor(tour, 'DEVELOPER', DEV)).toBe(true);
  });

  it('blocks developer on approved tour', () => {
    const tour = baseTour({ sandboxStatus: 'approved', assignedAdminIds: [ADMIN_A] });
    expect(canOpenProjectHubTourEditor(tour, 'DEVELOPER', DEV)).toBe(false);
    expect(getProjectHubTourEditorBlockReason(tour, 'DEVELOPER', DEV)).toContain('Approuvé');
  });

  it('blocks previous owner after transfer (lecture seule)', () => {
    const tour = baseTour({
      createdBy: DEV,
      sandboxStatus: 'returned',
      sandboxRejectionReason: 'Parcours transféré à un autre développeur. Motif : handover',
      accessGrants: [{ userId: PREV_DEV, accessMode: 'view' }],
    });
    expect(canOpenProjectHubTourEditor(tour, 'DEVELOPER', PREV_DEV)).toBe(false);
    expect(getProjectHubTourEditorBlockReason(tour, 'DEVELOPER', PREV_DEV)).toContain('Transféré');
  });

  it('allows new owner after transfer to edit', () => {
    const tour = baseTour({
      sandboxStatus: 'returned',
      sandboxRejectionReason: 'Parcours transféré à un autre développeur. Motif : handover',
    });
    expect(canOpenProjectHubTourEditor(tour, 'DEVELOPER', DEV)).toBe(true);
  });

  it('blocks admin after réassignation to another admin', () => {
    const tour = baseTour({
      sandboxStatus: 'approved',
      assignedAdminIds: [ADMIN_B],
    });
    expect(canOpenProjectHubTourEditor(tour, 'ADMIN', ADMIN_A)).toBe(false);
    expect(getProjectHubTourEditorBlockReason(tour, 'ADMIN', ADMIN_A)).toContain('Réassigné');
  });

  it('allows assigned admin on approved developer tour', () => {
    const tour = baseTour({
      sandboxStatus: 'approved',
      assignedAdminIds: [ADMIN_A],
    });
    expect(canOpenProjectHubTourEditor(tour, 'ADMIN', ADMIN_A)).toBe(true);
  });
});
