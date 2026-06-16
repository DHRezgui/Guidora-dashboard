import axios from 'axios';
import {
  AuthResponse,
  LoginCredentials,
  UserResponse,
  CreateUserDto,
  UpdateUserDto,
  OrganizationResponse,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  User,
  GuidedTourResponse,
  GuidedTourSavePayload,
  TourAudienceResetResponse,
  TourSegmentResetResponse,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

// Créer une instance axios configurée
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token invalide ou expiré
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      document.cookie = 'auth_token=; path=/; max-age=0';
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Extraire un message d'erreur lisible depuis une erreur Axios ou générique
export function getErrorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : String(data.message);
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

// Service d'authentification
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/reset-password', { token, password });
    return response.data;
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  async resendVerification(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/resend-verification');
    return response.data;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    document.cookie = 'auth_token=; path=/; max-age=0';
    window.location.href = '/login';
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  },

  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

// Service utilisateurs
export const userService = {
  async getAll(page = 1, limit = 10): Promise<UserResponse> {
    const response = await apiClient.get(`/user?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getByRole(role: string): Promise<UserResponse> {
    const response = await apiClient.get(`/user/role/${role}`);
    return response.data;
  },

  async getOrganizationAdminPeers(): Promise<UserResponse> {
    const response = await apiClient.get('/user/organization-admin-peers');
    return response.data;
  },

  async getOrganizationTeamDirectory(): Promise<{
    success: boolean;
    admins: User[];
    developers: User[];
    count?: { admins: number; developers: number };
  }> {
    const response = await apiClient.get('/user/organization-team-directory');
    return response.data;
  },

  async getById(id: string): Promise<UserResponse> {
    const response = await apiClient.get(`/user/${id}`);
    return response.data;
  },

  async create(data: CreateUserDto): Promise<{ success: boolean; message: string; user: User }> {
    const response = await apiClient.post('/user', data);
    return response.data;
  },

  async update(id: string, data: UpdateUserDto): Promise<UserResponse> {
    const response = await apiClient.put(`/user/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<UserResponse> {
    const response = await apiClient.delete(`/user/${id}`);
    return response.data;
  },

  async getCurrentUser(): Promise<UserResponse> {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  async assignOrganization(userId: string, organizationName: string): Promise<UserResponse> {
    const response = await apiClient.post(`/user/${userId}/assign-organization`, { organizationName });
    return response.data;
  },

  async removeOrganization(userId: string): Promise<UserResponse> {
    const response = await apiClient.post(`/user/${userId}/remove-organization`);
    return response.data;
  },

  async acquireEditLock(id: string): Promise<{
    success: boolean;
    user: import('./types').User;
    editLock?: import('./types').TourEditLockInfo;
  }> {
    const response = await apiClient.post(`/user/${id}/edit-lock/acquire`);
    return response.data;
  },

  async renewEditLock(id: string): Promise<{
    success: boolean;
    user: import('./types').User;
    editLock?: import('./types').TourEditLockInfo;
  }> {
    const response = await apiClient.post(`/user/${id}/edit-lock/renew`);
    return response.data;
  },

  async releaseEditLock(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/user/${id}/edit-lock`);
    return response.data;
  },
};

// Service organisations
export const organizationService = {
  async getAll(): Promise<OrganizationResponse> {
    const response = await apiClient.get('/organization');
    return response.data;
  },

  async getById(id: string): Promise<OrganizationResponse> {
    const response = await apiClient.get(`/organization/${id}`);
    return response.data;
  },

  async create(data: CreateOrganizationDto): Promise<OrganizationResponse> {
    const response = await apiClient.post('/organization', data);
    return response.data;
  },

  async update(id: string, data: UpdateOrganizationDto): Promise<OrganizationResponse> {
    const response = await apiClient.put(`/organization/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<OrganizationResponse> {
    const response = await apiClient.delete(`/organization/${id}`);
    return response.data;
  },

  async getUserCount(id: string): Promise<{ success: boolean; count: number }> {
    const response = await apiClient.get(`/organization/${id}/users/count`);
    return response.data;
  },

  async acquireEditLock(id: string): Promise<{
    success: boolean;
    organization: import('./types').Organization;
    editLock?: import('./types').TourEditLockInfo;
  }> {
    const response = await apiClient.post(`/organization/${id}/edit-lock/acquire`);
    return response.data;
  },

  async renewEditLock(id: string): Promise<{
    success: boolean;
    organization: import('./types').Organization;
    editLock?: import('./types').TourEditLockInfo;
  }> {
    const response = await apiClient.post(`/organization/${id}/edit-lock/renew`);
    return response.data;
  },

  async releaseEditLock(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/organization/${id}/edit-lock`);
    return response.data;
  },
};

// Service parcours guides
export const tourService = {
  async getAll(
    isActive?: boolean,
    options?: { includeSteps?: boolean },
  ): Promise<GuidedTourResponse> {
    const params = new URLSearchParams();
    if (typeof isActive === 'boolean') {
      params.set('isActive', String(isActive));
    }
    if (options?.includeSteps === false) {
      params.set('includeSteps', 'false');
    }
    const query = params.toString();
    const response = await apiClient.get(`/tours${query ? `?${query}` : ''}`);
    return response.data;
  },

  async getById(id: string): Promise<GuidedTourResponse> {
    const response = await apiClient.get(`/tours/${id}`);
    return response.data;
  },

  async exportById(id: string): Promise<GuidedTourResponse> {
    const response = await apiClient.get(`/tours/${id}/export`);
    return response.data;
  },

  async create(data: GuidedTourSavePayload): Promise<GuidedTourResponse> {
    const response = await apiClient.post('/tours', data);
    return response.data;
  },

  async update(id: string, data: Partial<GuidedTourSavePayload>): Promise<GuidedTourResponse> {
    const response = await apiClient.put(`/tours/${id}`, data);
    return response.data;
  },

  async acquireEditLock(
    id: string,
  ): Promise<GuidedTourResponse & { editLock?: import('./types').TourEditLockInfo }> {
    const response = await apiClient.post(`/tours/${id}/edit-lock/acquire`);
    return response.data;
  },

  async renewEditLock(
    id: string,
  ): Promise<GuidedTourResponse & { editLock?: import('./types').TourEditLockInfo }> {
    const response = await apiClient.post(`/tours/${id}/edit-lock/renew`);
    return response.data;
  },

  async releaseEditLock(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/tours/${id}/edit-lock`);
    return response.data;
  },

  async remove(id: string): Promise<GuidedTourResponse> {
    const response = await apiClient.delete(`/tours/${id}`);
    return response.data;
  },

  async toggleActive(
    id: string,
    isActive: boolean,
    audience?: 'sandbox' | 'production',
  ): Promise<GuidedTourResponse> {
    const response = await apiClient.put(`/tours/${id}/activate`, { isActive, audience });
    return response.data;
  },

  async getOrganizationAdmins(): Promise<{ success: boolean; count: number; users: User[] }> {
    const response = await apiClient.get('/tours/organization-admins');
    return response.data;
  },

  async assignAdmins(
    id: string,
    adminIds: string[],
    message?: string,
  ): Promise<GuidedTourResponse> {
    const payload: { adminIds: string[]; message?: string } = { adminIds };
    const trimmed = message?.trim();
    if (trimmed) {
      payload.message = trimmed;
    }
    const response = await apiClient.put(`/tours/${id}/assign-admins`, payload);
    return response.data;
  },

  async getOrganizationMembers(): Promise<{ success: boolean; count: number; users: User[] }> {
    const response = await apiClient.get('/tours/organization-members');
    return response.data;
  },

  async setAccessGrants(
    id: string,
    grants: { userId: string; accessMode: 'view' | 'collaborate' }[],
    replace = true,
    options?: {
      messageForMode?: 'view' | 'collaborate';
      message?: string;
    },
  ): Promise<GuidedTourResponse> {
    const payload = grants.map((grant) => ({
      userId: grant.userId,
      accessMode: grant.accessMode,
    }));
    const body: {
      grants: typeof payload;
      replace: boolean;
      messageForMode?: 'view' | 'collaborate';
      message?: string;
    } = { grants: payload, replace };
    if (options?.messageForMode) {
      body.messageForMode = options.messageForMode;
      const trimmed = options.message?.trim();
      if (trimmed) {
        body.message = trimmed;
      } else if (options.message !== undefined) {
        body.message = '';
      }
    }
    const response = await apiClient.put(`/tours/${id}/access-grants`, body);
    return response.data;
  },

  async approve(id: string): Promise<GuidedTourResponse> {
    const response = await apiClient.put(`/tours/${id}/approve`);
    return response.data;
  },

  async reopenToDeveloper(id: string, payload: { reason: string }): Promise<GuidedTourResponse> {
    const response = await apiClient.put(`/tours/${id}/reopen-to-developer`, payload);
    return response.data;
  },

  async reassignAdmins(id: string, adminIds: string[]): Promise<GuidedTourResponse> {
    const response = await apiClient.put(`/tours/${id}/reassign-admins`, { adminIds });
    return response.data;
  },

  async transferDeveloper(
    id: string,
    payload: { developerId: string; reason: string },
  ): Promise<GuidedTourResponse> {
    const response = await apiClient.put(`/tours/${id}/transfer-developer`, payload);
    return response.data;
  },

  async transferProductionManagement(
    id: string,
    adminId: string,
  ): Promise<GuidedTourResponse> {
    const response = await apiClient.put(`/tours/${id}/transfer-production-management`, {
      adminId,
    });
    return response.data;
  },

  async reject(id: string, payload: { reason: string }): Promise<GuidedTourResponse> {
    const response = await apiClient.put(`/tours/${id}/reject`, payload);
    return response.data;
  },

  async resetAudience(id: string): Promise<TourAudienceResetResponse> {
    const response = await apiClient.post(`/tours/${id}/reset-audience`);
    return response.data;
  },

  async resetUser(id: string, userId: string): Promise<TourAudienceResetResponse> {
    const response = await apiClient.post(`/tours/${id}/reset-user`, { userId });
    return response.data;
  },

  async resetSegment(
    id: string,
    payload: {
      segment: 'all' | 'new_users' | 'inactive_users' | 'custom_user_ids';
      createdWithinDays?: number;
      inactiveDays?: number;
      userIds?: string[];
    },
  ): Promise<TourSegmentResetResponse> {
    const response = await apiClient.post(`/tours/${id}/reset-segment`, payload);
    return response.data;
  },

  async runReplayJob(): Promise<{ success: boolean; message?: string; updatedStates?: number }> {
    const response = await apiClient.post('/tours/jobs/replay/run');
    return response.data;
  },
};

export interface OrganizationJourneyBlueprintRow {
  id: string;
  organizationId: string;
  blueprintId: string;
  vertical: string;
  isPublished: boolean;
  payload: Record<string, unknown>;
  createdBy?: string | null;
  accessGrants?: Array<{
    id?: string;
    userId: string;
    accessMode: 'modify' | 'publish';
    user?: {
      id: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    };
  }>;
  sharingHasModify?: boolean;
  sharingHasPublish?: boolean;
  editLock?: {
    required: boolean;
    heldByUserId?: string;
    heldByDisplayName?: string;
    lockedAt?: string;
    expiresAt?: string;
    isHeldByMe: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface JourneyBlueprintCatalog {
  verticals: string[];
  intents: string[];
  semanticRoles: string[];
}

export const journeyBlueprintService = {
  async getCatalog(): Promise<{ success: boolean; catalog: JourneyBlueprintCatalog }> {
    const response = await apiClient.get('/tours/contextual/blueprints/catalog');
    return response.data;
  },

  async listManage(): Promise<{
    success: boolean;
    count: number;
    blueprints: OrganizationJourneyBlueprintRow[];
  }> {
    const response = await apiClient.get('/tours/contextual/blueprints/manage');
    return response.data;
  },

  async getManage(rowId: string): Promise<{
    success: boolean;
    blueprint: OrganizationJourneyBlueprintRow;
  }> {
    const response = await apiClient.get(`/tours/contextual/blueprints/${rowId}/manage`);
    return response.data;
  },

  async setAccessGrants(
    rowId: string,
    grants: Array<{ userId: string; accessMode: 'modify' | 'publish' }>,
    replace = true,
  ): Promise<{ success: boolean; blueprint: OrganizationJourneyBlueprintRow }> {
    const response = await apiClient.put(`/tours/contextual/blueprints/${rowId}/access-grants`, {
      grants,
      replace,
    });
    return response.data;
  },

  async create(payload: {
    blueprint: Record<string, unknown>;
    isPublished?: boolean;
  }): Promise<{ success: boolean; blueprint: OrganizationJourneyBlueprintRow }> {
    const response = await apiClient.post('/tours/contextual/blueprints', payload);
    return response.data;
  },

  async update(
    rowId: string,
    payload: { blueprint: Record<string, unknown>; isPublished?: boolean },
  ): Promise<{ success: boolean; blueprint: OrganizationJourneyBlueprintRow }> {
    const response = await apiClient.put(`/tours/contextual/blueprints/${rowId}`, payload);
    return response.data;
  },

  async setPublished(
    rowId: string,
    isPublished: boolean,
  ): Promise<{ success: boolean; blueprint: OrganizationJourneyBlueprintRow }> {
    const response = await apiClient.put(`/tours/contextual/blueprints/${rowId}/publish`, {
      isPublished,
    });
    return response.data;
  },

  async remove(rowId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/tours/contextual/blueprints/${rowId}`);
    return response.data;
  },

  async acquireEditLock(rowId: string): Promise<{
    success: boolean;
    blueprint: OrganizationJourneyBlueprintRow;
    editLock: OrganizationJourneyBlueprintRow['editLock'];
  }> {
    const response = await apiClient.post(
      `/tours/contextual/blueprints/${rowId}/edit-lock/acquire`,
    );
    return response.data;
  },

  async renewEditLock(rowId: string): Promise<{
    success: boolean;
    blueprint: OrganizationJourneyBlueprintRow;
    editLock: OrganizationJourneyBlueprintRow['editLock'];
  }> {
    const response = await apiClient.post(
      `/tours/contextual/blueprints/${rowId}/edit-lock/renew`,
    );
    return response.data;
  },

  async releaseEditLock(rowId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(
      `/tours/contextual/blueprints/${rowId}/edit-lock`,
    );
    return response.data;
  },
};

export const sdkTokenService = {
  async getCatalog(): Promise<{
    success: boolean;
    catalog: { scopes: string[]; adminOnly: string[] };
  }> {
    const response = await apiClient.get('/auth/sdk-tokens/catalog');
    return response.data;
  },

  async list(): Promise<{
    success: boolean;
    count: number;
    tokens: Array<{
      id: string;
      name: string;
      tokenSuffix: string;
      scopes: string[];
      createdAt: string;
      lastUsedAt: string | null;
      revokedAt: string | null;
      expiresAt: string | null;
    }>;
  }> {
    const response = await apiClient.get('/auth/sdk-tokens');
    return response.data;
  },

  async create(payload: {
    name: string;
    scopes?: string[];
    expiresInDays?: number;
  }): Promise<{
    success: boolean;
    message: string;
    token: string;
    tokenRecord: {
      id: string;
      name: string;
      tokenSuffix: string;
      scopes: string[];
      expiresAt: string | null;
    };
  }> {
    const response = await apiClient.post('/auth/sdk-tokens', payload);
    return response.data;
  },

  async revoke(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/auth/sdk-tokens/${id}`);
    return response.data;
  },

  async removeRevokedFromHistory(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/auth/sdk-tokens/${id}/permanent`);
    return response.data;
  },

  async purgeRevokedHistory(): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
  }> {
    const response = await apiClient.delete('/auth/sdk-tokens/revoked-history');
    return response.data;
  },

  async listAudit(limit = 50): Promise<{
    success: boolean;
    count: number;
    events: Array<{
      id: string;
      eventType: string;
      tokenId: string | null;
      sessionTokenId: string | null;
      actorUserId: string | null;
      ip: string | null;
      metadata: Record<string, unknown>;
      createdAt: string;
    }>;
  }> {
    const response = await apiClient.get('/auth/sdk-tokens/audit', { params: { limit } });
    return response.data;
  },
};

export default apiClient;