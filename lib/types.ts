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
  organizationId?: string;
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
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'DEVELOPER' | 'USER';
  isActive?: boolean;
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