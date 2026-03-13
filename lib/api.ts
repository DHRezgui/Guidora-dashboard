import axios from 'axios';
import { AuthResponse, LoginCredentials, UserResponse, CreateUserDto, UpdateUserDto, OrganizationResponse, CreateOrganizationDto, UpdateOrganizationDto } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

// Créer une instance axios configurée
const apiClient = axios.create({
  baseURL: API_URL,
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
    const data = err.response?.data;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
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

  getUser(): any | null {
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

  async getById(id: string): Promise<UserResponse> {
    const response = await apiClient.get(`/user/${id}`);
    return response.data;
  },

  async create(data: CreateUserDto): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/register', data);
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
};

export default apiClient;