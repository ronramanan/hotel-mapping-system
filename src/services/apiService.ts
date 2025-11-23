// API Service for Hotel Mapping System
import axios, { AxiosInstance } from 'axios';

class APIService {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3001/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request interceptor for auth
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Dashboard
  async getDashboardStats() {
    const response = await this.client.get('/dashboard');
    return response.data;
  }

  // File Upload
  async getPresignedUrl(fileName: string, fileType: 'master' | 'supplier') {
    const response = await this.client.post('/presigned-url', {
      fileName,
      fileType,
    });
    return response.data;
  }

  async uploadFile(url: string, file: File, onProgress?: (progress: number) => void) {
    return axios.put(url, file, {
      headers: {
        'Content-Type': 'text/csv',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // Import Jobs
  async getImportJobs() {
    const response = await this.client.get('/import-jobs');
    return response.data;
  }

  // Matching
  async getUnmatchedHotels(filters: {
    supplier?: string;
    country?: string;
    city?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.client.post('/unmatched-hotels', { filters });
    return response.data;
  }

  async getPotentialMatches(supplierHotelId: number) {
    const response = await this.client.post('/potential-matches', { supplierHotelId });
    return response.data;
  }

  async confirmMatch(supplierHotelId: number, masterHotelId: number, userId?: string) {
    const response = await this.client.post('/confirm-match', {
      supplierHotelId,
      masterHotelId,
      userId: userId || 'user',
    });
    return response.data;
  }

  async rejectMatch(supplierHotelId: number, masterHotelId: number, userId?: string) {
    const response = await this.client.post('/reject-match', {
      supplierHotelId,
      masterHotelId,
      userId: userId || 'user',
    });
    return response.data;
  }

  async markNoMatch(supplierHotelId: number, userId?: string) {
    const response = await this.client.post('/mark-no-match', {
      supplierHotelId,
      userId: userId || 'user',
    });
    return response.data;
  }

  // Export
  async exportMappings(supplierCode: string) {
    const response = await this.client.post('/export-mappings', { supplierCode });
    return response.data;
  }

  // Suppliers
  async getSuppliers() {
    const response = await this.client.get('/suppliers');
    return response.data;
  }

  async getSupplierStats(supplierCode: string) {
    const response = await this.client.get(`/suppliers/${supplierCode}/stats`);
    return response.data;
  }
}

export const apiService = new APIService();
