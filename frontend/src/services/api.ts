import axios from 'axios';
import {
  ApiResponse,
  DashboardStats,
  EmailJob,
  ScheduleSinglePayload,
  ScheduleBatchPayload,
  EtherealAccountInfo,
  UserProfile,
} from '../types/email';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token if stored
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  // Stats
  async getStats(): Promise<DashboardStats> {
    const res = await apiClient.get<ApiResponse<DashboardStats>>('/emails/stats');
    return res.data.data;
  },

  // Scheduled
  async getScheduled(page = 1, limit = 50, search = ''): Promise<{ items: EmailJob[]; pagination?: any }> {
    const res = await apiClient.get<ApiResponse<EmailJob[]>>('/emails/scheduled', {
      params: { page, limit, search },
    });
    return {
      items: res.data.data,
      pagination: res.data.pagination,
    };
  },

  // Sent
  async getSent(page = 1, limit = 50, search = ''): Promise<{ items: EmailJob[]; pagination?: any }> {
    const res = await apiClient.get<ApiResponse<EmailJob[]>>('/emails/sent', {
      params: { page, limit, search },
    });
    return {
      items: res.data.data,
      pagination: res.data.pagination,
    };
  },

  // Schedule Single
  async scheduleSingle(payload: ScheduleSinglePayload): Promise<EmailJob> {
    const res = await apiClient.post<ApiResponse<EmailJob>>('/emails/schedule', payload);
    return res.data.data;
  },

  // Schedule Batch
  async scheduleBatch(payload: ScheduleBatchPayload): Promise<{ batchId: string; totalScheduled: number }> {
    const res = await apiClient.post<ApiResponse<{ batchId: string; totalScheduled: number }>>('/emails/batch', payload);
    return res.data.data;
  },

  // Cancel Email
  async cancelEmail(id: string): Promise<EmailJob> {
    const res = await apiClient.delete<ApiResponse<EmailJob>>(`/emails/${id}`);
    return res.data.data;
  },

  // Ethereal Credentials
  async getEtherealInfo(): Promise<EtherealAccountInfo | null> {
    try {
      const res = await apiClient.get<ApiResponse<EtherealAccountInfo>>('/emails/ethereal-account');
      return res.data.data;
    } catch {
      return null;
    }
  },

  // Auth
  async login(email?: string, password?: string): Promise<{ token: string; user: UserProfile }> {
    const res = await apiClient.post<ApiResponse<{ token: string; user: UserProfile }>>('/auth/login', {
      email,
      password,
    });
    return res.data.data;
  },
};
