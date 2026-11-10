import type {
  AdminStats,
  AuthResponse,
  Campaign,
  CampaignInput,
  CampaignListParams,
  Category,
  CreatePledgeInput,
  Dataset,
  LoginInput,
  ModelMetrics,
  ModelVersion,
  Paginated,
  Pledge,
  Prediction,
  RegisterInput,
  TrainModelInput,
  User,
} from '@/types';
import {
  TRAINING_TIMEOUT,
  UPLOAD_TIMEOUT,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from '@/lib/api';

export const authApi = {
  login: (input: LoginInput) => apiPost<AuthResponse>('/auth/login', input),
  register: (input: RegisterInput) => apiPost<AuthResponse>('/auth/register', input),
  me: () => apiGet<User>('/auth/me'),
  logout: () => apiPost<{ success: boolean }>('/auth/logout'),
};

export const campaignApi = {
  list: (params: CampaignListParams = {}) => apiGet<Paginated<Campaign>>('/campaigns', { params }),
  mine: () => apiGet<Paginated<Campaign>>('/campaigns', { params: { mine: true, pageSize: 100 } }),
  get: (campaignId: number) => apiGet<Campaign>(`/campaigns/${campaignId}`),
  create: (input: CampaignInput) => apiPost<Campaign>('/campaigns', input),
  update: (campaignId: number, input: Partial<CampaignInput>) => apiPut<Campaign>(`/campaigns/${campaignId}`, input),
  remove: (campaignId: number) => apiDelete<{ success: boolean }>(`/campaigns/${campaignId}`),
  categories: () => apiGet<Category[]>('/categories'),
};

export const pledgeApi = {
  create: (campaignId: number, input: CreatePledgeInput) =>
    apiPost<Pledge>(`/campaigns/${campaignId}/pledges`, input),
  mine: () => apiGet<Pledge[]>('/pledges/mine'),
};

export const predictionApi = {
  create: (campaignId: number) => apiPost<Prediction>('/predictions', { campaignId }),
  list: (params: { page?: number; pageSize?: number; campaignId?: number } = {}) =>
    apiGet<Paginated<Prediction>>('/predictions', { params }),
  get: (predictionId: number) => apiGet<Prediction>(`/predictions/${predictionId}`),
};

export const adminApi = {
  stats: () => apiGet<AdminStats>('/admin/stats'),
  datasets: () => apiGet<Dataset[]>('/admin/datasets'),
  uploadDataset: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiPost<Dataset>('/admin/datasets', form, { timeout: UPLOAD_TIMEOUT });
  },
  deleteDataset: (datasetId: number) => apiDelete<{ success: boolean }>(`/admin/datasets/${datasetId}`),
  models: () => apiGet<ModelVersion[]>('/admin/models'),
  train: (input: TrainModelInput) =>
    apiPost<ModelVersion>('/admin/models/train', input, { timeout: TRAINING_TIMEOUT }),
  metrics: (modelId: number) => apiGet<ModelMetrics>(`/admin/models/${modelId}/metrics`),
  activate: (modelId: number) => apiPatch<ModelVersion>(`/admin/models/${modelId}/activate`),
  users: (search = '') => apiGet<User[]>('/admin/users', { params: search ? { search } : undefined }),
  updateRole: (userId: number, role: User['role']) => apiPatch<User>(`/admin/users/${userId}/role`, { role }),
  updateStatus: (userId: number, isActive: boolean) =>
    apiPatch<User>(`/admin/users/${userId}/status`, { isActive }),
};
