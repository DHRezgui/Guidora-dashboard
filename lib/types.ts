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

export interface Step {
  id: string;
  orderIndex: number;
  title: string;
  content: string;
  targetSelector?: string;
  position?: PositionType;
  action?: ActionType;
  skipAllowed?: boolean;
  highlightElement?: boolean;
}

export interface GuidedTour {
  id?: string;
  name: string;
  description?: string;
  targetUrl: string;
  isActive?: boolean;
  priority?: number;
  triggerConditions?: Record<string, any>;
  steps: Step[];
  createdAt?: string;
  updatedAt?: string;
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