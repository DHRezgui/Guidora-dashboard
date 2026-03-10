import axios from 'axios';
import { AuthResponse, LoginCredentials, UserResponse, CreateUserDto, UpdateUserDto } from './types';

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

// Service d'authentification
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', credentials);
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
};

export default apiClient;