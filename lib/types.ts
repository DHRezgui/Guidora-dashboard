// Types d'authentification
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'DEVELOPER' | 'USER';
  isActive: boolean;
  emailVerified?: boolean;
  organizationId?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  editLock?: TourEditLockInfo;
}

// Types utilisateurs
export interface CreateUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'DEVELOPER' | 'USER';
  isActive?: boolean;
  organizationName?: string;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'DEVELOPER' | 'USER';
  isActive?: boolean;
  newPassword?: string;
}

export interface UserResponse {
  success: boolean;
  message?: string;
  user?: User;
  users?: User[];
  count?: number;
}

// Types communs
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Types organisations
export type PlanType = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface Organization {
  id: string;
  name: string;
  apiKey: string;
  plan: PlanType;
  domain?: string;
  settings?: Record<string, any>;
  maxTours: number;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  editLock?: TourEditLockInfo;
}

export interface CreateOrganizationDto {
  name: string;
  apiKey: string;
  plan?: PlanType;
  domain?: string;
  settings?: Record<string, any>;
  maxTours?: number;
  maxUsers?: number;
  isActive?: boolean;
}

export interface UpdateOrganizationDto {
  name?: string;
  apiKey?: string;
  plan?: PlanType;
  domain?: string;
  settings?: Record<string, any>;
  maxTours?: number;
  maxUsers?: number;
  isActive?: boolean;
}

export interface OrganizationResponse {
  success: boolean;
  message?: string;
  organization?: Organization;
  organizations?: Organization[];
  count?: number;
}

// Types tours

export type TourAccessMode = 'view' | 'collaborate';

export interface TourAccessGrant {
  id?: string;
  userId: string;
  accessMode: TourAccessMode;
  user?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>;
}

export interface Step {
  id: string;
  orderIndex: number;
  title: string;
  content: string;
  stepType?: StepType;
  targetSelector?: string;
  stepTargetUrl?: string;
  position?: PositionType;
  action?: ActionType;
  skipAllowed?: boolean;
  highlightElement?: boolean;
  concatSourceMeta?: {
    sourceTourId?: string;
    sourceTourName?: string;
    sourceTourIndex: number;
    sourceStepIndex: number;
  };
}

export type StepType = 'tooltip' | 'highlight' | 'modal' | 'form' | 'tutorial' | 'checklist';

export interface SimulationElementSnapshot {
  selector: string;
  text?: string;
  role?: string;
  tag: string;
  intent?: 'discovery' | 'primary-action' | 'support-navigation' | 'form-flow';
  actionable: boolean;
  bbox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface SimulationContext {
  pageUrl: string;
  pathname: string;
  pageTitle: string;
  capturedAt: string;
  viewport: {
    width: number;
    height: number;
  };
  elements: SimulationElementSnapshot[];
}

export interface TourEditLockInfo {
  required: boolean;
  heldByUserId?: string;
  heldByDisplayName?: string;
  lockedAt?: string;
  expiresAt?: string;
  isHeldByMe: boolean;
}

export interface GuidedTour {
  id?: string;
  name: string;
  description?: string;
  targetUrl: string;
  isActive?: boolean;
  isSandboxTestActive?: boolean;
  /** Renseigné côté serveur (toggle test sandbox), jamais envoyé à l’API de sauvegarde. */
  sandboxTestStartedBy?: string | null;
  priority?: number;
  replayPolicy?: 'never' | 'after_period' | 'always_on_new_version';
  replayAfterDays?: number;
  currentResetVersion?: number;
  triggerConditions?: Record<string, any>;
  simulationContext?: SimulationContext;
  steps?: Step[];
  stepCount?: number;
  environment?: 'sandbox' | 'production';
  sandboxStatus?: 'pending' | 'approved' | 'rejected' | 'returned' | null;
  sandboxRejectionReason?: string | null;
  sandboxRejectedAt?: string | null;
  sandboxRejectedBy?: string | null;
  developerSubmissionMessage?: string | null;
  developerViewShareMessage?: string | null;
  developerViewShareMessageAt?: string | null;
  developerCollaborateShareMessage?: string | null;
  developerCollaborateShareMessageAt?: string | null;
  developerPrivate?: boolean;
  assignedAdminIds?: string[];
  /** Admin gestionnaire unique en production (parcours admin). */
  productionManagedByAdminId?: string | null;
  assignedToAdminsAt?: string | null;
  inCollaboration?: boolean;
  sharingHasView?: boolean;
  sharingHasCollaborate?: boolean;
  accessGrants?: TourAccessGrant[];
  /** Verrou d’édition (collaboration) — renseigné par l’API, non envoyé à la sauvegarde. */
  editLock?: TourEditLockInfo;
  editLockedBy?: string | null;
  editLockedAt?: string | null;
  editLockExpiresAt?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TourAudienceResetResponse {
  success: boolean;
  message?: string;
  clearedStates?: number;
}

export interface TourSegmentResetResponse {
  success: boolean;
  message?: string;
  matchedUsers?: number;
  clearedStates?: number;
}

export type StepSavePayload = Omit<Step, 'id' | 'orderIndex'>;

export type GuidedTourSavePayload = Omit<GuidedTour, 'id' | 'createdAt' | 'updatedAt' | 'steps'> & {
  steps: StepSavePayload[];
  /** Sources pour duplication / concaténation (validation backend). */
  forkedFromTourIds?: string[];
};

/** JSON d’export sécurisé (sans métadonnées org / utilisateurs). */
export interface TourExportPayload {
  exportVersion: number;
  exportedAt: string;
  name: string;
  description?: string;
  targetUrl: string;
  priority: number;
  replayPolicy?: GuidedTour['replayPolicy'];
  replayAfterDays: number;
  triggerConditions: Record<string, unknown>;
  simulationContext?: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
}

export interface GuidedTourResponse {
  success: boolean;
  message?: string;
  tour?: GuidedTour;
  tours?: GuidedTour[];
  count?: number;
  export?: TourExportPayload;
}

export type PositionType =
  | 'TOP'
  | 'BOTTOM'
  | 'LEFT'
  | 'RIGHT'
  | 'CENTER'
  | 'TOP_LEFT'
  | 'TOP_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_RIGHT';

export type ActionType = 
  | 'CLICK'
  | 'HOVER'
  | 'SCROLL'
  | 'NEXT'
  | 'SKIP'
  | 'COMPLETE';