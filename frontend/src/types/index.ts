export type Role = 'backer' | 'creator' | 'admin';

export type CampaignStatus = 'DRAFT' | 'SUBMITTED';

export type PredictionLabel = 'Likely Success' | 'Likely Fail';

export type ModelAlgorithm = 'LogisticRegression' | 'RandomForest' | 'XGBoost';

export interface User {
  userId: number;
  name: string;
  email: string;
  role: Role;
  organization?: string;
  isActive?: boolean;
  createdAt?: string;
  totalPledged?: number;
  adminLevel?: number;
}

export interface Category {
  categoryId: number;
  name: string;
}

export interface Reward {
  rewardId: number;
  minPledge: number;
  description: string;
  title?: string;
  quantity?: number;
}

export interface Campaign {
  campaignId: number;
  title: string;
  description: string;
  goalAmount: number;
  durationDays: number;
  country: string;
  categoryId: number;
  status: CampaignStatus;
  goalPerDay?: number;
  rewards: Reward[];
  category?: Category;
  categoryName?: string;
  creator?: User;
  creatorId?: number;
  creatorName?: string;
  pledgedAmount?: number;
  backerCount?: number;
  createdAt?: string;
  updatedAt?: string;
  endsAt?: string;
  prediction?: Prediction | null;
}

export interface Pledge {
  pledgeId: number;
  amount: number;
  date: string;
  campaignId: number;
  rewardId?: number | null;
  userId?: number;
  campaign?: Campaign;
  reward?: Reward;
}

export interface Prediction {
  predictionId: number;
  probability: number;
  label: PredictionLabel;
  topFactors: Record<string, number>;
  createdAt: string;
  modelVersion: string;
  campaignId?: number;
  campaign?: Campaign;
  modelAlgorithm?: ModelAlgorithm;
  modelVersionId?: number;
  explanation?: string;
}

export interface Dataset {
  datasetId: number;
  fileName: string;
  rowCount: number;
  uploadedAt: string;
  features?: number;
  uploadedBy?: string;
  status?: 'validated' | 'archived' | 'processing';
}

export interface ModelVersion {
  versionId: number;
  algorithm: ModelAlgorithm;
  accuracy: number;
  f1Score: number;
  datasetId: number;
  isActive: boolean;
  createdAt: string;
  name?: string;
  version?: string;
  precision?: number;
  recall?: number;
  rocAuc?: number;
  datasetName?: string;
  trainingStatus?: 'training' | 'ready' | 'failed';
  hyperparameters?: Record<string, string | number>;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface ModelMetrics {
  accuracy: number;
  f1Score: number;
  precision: number;
  recall: number;
  rocAuc?: number;
  evaluatedAt?: string;
  confusionMatrix?: {
    truePositive: number;
    falsePositive: number;
    falseNegative: number;
    trueNegative: number;
  };
  featureImportance?: FeatureImportance[];
}

export interface AdminStats {
  users: {
    total: number;
    backers: number;
    creators: number;
    admins: number;
    active: number;
  };
  campaigns: {
    total: number;
    evaluated: number;
    active: number;
    drafts: number;
  };
  predictions: {
    total: number;
    averageProbability: number;
    successCount: number;
  };
  models: {
    total: number;
    activeVersion?: string;
    activeAlgorithm?: ModelAlgorithm;
    accuracy: number;
    f1Score: number;
  };
  datasets: {
    total: number;
    rows: number;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CampaignListParams {
  search?: string;
  category?: string;
  country?: string;
  minGoal?: number;
  maxGoal?: number;
  page?: number;
  pageSize?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Exclude<Role, 'admin'>;
  organization?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CampaignInput {
  title: string;
  description: string;
  goalAmount: number;
  durationDays: number;
  country: string;
  categoryId: number;
  status?: CampaignStatus;
  rewards: Array<{
    rewardId?: number;
    minPledge: number;
    description: string;
    title?: string;
    quantity?: number;
  }>;
}

export interface CreatePledgeInput {
  amount: number;
  rewardId?: number | null;
}

export interface TrainModelInput {
  algorithm: ModelAlgorithm;
  datasetId: number;
  hyperparameters: Record<string, string | number>;
}

export type ApiFieldErrorValue = string | string[] | { message?: string; msg?: string };

export interface ApiErrorShape {
  message?: string;
  detail?: string | Array<Record<string, unknown>>;
  error?: string;
  title?: string;
  errors?: Record<string, ApiFieldErrorValue> | Array<Record<string, unknown> | string>;
  validationErrors?: Record<string, ApiFieldErrorValue> | Array<Record<string, unknown> | string>;
  violations?: Array<Record<string, unknown> | string>;
  status?: number;
  [key: string]: unknown;
}
