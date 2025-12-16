import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthTokens, User as AppUser, PaginatedResponse, ToolDocumentListPayload, DocumentDetailResponse, GroundTruthApiResponse, GroundTruthEntry, PageContentResponse, PageContentErrorResponse, GetTableCellsResponse, ProjectMinimal, PaginatedProjectsResponse, GetUploadUrlPayload, GetUploadUrlResponse } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.4:8000/api/v1';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.4:8002/';


export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fileApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
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
    const response = await api.get<PaginatedProjectsResponse>('/projects/', { params });
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


  getUploadUrl: async (projectId: number, data: GetUploadUrlPayload) => {
    const response = await api.post<GetUploadUrlResponse>(
      `/projects/${projectId}/get-upload-url/`,
      data
    );
    return response.data;
  },

  uploadFileToS3: async (
    s3Url: string,
    fields: Record<string, string>,
    file: File
  ) => {
    const formData = new FormData();
    Object.keys(fields).forEach(key => {
      formData.append(key, fields[key]);
    });
    formData.append('file', file);

    // Note: We use plain axios because the URL is external (S3)
    // and requires a special content-type for S3 POST upload.
    await axios.post(s3Url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data', 
      },
    });
  },

  // This `create` now expects the final S3 file_key
 create: async (data: { 
    project: number; 
    name: string; 
    description: string;
    file_key: string; 
    initial_gt_data?: Record<string, unknown>;
    file_type: string; // <--- ADD THIS LINE
  }) => {
    const response = await api.post('/documents/', data);
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

// Add New Task API
export const taskApi = {
  list: async () => {
    const response = await api.get('/tasksite/');
    return response.data;
  },

  // Create a new task
  create: async (data: {
    heading: string;
    description: string;
    start_date: string;
    end_date: string;
    assigned_to: number[];
    status: string;
    priority: string;
    project_name?: string;
  }) => {
    const response = await api.post('/tasksite/', data);
    return response.data;
  },

  update: async (taskId: number, data: Partial<{ status: string }>) => {
    const response = await api.patch(`/tasksite/${taskId}/`, data);
    return response.data;
  },

  delete: async (taskId: number) => {
    const response = await api.delete(`/tasksite/${taskId}/`);
    return response.data;
  },

  getPerformance: async (userId: number) => {
    const response = await api.get(`/tasksite/performance/${userId}/`);
    const apiData = response.data;
    const performanceMetrics = apiData.performance_metrics || {};

    const mappedPerformance = {
      completed_tasks_count: performanceMetrics.completed ?? 0,
      in_progress_tasks_count: performanceMetrics.in_progress ?? 0,
      pending_tasks_count: performanceMetrics.pending ?? 0,
      total_tasks_count: performanceMetrics.total ?? 0,

      performance_score: performanceMetrics.total
        ? Math.round((performanceMetrics.completed / performanceMetrics.total) * 100)
        : 0,
    };

    const taskHistory = apiData.task_history || [];
    const projectDistributionMap: Record<string, { task_count: number }> = {};

    taskHistory.forEach((task: any) => {
      const projectName = task.project_name || 'Unassigned Project';
      if (!projectDistributionMap[projectName]) {
        projectDistributionMap[projectName] = { task_count: 0 };
      }
      projectDistributionMap[projectName].task_count += 1;
    });

    const projectDistribution = Object.keys(projectDistributionMap).map(name => ({
      project_name: name,
      task_count: projectDistributionMap[name].task_count,
      total_project_tasks: apiData.performance_metrics.total,
    }));

    const recentActivity = taskHistory.map((task: any) => ({
      task_name: task.heading,
      project_name: task.project_name || 'Unassigned Project',
      status: task.status,
      timestamp: task.updated_at,
    })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());


    return {
      ...mappedPerformance,
      project_distribution: projectDistribution,
      recent_activity: recentActivity,
    };

  },

};


// User ManagementAPI
export const usersApi = {
  list: async () => {
    const response = await api.get<PaginatedResponse<AppUser>>('/auth/users/');
    return response.data;
  },
  listAll: async () => {
    const response = await api.get<{ message: string, users: AppUser[] }>('/tasksite/all-users/');
    return response.data.users;
  },

  create: async (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    role: AppUser['role'];
  }) => {
    const response = await api.post<AppUser>('/auth/create-user/', data);
    return response.data;
  },

  updateRole: async (id: number, role: AppUser['role']) => {
    const response = await api.patch<AppUser>(`/auth/update-role/${id}/`, { role });
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/users/${id}/`);
  },
};

// Tools PdfVsHtml API
export const toolApi = {
  getProjectFolders: async () => {
    const res = await fileApi.get<ToolDocumentListPayload>("/documents/");
    return res.data.documents || [];
  },
  getDocumentsInProject: async (projectName: string) => {
    const res = await fileApi.get<ToolDocumentListPayload>(`/documents/${projectName}/`);
    return res.data.documents || [];
  },

  getDocumentDetail: async (projectName: string, docName: string) => {
    const res = await fileApi.get<DocumentDetailResponse>(`/documents/${projectName}/${docName}/`);
    return res.data;
  },

  getAllGroundTruth: async () => {
    const res = await fileApi.get<{ documents: Omit<GroundTruthEntry, 'id'>[] }>("/ground_truth/all");
    return res.data.documents.map((entry: any, index: number) => ({
      ...entry,
      id: `gt-server-${Date.now()}-${index}`,
      docName: entry.docName || entry.document
    })) as GroundTruthEntry[];
  },

  // New function to submit a new ground truth entry
  submitGroundTruth: async (docName: string, entry: Omit<GroundTruthApiResponse, 'id' | 'docName'>) => {
    const res = await fileApi.post(`/ground_truth/${docName}/`, entry);
    return res.data;
  },


  // Tools JSONViewer API
  getTableCellsFileNames: async () => {
    const res = await fileApi.post<GetTableCellsResponse>("/backend/get_table_cells", { load_json: [] }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return res.data;
  },
  fetchPageContentJson: async (fileName: string) => {
    const data = {
      elastic_indx: "10k",
      select_fields: [
        "page",
        "table",
        "image",
        "text",
        "cell",
        "entity",
        "key_value",
        "table_np",
      ],
      PDF: [
        fileName,
      ],
      highlight_words: [],
    };
    const res = await fileApi.post<PageContentResponse | PageContentErrorResponse>("/backend/get_page_content", data, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return res.data;
  },
};





export default api;
