/**
 * Client API centralisé - toutes les requêtes vers le backend
 */

import axios, { AxiosInstance } from 'axios';
import { Appointment, AppointmentFormData, Customer, Service, DashboardStats, AIAnalysis } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Créer l'instance axios avec token automatique
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${API_URL}/api`,
    headers: { 'Content-Type': 'application/json' },
  });

  // Injecter le JWT token dans chaque requête
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Gérer l'expiration du token
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const api = createApiClient();

// =============================================================
// AUTH
// =============================================================
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: {
    fullName: string;
    email: string;
    password: string;
    businessName: string;
    businessType?: string;
    phone?: string;
  }) => api.post('/auth/register', data),

  getMe: () => api.get('/auth/me'),

  updateProfile: (data: Record<string, string>) => api.put('/auth/profile', data),
};

// =============================================================
// APPOINTMENTS
// =============================================================
export const appointmentsApi = {
  getAll: (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get<{ appointments: Appointment[]; pagination: object }>('/appointments', { params }),

  getById: (id: string) =>
    api.get<{ appointment: Appointment }>(`/appointments/${id}`),

  create: (data: AppointmentFormData) =>
    api.post<{ appointment: Appointment }>('/appointments', data),

  update: (id: string, data: Partial<AppointmentFormData>) =>
    api.put<{ appointment: Appointment }>(`/appointments/${id}`, data),

  delete: (id: string) =>
    api.delete(`/appointments/${id}`),

  getStats: () =>
    api.get<{ stats: DashboardStats }>('/appointments/stats'),
};

// =============================================================
// SERVICES
// =============================================================
export const servicesApi = {
  getAll: () => api.get<{ services: Service[] }>('/services'),

  create: (data: Partial<Service>) => api.post<{ service: Service }>('/services', data),

  update: (id: string, data: Partial<Service>) =>
    api.put<{ service: Service }>(`/services/${id}`, data),

  delete: (id: string) => api.delete(`/services/${id}`),
};

// =============================================================
// CUSTOMERS
// =============================================================
export const customersApi = {
  getAll: (params?: { search?: string; page?: number }) =>
    api.get<{ customers: Customer[]; total: number }>('/customers', { params }),

  create: (data: Partial<Customer>) =>
    api.post<{ customer: Customer }>('/customers', data),

  update: (id: string, data: Partial<Customer>) =>
    api.put<{ customer: Customer }>(`/customers/${id}`, data),
};

// =============================================================
// WHATSAPP
// =============================================================
export const whatsappApi = {
  simulate: (data: { customerPhone: string; customerName: string; message: string }) =>
    api.post('/whatsapp/simulate', data),

  getMessages: (params?: { phone?: string; page?: number }) =>
    api.get('/whatsapp/messages', { params }),
};

// =============================================================
// IA
// =============================================================
export const aiApi = {
  analyze: (message: string) =>
    api.post<AIAnalysis>('/ai/analyze', { message }),
};
