import type { ModelAlgorithm, Role } from '@/types';

export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'IN', name: 'India' },
  { code: 'AU', name: 'Australia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
] as const;

export const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((country) => [country.code, country.name]),
);

export const ROLE_LABELS: Record<Role, string> = {
  backer: 'Backer',
  creator: 'Creator',
  admin: 'Admin',
};

export const ALGORITHM_LABELS: Record<ModelAlgorithm, string> = {
  LogisticRegression: 'Logistic Regression',
  RandomForest: 'Random Forest',
  XGBoost: 'XGBoost',
};

export const ALGORITHM_DESCRIPTIONS: Record<ModelAlgorithm, string> = {
  LogisticRegression:
    'Fast, interpretable baseline. Best when you need transparent coefficients and quick retraining.',
  RandomForest:
    'Ensemble of decision trees that handles non-linear interactions and mixed feature scales well.',
  XGBoost:
    'Gradient-boosted trees with strong ranking power. Usually the best raw accuracy when tuned.',
};

export const ALGORITHM_HYPERPARAMETERS: Record<
  ModelAlgorithm,
  Array<{
    name: string;
    label: string;
    helper: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
  }>
> = {
  LogisticRegression: [
    {
      name: 'C',
      label: 'Regularization strength (C)',
      helper: 'Lower values apply stronger regularization.',
      min: 0.01,
      max: 10,
      step: 0.01,
      defaultValue: 1,
    },
    {
      name: 'max_iter',
      label: 'Maximum iterations',
      helper: 'Upper bound on solver iterations.',
      min: 100,
      max: 5000,
      step: 100,
      defaultValue: 1000,
    },
  ],
  RandomForest: [
    {
      name: 'n_estimators',
      label: 'Number of trees',
      helper: 'More trees usually improve stability at a compute cost.',
      min: 10,
      max: 1000,
      step: 10,
      defaultValue: 200,
    },
    {
      name: 'max_depth',
      label: 'Maximum depth',
      helper: 'Deeper trees capture interactions but can overfit.',
      min: 2,
      max: 40,
      step: 1,
      defaultValue: 12,
    },
  ],
  XGBoost: [
    {
      name: 'learning_rate',
      label: 'Learning rate',
      helper: 'Step size shrinkage used to prevent overfitting.',
      min: 0.01,
      max: 0.5,
      step: 0.01,
      defaultValue: 0.1,
    },
    {
      name: 'n_estimators',
      label: 'Number of boosting rounds',
      helper: 'Number of sequential trees to fit.',
      min: 50,
      max: 1000,
      step: 50,
      defaultValue: 300,
    },
  ],
};

export const ACTIVE_MODEL_KEY = 'cp_active_model';

export const DEMO_CREDENTIALS = [
  { role: 'Admin', email: 'admin@crowdpredict.app', password: 'admin123' },
  { role: 'Creator', email: 'ayesha@ecobottle.io', password: 'creator123' },
  { role: 'Backer', email: 'backer@crowdpredict.app', password: 'backer123' },
];
