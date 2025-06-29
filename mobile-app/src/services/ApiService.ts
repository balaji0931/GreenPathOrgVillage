import { ApiResponse } from '@/types';

const API_BASE_URL = 'https://845c1088-dc81-45f6-97e0-77a8e59068de-00-2tewhkodog24x.sisko.replit.dev';

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Include cookies for session management
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API Request Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('File Upload Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    return this.post('/api/auth/login', { email, password });
  }

  async logout() {
    return this.post('/api/auth/logout');
  }

  async getCurrentUser() {
    return this.get('/api/auth/user');
  }

  // Village endpoints
  async getVillages() {
    return this.get('/api/villages');
  }

  async createVillage(data: any) {
    return this.post('/api/villages', data);
  }

  // Household endpoints
  async getHouseholds(villageId?: string) {
    const query = villageId ? `?villageId=${villageId}` : '';
    return this.get(`/api/households${query}`);
  }

  async createHousehold(data: any) {
    return this.post('/api/households', data);
  }

  // Collection endpoints
  async getCollections(filters?: any) {
    const query = new URLSearchParams(filters).toString();
    return this.get(`/api/collections${query ? `?${query}` : ''}`);
  }

  async createCollection(data: any) {
    return this.post('/api/collections', data);
  }

  async uploadCollectionFile(file: FormData) {
    return this.uploadFile('/api/collections/upload', file);
  }

  // Issue endpoints
  async getIssues(filters?: any) {
    const query = new URLSearchParams(filters).toString();
    return this.get(`/api/issues${query ? `?${query}` : ''}`);
  }

  async createIssue(data: any) {
    return this.post('/api/issues', data);
  }

  async updateIssue(id: string, data: any) {
    return this.put(`/api/issues/${id}`, data);
  }

  // Stats endpoints
  async getDashboardStats(role: string, villageId?: string) {
    const query = villageId ? `?villageId=${villageId}` : '';
    return this.get(`/api/stats/${role}${query}`);
  }

  // Announcement endpoints
  async getAnnouncements(villageId?: string) {
    const query = villageId ? `?villageId=${villageId}` : '';
    return this.get(`/api/announcements${query}`);
  }

  async createAnnouncement(data: any) {
    return this.post('/api/announcements', data);
  }

  // User management endpoints
  async getUsers(role?: string, villageId?: string) {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (villageId) params.append('villageId', villageId);
    const query = params.toString();
    return this.get(`/api/users${query ? `?${query}` : ''}`);
  }

  async createUser(data: any) {
    return this.post('/api/users', data);
  }

  async updateUser(id: string, data: any) {
    return this.put(`/api/users/${id}`, data);
  }
}

export const apiService = new ApiService();
export default apiService;