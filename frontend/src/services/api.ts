import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthTokens } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const TOKEN_KEY = 'zanflow_tokens';

export const getTokens = (): AuthTokens | null => {
  const tokens = localStorage.getItem(TOKEN_KEY);
  return tokens ? JSON.parse(tokens) : null;
};

export const setTokens = (tokens: AuthTokens): void => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
};

export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = getTokens();
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const tokens = getTokens();
      if (tokens?.refresh) {
        try {
          const response = await axios.post<AuthTokens>(
            `${API_URL}/auth/refresh/`,
            { refresh: tokens.refresh }
          );
          setTokens(response.data);
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return api(originalRequest);
        } catch {
          clearTokens();
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await api.post<AuthTokens>('/auth/login/', {
      username,
      password,
    });
    setTokens(response.data);
    // Update the default header immediately for subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
    return response.data;
  },

  logout: () => {
    clearTokens();
    delete api.defaults.headers.common['Authorization'];
  },

  register: async (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
  }) => {
    const response = await api.post('/auth/register/', data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me/');
    return response.data;
  },
};

// Projects API
export const projectsApi = {
  list: async (params?: { task_type?: string; is_active?: boolean }) => {
    const response = await api.get('/projects/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/projects/${id}/`);
    return response.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    task_type: string;
    settings?: Record<string, unknown>;
  }) => {
    const response = await api.post('/projects/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<{ name: string; description: string }>) => {
    const response = await api.patch(`/projects/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/projects/${id}/`);
  },

  getStats: async (id: number) => {
    const response = await api.get(`/projects/${id}/stats/`);
    return response.data;
  },

  // Add inside projectsApi object:
  createLabel: async (projectId: number, data: { name: string; color: string }) => {
    const response = await api.post(`/projects/${projectId}/labels/`, data);
    return response.data;
  },

  deleteLabel: async (projectId: number, labelId: number) => {
    const response = await api.delete(`/projects/${projectId}/labels/${labelId}/`);
    return response.data;
  },
};

// Documents API
export const documentsApi = {
  list: async (params?: {
    project?: number;
    status?: string;
    file_type?: string;
    page?: number;
  }) => {
    const response = await api.get('/documents/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get(`/documents/${id}/`);
    return response.data;
  },

  create: async (data: FormData) => {
    const response = await api.post('/documents/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id: string, data: Partial<{ name: string; description: string }>) => {
    const response = await api.patch(`/documents/${id}/`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/documents/${id}/`);
  },

  uploadSource: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/documents/${id}/upload-source/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getVersions: async (id: string) => {
    const response = await api.get(`/documents/${id}/versions/`);
    return response.data;
  },

  createVersion: async (id: string, data: { gt_data: Record<string, unknown>; change_summary?: string }) => {
    const response = await api.post(`/documents/${id}/versions/`, data);
    return response.data;
  },

  getVersionDiff: async (id: string, v1: string | number, v2: string | number) => {
    const response = await api.get(`/documents/${id}/versions/diff/`, {
      params: { v1, v2 },
    });
    return response.data;
  },

  submitForReview: async (id: string) => {
    const response = await api.post(`/documents/${id}/submit-for-review/`);
    return response.data;
  },

  approve: async (id: string, versionId?: string) => {
    const response = await api.post(`/documents/${id}/approve/`, {
      version_id: versionId,
    });
    return response.data;
  },
  // Add inside documentsApi object:
  addLabel: async (documentId: string, labelId: number) => {
    const response = await api.post(`/documents/${documentId}/labels/`, { label_id: labelId });
    return response.data;
  },

  removeLabel: async (documentId: string, labelId: number) => {
    const response = await api.delete(`/documents/${documentId}/labels/${labelId}/`);
    return response.data;
  },
};

// Test Runs API
export const testRunsApi = {
  list: async (params?: { project?: number; status?: string }) => {
    const response = await api.get('/test-runs/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get(`/test-runs/${id}/`);
    return response.data;
  },

  create: async (data: {
    project: number;
    name?: string;
    config?: Record<string, unknown>;
  }) => {
    const response = await api.post('/test-runs/', data);
    return response.data;
  },
};

// Issues API
export const issuesApi = {
  list: async (params?: {
    project?: number;
    status?: string;
    priority?: string;
    assignee?: number;
  }) => {
    const response = await api.get('/issues/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get(`/issues/${id}/`);
    return response.data;
  },

  create: async (data: {
    project: number;
    title: string;
    description?: string;
    priority?: string;
    issue_type?: string;
  }) => {
    const response = await api.post('/issues/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<{ title: string; status: string; priority: string }>) => {
    const response = await api.patch(`/issues/${id}/`, data);
    return response.data;
  },
};

export default api;
