import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type {
  AdminStats,
  Campaign,
  CampaignInput,
  CreatePledgeInput,
  ModelAlgorithm,
  ModelMetrics,
  ModelVersion,
  Paginated,
  Pledge,
  Prediction,
  RegisterInput,
  Reward,
  TrainModelInput,
  User,
} from '@/types';
import { ALGORITHM_LABELS, ALGORITHM_HYPERPARAMETERS } from '@/lib/constants';
import { loadDb, nextId, persistDb } from './db';
import type { MockCampaign, MockDatabase, MockUser } from './seed';

type Body = Record<string, unknown>;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function latency(): Promise<void> {
  await wait(140 + Math.random() * 180);
}

function fail(
  status: number,
  message: string,
  errors?: Record<string, string>,
  config?: InternalAxiosRequestConfig,
): never {
  const response = {
    data: { message, errors },
    status,
    statusText: status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : status === 404 ? 'Not Found' : 'Error',
    headers: {},
    config: config as InternalAxiosRequestConfig,
  } as AxiosResponse;
  throw new AxiosError(
    message,
    status === 401 ? 'ERR_UNAUTHORIZED' : `ERR_${status}`,
    config,
    null,
    response,
  );
}

function headerValue(config: InternalAxiosRequestConfig, name: string): string | undefined {
  const headers = config.headers as unknown as {
    get?: (key: string) => unknown;
    [key: string]: unknown;
  };
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    const value = headers.get(name);
    return value === undefined || value === null ? undefined : String(value);
  }
  const direct = headers[name] ?? headers[name.toLowerCase()];
  return direct === undefined || direct === null ? undefined : String(direct);
}

function parseRequest(config: InternalAxiosRequestConfig): { path: string; params: URLSearchParams } {
  const raw = config.url ?? '';
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    const url = new URL(raw);
    path = `${url.pathname}${url.search}`;
  }
  path = path.replace(/^\/api(?=\/|$)/, '');
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);
  if (config.params && typeof config.params === 'object') {
    for (const [key, value] of Object.entries(config.params as Record<string, unknown>)) {
      if (value === undefined || value === null || value === '') continue;
      params.set(key, String(value));
    }
  }
  return { path: pathname || '/', params };
}

function readBody<T>(config: InternalAxiosRequestConfig): T {
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data) as T;
    } catch {
      return {} as T;
    }
  }
  return (config.data ?? {}) as T;
}

function tokenUser(db: MockDatabase, config: InternalAxiosRequestConfig): MockUser | null {
  const auth = headerValue(config, 'Authorization') ?? '';
  const match = /^Bearer\s+mock-token-(\d+)$/i.exec(auth);
  if (!match) return null;
  return db.users.find((user) => user.userId === Number(match[1])) ?? null;
}

function requireUser(
  db: MockDatabase,
  config: InternalAxiosRequestConfig,
  roles?: Array<User['role']>,
): MockUser {
  const user = tokenUser(db, config);
  if (!user) fail(401, 'Your session has expired. Please sign in again.', undefined, config);
  if (!user.isActive) fail(403, 'This account has been deactivated.', undefined, config);
  if (roles && !roles.includes(user.role)) {
    fail(403, 'You do not have permission to perform this action.', undefined, config);
  }
  return user;
}

function publicUser(user: MockUser): User {
  const { password: _password, ...rest } = user;
  return rest;
}

function categoryOf(db: MockDatabase, categoryId: number) {
  return db.categories.find((category) => category.categoryId === categoryId);
}

function latestPrediction(db: MockDatabase, campaignId: number): Prediction | null {
  return (
    db.predictions
      .filter((prediction) => prediction.campaignId === campaignId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
  );
}

function toCampaign(db: MockDatabase, campaign: MockCampaign): Campaign {
  const category = categoryOf(db, campaign.categoryId);
  const creator = db.users.find((user) => user.userId === campaign.creatorId);
  return {
    ...campaign,
    category,
    categoryName: category?.name,
    creator: creator ? publicUser(creator) : undefined,
    creatorName: creator?.name,
    goalPerDay: campaign.goalAmount / Math.max(1, campaign.durationDays),
    prediction: latestPrediction(db, campaign.campaignId),
  };
}

function toPledge(db: MockDatabase, pledge: MockDatabase['pledges'][number]): Pledge {
  const campaign = db.campaigns.find((item) => item.campaignId === pledge.campaignId);
  const reward = campaign?.rewards.find((item) => item.rewardId === pledge.rewardId);
  return {
    ...pledge,
    campaign: campaign ? toCampaign(db, campaign) : undefined,
    reward,
  };
}

function toPrediction(db: MockDatabase, prediction: Prediction): Prediction {
  const campaign = db.campaigns.find((item) => item.campaignId === prediction.campaignId);
  return {
    ...prediction,
    campaign: campaign ? toCampaign(db, campaign) : undefined,
  };
}

function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const safePage = Math.max(1, page || 1);
  const safeSize = Math.max(1, pageSize || 10);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  return {
    items: items.slice((safePage - 1) * safeSize, safePage * safeSize),
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function validateCampaignInput(input: CampaignInput, config: InternalAxiosRequestConfig): void {
  const errors: Record<string, string> = {};
  if (!input.title?.trim()) errors.title = 'Campaign title is required.';
  if (!input.description?.trim() || input.description.trim().length < 80) {
    errors.description = 'Add at least 80 characters so backers understand the pitch.';
  }
  if (!Number.isFinite(Number(input.goalAmount)) || Number(input.goalAmount) < 100) {
    errors.goalAmount = 'Set a funding goal of at least $100.';
  }
  if (!Number.isFinite(Number(input.durationDays)) || Number(input.durationDays) < 1 || Number(input.durationDays) > 60) {
    errors.durationDays = 'Campaigns must run between 1 and 60 days.';
  }
  if (!input.country) errors.country = 'Choose a market country.';
  if (!input.categoryId) errors.categoryId = 'Choose a category.';
  if (!Array.isArray(input.rewards) || input.rewards.length === 0) {
    errors.rewards = 'Add at least one reward tier.';
  } else {
    input.rewards.forEach((reward, index) => {
      if (!reward.description?.trim()) errors[`rewards.${index}.description`] = 'Describe this reward.';
      if (!Number.isFinite(Number(reward.minPledge)) || Number(reward.minPledge) <= 0) {
        errors[`rewards.${index}.minPledge`] = 'Minimum pledge must be greater than zero.';
      }
    });
  }
  if (Object.keys(errors).length > 0) {
    fail(400, 'Please check the highlighted fields.', errors, config);
  }
}

function calculatePrediction(campaign: MockCampaign): {
  probability: number;
  topFactors: Record<string, number>;
} {
  const goalPerDay = campaign.goalAmount / Math.max(1, campaign.durationDays);
  const rewardCount = campaign.rewards.length;
  const descriptionLength = campaign.description.trim().length;
  const backerCount = campaign.backerCount ?? 0;

  const topFactors: Record<string, number> = {
    goalAmount: Number(clamp(0.34 - campaign.goalAmount / 150000, -0.18, 0.3).toFixed(2)),
    durationDays: Number(
      (campaign.durationDays >= 21 && campaign.durationDays <= 45 ? 0.2 : -0.1).toFixed(2),
    ),
    goalPerDay: Number(
      (goalPerDay <= 500 ? 0.18 : goalPerDay <= 900 ? 0.06 : -0.14).toFixed(2),
    ),
    rewardCount: Number(Math.min(0.12, 0.04 + rewardCount * 0.025).toFixed(2)),
    descriptionLength: Number((descriptionLength >= 280 ? 0.06 : -0.03).toFixed(2)),
    backerVelocity: Number((backerCount >= 100 ? 0.08 : -0.02).toFixed(2)),
  };

  const positive = Object.values(topFactors)
    .filter((value) => value > 0)
    .reduce((sum, value) => sum + value, 0);
  const fundingRatio = (campaign.pledgedAmount ?? 0) / Math.max(1, campaign.goalAmount);
  const probability = Number(
    clamp(0.42 + positive * 0.62 + Math.min(0.12, fundingRatio * 0.12) + (Math.random() * 0.04 - 0.02), 0.05, 0.97).toFixed(2),
  );

  return { probability, topFactors };
}

function featureImportance(algorithm: ModelAlgorithm): Array<{ feature: string; importance: number }> {
  const maps: Record<ModelAlgorithm, Array<[string, number]>> = {
    RandomForest: [
      ['goalAmount', 0.24],
      ['durationDays', 0.18],
      ['goalPerDay', 0.16],
      ['rewardCount', 0.12],
      ['descriptionLength', 0.09],
      ['country', 0.07],
      ['category', 0.06],
      ['backerVelocity', 0.05],
      ['titleLength', 0.03],
    ],
    XGBoost: [
      ['goalPerDay', 0.22],
      ['goalAmount', 0.19],
      ['backerVelocity', 0.16],
      ['durationDays', 0.14],
      ['rewardCount', 0.11],
      ['descriptionLength', 0.08],
      ['category', 0.06],
      ['country', 0.04],
    ],
    LogisticRegression: [
      ['goalAmount', 0.27],
      ['goalPerDay', 0.21],
      ['durationDays', 0.18],
      ['rewardCount', 0.12],
      ['descriptionLength', 0.09],
      ['category', 0.07],
      ['country', 0.06],
    ],
  };
  return maps[algorithm].map(([feature, importance]) => ({ feature, importance }));
}

function metricsFor(model: ModelVersion): ModelMetrics {
  const accuracy = model.accuracy;
  const total = 10000;
  const truePositive = Math.round(total * accuracy * 0.72);
  const trueNegative = Math.round(total * accuracy * 0.28);
  const falsePositive = Math.round(total * (1 - accuracy) * 0.55);
  const falseNegative = total - truePositive - trueNegative - falsePositive;
  return {
    accuracy: model.accuracy,
    f1Score: model.f1Score,
    precision: model.precision ?? model.accuracy - 0.01,
    recall: model.recall ?? model.accuracy - 0.02,
    rocAuc: model.rocAuc ?? Math.min(0.99, model.accuracy + 0.05),
    evaluatedAt: model.createdAt,
    confusionMatrix: { truePositive, falsePositive, falseNegative, trueNegative },
    featureImportance: featureImportance(model.algorithm),
  };
}

function checkEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const mockAdapter: AxiosAdapter = async (config) => {
  const db = loadDb();
  const { path, params } = parseRequest(config);
  const method = (config.method ?? 'get').toLowerCase();
  const body = () => readBody<Body>(config);
  const respond = (data: unknown, status = 200): AxiosResponse => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config,
  });

  await latency();

  if (path === '/auth/login' && method === 'post') {
    const input = body() as { email?: string; password?: string };
    const email = String(input.email ?? '').trim().toLowerCase();
    const password = String(input.password ?? '');
    const user = db.users.find((item) => item.email.toLowerCase() === email);
    if (!user || user.password !== password) {
      fail(401, 'Email or password is incorrect.', undefined, config);
    }
    if (!user.isActive) fail(403, 'This account has been deactivated. Contact an administrator.', undefined, config);
    return respond({ token: `mock-token-${user.userId}`, user: publicUser(user) });
  }

  if (path === '/auth/register' && method === 'post') {
    const input = body() as Partial<RegisterInput>;
    const name = String(input.name ?? '').trim();
    const email = String(input.email ?? '').trim().toLowerCase();
    const password = String(input.password ?? '');
    const role = input.role === 'creator' ? 'creator' : 'backer';
    const errors: Record<string, string> = {};
    if (name.length < 2) errors.name = 'Enter your full name.';
    if (!checkEmail(email)) errors.email = 'Enter a valid email address.';
    if (password.length < 6) errors.password = 'Use at least 6 characters.';
    if (db.users.some((user) => user.email.toLowerCase() === email)) {
      errors.email = 'An account with this email already exists.';
    }
    if (role === 'creator' && !String(input.organization ?? '').trim()) {
      errors.organization = 'Organization is required for creator accounts.';
    }
    if (Object.keys(errors).length > 0) fail(400, 'Please check the highlighted fields.', errors, config);

    const user: MockUser = {
      userId: nextId('user'),
      name,
      email,
      password,
      role,
      organization: String(input.organization ?? '').trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    persistDb();
    return respond({ token: `mock-token-${user.userId}`, user: publicUser(user) }, 201);
  }

  if (path === '/auth/me' && method === 'get') {
    const user = requireUser(db, config);
    return respond(publicUser(user));
  }

  if (path === '/auth/logout' && method === 'post') {
    return respond({ success: true });
  }

  if (path === '/categories' && method === 'get') {
    return respond(db.categories);
  }

  if (path === '/campaigns' && method === 'get') {
    const user = tokenUser(db, config);
    const mine = params.get('mine') === 'true';
    const creatorId = params.get('creatorId');
    let list = [...db.campaigns];

    if (mine) {
      const owner = requireUser(db, config);
      list = list.filter((campaign) => campaign.creatorId === owner.userId);
    } else if (creatorId) {
      list = list.filter((campaign) => campaign.creatorId === Number(creatorId));
    }

    list = list.filter((campaign) => {
      if (campaign.status !== 'DRAFT') return true;
      if (!user) return false;
      return user.role === 'admin' || campaign.creatorId === user.userId;
    });

    const search = (params.get('search') ?? '').trim().toLowerCase();
    const category = (params.get('category') ?? '').trim().toLowerCase();
    const country = (params.get('country') ?? '').trim();
    const minGoal = params.get('minGoal') ? Number(params.get('minGoal')) : undefined;
    const maxGoal = params.get('maxGoal') ? Number(params.get('maxGoal')) : undefined;

    list = list.filter((campaign) => {
      const categoryName = categoryOf(db, campaign.categoryId)?.name.toLowerCase() ?? '';
      const creatorName = db.users.find((item) => item.userId === campaign.creatorId)?.name.toLowerCase() ?? '';
      if (search) {
        const haystack = `${campaign.title} ${campaign.description} ${categoryName} ${creatorName}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (category && category !== categoryName && category !== String(campaign.categoryId)) return false;
      if (country && campaign.country !== country) return false;
      if (minGoal !== undefined && campaign.goalAmount < minGoal) return false;
      if (maxGoal !== undefined && campaign.goalAmount > maxGoal) return false;
      return true;
    });

    const page = Number(params.get('page') ?? 1);
    const pageSize = Number(params.get('pageSize') ?? 9);
    const result = paginate(
      list.map((campaign) => toCampaign(db, campaign)),
      page,
      pageSize,
    );
    return respond(result);
  }

  if (path === '/campaigns' && method === 'post') {
    const user = requireUser(db, config, ['creator', 'admin']);
    const input = body() as unknown as CampaignInput;
    validateCampaignInput(input, config);
    if (!categoryOf(db, Number(input.categoryId))) {
      fail(400, 'Choose a valid category.', { categoryId: 'Choose a valid category.' }, config);
    }
    const campaignId = nextId('campaign');
    const campaign: MockCampaign = {
      campaignId,
      title: input.title.trim(),
      description: input.description.trim(),
      goalAmount: Number(input.goalAmount),
      durationDays: Number(input.durationDays),
      country: input.country,
      categoryId: Number(input.categoryId),
      status: input.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
      creatorId: user.userId,
      createdAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + Number(input.durationDays) * 86400000).toISOString(),
      pledgedAmount: 0,
      backerCount: 0,
      rewards: input.rewards.map((reward) => ({
        rewardId: nextId('reward'),
        minPledge: Number(reward.minPledge),
        description: reward.description.trim(),
        title: reward.title?.trim() || undefined,
        quantity: reward.quantity,
      })),
    };
    db.campaigns.push(campaign);
    persistDb();
    return respond(toCampaign(db, campaign), 201);
  }

  const campaignMatch = /^\/campaigns\/(\d+)$/.exec(path);
  if (campaignMatch) {
    const campaignId = Number(campaignMatch[1]);
    const campaign = db.campaigns.find((item) => item.campaignId === campaignId);
    if (!campaign) fail(404, 'Campaign not found.', undefined, config);

    if (method === 'get') {
      if (campaign.status === 'DRAFT') {
        const user = tokenUser(db, config);
        if (!user || (user.role !== 'admin' && campaign.creatorId !== user.userId)) {
          fail(404, 'Campaign not found.', undefined, config);
        }
      }
      return respond(toCampaign(db, campaign));
    }

    if (method === 'put' || method === 'patch') {
      const user = requireUser(db, config, ['creator', 'admin']);
      if (user.role !== 'admin' && campaign.creatorId !== user.userId) {
        fail(403, 'You can only edit your own campaigns.', undefined, config);
      }
      const input = body() as unknown as Partial<CampaignInput>;
      const merged: CampaignInput = {
        title: input.title ?? campaign.title,
        description: input.description ?? campaign.description,
        goalAmount: input.goalAmount ?? campaign.goalAmount,
        durationDays: input.durationDays ?? campaign.durationDays,
        country: input.country ?? campaign.country,
        categoryId: input.categoryId ?? campaign.categoryId,
        status: input.status ?? campaign.status,
        rewards:
          input.rewards ??
          campaign.rewards.map((reward) => ({
            rewardId: reward.rewardId,
            minPledge: reward.minPledge,
            description: reward.description,
            title: reward.title,
            quantity: reward.quantity,
          })),
      };
      validateCampaignInput(merged, config);
      const rewardList: Reward[] = merged.rewards.map((reward) => ({
        rewardId: reward.rewardId ?? nextId('reward'),
        minPledge: Number(reward.minPledge),
        description: reward.description.trim(),
        title: reward.title?.trim() || undefined,
        quantity: reward.quantity,
      }));
      campaign.title = merged.title.trim();
      campaign.description = merged.description.trim();
      campaign.goalAmount = Number(merged.goalAmount);
      campaign.durationDays = Number(merged.durationDays);
      campaign.country = merged.country;
      campaign.categoryId = Number(merged.categoryId);
      campaign.status = merged.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT';
      campaign.rewards = rewardList;
      campaign.updatedAt = new Date().toISOString();
      persistDb();
      return respond(toCampaign(db, campaign));
    }

    if (method === 'delete') {
      const user = requireUser(db, config, ['creator', 'admin']);
      if (user.role !== 'admin' && campaign.creatorId !== user.userId) {
        fail(403, 'You can only delete your own campaigns.', undefined, config);
      }
      db.campaigns = db.campaigns.filter((item) => item.campaignId !== campaignId);
      db.predictions = db.predictions.filter((item) => item.campaignId !== campaignId);
      persistDb();
      return respond({ success: true });
    }
  }

  const pledgeMatch = /^\/campaigns\/(\d+)\/pledges$/.exec(path);
  if (pledgeMatch && method === 'post') {
    const user = requireUser(db, config);
    const campaign = db.campaigns.find((item) => item.campaignId === Number(pledgeMatch[1]));
    if (!campaign) fail(404, 'Campaign not found.', undefined, config);
    if (campaign.status !== 'SUBMITTED') fail(400, 'This campaign is not accepting pledges yet.', undefined, config);
    const input = body() as unknown as CreatePledgeInput;
    const amount = Number(input.amount);
    const rewardId = input.rewardId ? Number(input.rewardId) : null;
    const errors: Record<string, string> = {};
    if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter a pledge amount.';
    const reward = rewardId ? campaign.rewards.find((item) => item.rewardId === rewardId) : undefined;
    if (rewardId && !reward) errors.rewardId = 'That reward is no longer available.';
    if (reward && amount < reward.minPledge) {
      errors.amount = `This reward requires at least $${reward.minPledge}.`;
    }
    if (Object.keys(errors).length > 0) fail(400, 'Please check the highlighted fields.', errors, config);

    const pledge: MockDatabase['pledges'][number] = {
      pledgeId: nextId('pledge'),
      userId: user.userId,
      campaignId: campaign.campaignId,
      rewardId: rewardId ?? null,
      amount,
      date: new Date().toISOString(),
    };
    db.pledges.push(pledge);
    campaign.pledgedAmount = (campaign.pledgedAmount ?? 0) + amount;
    campaign.backerCount = (campaign.backerCount ?? 0) + 1;
    persistDb();
    return respond(toPledge(db, pledge), 201);
  }

  if (path === '/pledges/mine' && method === 'get') {
    const user = requireUser(db, config);
    const items = db.pledges
      .filter((pledge) => pledge.userId === user.userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((pledge) => toPledge(db, pledge));
    return respond(items);
  }

  if (path === '/predictions' && method === 'post') {
    const user = requireUser(db, config, ['creator', 'admin']);
    const input = body() as { campaignId?: number };
    const campaign = db.campaigns.find((item) => item.campaignId === Number(input.campaignId));
    if (!campaign) fail(404, 'Campaign not found.', undefined, config);
    if (user.role !== 'admin' && campaign.creatorId !== user.userId) {
      fail(403, 'You can only evaluate your own campaigns.', undefined, config);
    }
    const activeModel = db.models.find((model) => model.isActive);
    const { probability, topFactors } = calculatePrediction(campaign);
    const prediction: Prediction = {
      predictionId: nextId('prediction'),
      campaignId: campaign.campaignId,
      probability,
      label: probability >= 0.5 ? 'Likely Success' : 'Likely Fail',
      topFactors,
      createdAt: new Date().toISOString(),
      modelVersion: activeModel?.name ?? activeModel?.version ?? 'RandomForest v3',
      modelAlgorithm: activeModel?.algorithm ?? 'RandomForest',
      modelVersionId: activeModel?.versionId,
    };
    campaign.status = 'SUBMITTED';
    db.predictions.push(prediction);
    persistDb();
    return respond(toPrediction(db, prediction), 201);
  }

  if (path === '/predictions' && method === 'get') {
    const user = requireUser(db, config, ['creator', 'admin']);
    let list = [...db.predictions];
    if (user.role !== 'admin') {
      const ownCampaigns = new Set(
        db.campaigns.filter((campaign) => campaign.creatorId === user.userId).map((campaign) => campaign.campaignId),
      );
      list = list.filter((prediction) => prediction.campaignId !== undefined && ownCampaigns.has(prediction.campaignId));
    }
    const campaignId = params.get('campaignId');
    if (campaignId) list = list.filter((prediction) => prediction.campaignId === Number(campaignId));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return respond(
      paginate(
        list.map((prediction) => toPrediction(db, prediction)),
        Number(params.get('page') ?? 1),
        Number(params.get('pageSize') ?? 10),
      ),
    );
  }

  const predictionMatch = /^\/predictions\/(\d+)$/.exec(path);
  if (predictionMatch && method === 'get') {
    const user = requireUser(db, config, ['creator', 'admin']);
    const prediction = db.predictions.find((item) => item.predictionId === Number(predictionMatch[1]));
    if (!prediction) fail(404, 'Prediction not found.', undefined, config);
    const campaign = db.campaigns.find((item) => item.campaignId === prediction.campaignId);
    if (user.role !== 'admin' && campaign?.creatorId !== user.userId) {
      fail(403, 'You do not have access to this prediction.', undefined, config);
    }
    return respond(toPrediction(db, prediction));
  }

  if (path === '/admin/stats' && method === 'get') {
    requireUser(db, config, ['admin']);
    const activeModel = db.models.find((model) => model.isActive);
    const averageProbability =
      db.predictions.length > 0
        ? db.predictions.reduce((sum, prediction) => sum + prediction.probability, 0) / db.predictions.length
        : 0;
    const stats: AdminStats = {
      users: {
        total: db.users.length,
        backers: db.users.filter((user) => user.role === 'backer').length,
        creators: db.users.filter((user) => user.role === 'creator').length,
        admins: db.users.filter((user) => user.role === 'admin').length,
        active: db.users.filter((user) => user.isActive).length,
      },
      campaigns: {
        total: db.campaigns.length,
        evaluated: new Set(db.predictions.map((prediction) => prediction.campaignId)).size,
        active: db.campaigns.filter((campaign) => campaign.status === 'SUBMITTED').length,
        drafts: db.campaigns.filter((campaign) => campaign.status === 'DRAFT').length,
      },
      predictions: {
        total: db.predictions.length,
        averageProbability,
        successCount: db.predictions.filter((prediction) => prediction.probability >= 0.5).length,
      },
      models: {
        total: db.models.length,
        activeVersion: activeModel?.name ?? activeModel?.version,
        activeAlgorithm: activeModel?.algorithm,
        accuracy: activeModel?.accuracy ?? 0,
        f1Score: activeModel?.f1Score ?? 0,
      },
      datasets: {
        total: db.datasets.length,
        rows: db.datasets.reduce((sum, dataset) => sum + dataset.rowCount, 0),
      },
    };
    return respond(stats);
  }

  if (path === '/admin/datasets' && method === 'get') {
    requireUser(db, config, ['admin']);
    return respond(
      [...db.datasets].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    );
  }

  if (path === '/admin/datasets' && method === 'post') {
    const user = requireUser(db, config, ['admin']);
    if (!(config.data instanceof FormData)) {
      fail(400, 'Upload a CSV dataset.', undefined, config);
    }
    const file = config.data.get('file');
    if (!(file instanceof File)) {
      fail(400, 'Upload a CSV dataset.', { file: 'Choose a CSV file to upload.' }, config);
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      fail(400, 'Only CSV files are supported.', { file: 'Only CSV files are supported.' }, config);
    }
    if (file.size > 50 * 1024 * 1024) {
      fail(400, 'Datasets must be 50 MB or smaller.', { file: 'Datasets must be 50 MB or smaller.' }, config);
    }
    await wait(900);
    const dataset = {
      datasetId: nextId('dataset'),
      fileName: file.name,
      rowCount: 12000 + (file.size % 88000),
      features: 18,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.name,
      status: 'validated' as const,
    };
    db.datasets.push(dataset);
    persistDb();
    return respond(dataset, 201);
  }

  const datasetMatch = /^\/admin\/datasets\/(\d+)$/.exec(path);
  if (datasetMatch && method === 'delete') {
    requireUser(db, config, ['admin']);
    const datasetId = Number(datasetMatch[1]);
    if (db.models.some((model) => model.datasetId === datasetId)) {
      fail(400, 'This dataset is used by a trained model and cannot be removed.', undefined, config);
    }
    db.datasets = db.datasets.filter((dataset) => dataset.datasetId !== datasetId);
    persistDb();
    return respond({ success: true });
  }

  if (path === '/admin/models' && method === 'get') {
    requireUser(db, config, ['admin']);
    return respond(
      [...db.models].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    );
  }

  if (path === '/admin/models/train' && method === 'post') {
    requireUser(db, config, ['admin']);
    const input = body() as unknown as TrainModelInput;
    const algorithm = input.algorithm;
    if (!algorithm || !(algorithm in ALGORITHM_HYPERPARAMETERS)) {
      fail(400, 'Choose a supported algorithm.', { algorithm: 'Choose a supported algorithm.' }, config);
    }
    const dataset = db.datasets.find((item) => item.datasetId === Number(input.datasetId));
    if (!dataset) {
      fail(400, 'Choose a dataset to train on.', { datasetId: 'Choose a dataset.' }, config);
    }
    const hyperparameters = { ...input.hyperparameters };
    for (const field of ALGORITHM_HYPERPARAMETERS[algorithm]) {
      const value = Number(hyperparameters[field.name]);
      if (!Number.isFinite(value) || value < field.min || value > field.max) {
        fail(
          400,
          'Check the hyperparameter ranges.',
          { [`hyperparameters.${field.name}`]: `${field.label} must be between ${field.min} and ${field.max}.` },
          config,
        );
      }
      hyperparameters[field.name] = value;
    }
    await wait(1400);
    const algorithmCount = db.models.filter((model) => model.algorithm === algorithm).length;
    let accuracy = 0.78;
    if (algorithm === 'RandomForest') {
      accuracy = 0.83 + Number(hyperparameters.n_estimators) / 4000 + Number(hyperparameters.max_depth) / 900;
    } else if (algorithm === 'XGBoost') {
      accuracy = 0.82 + Number(hyperparameters.learning_rate) * 0.08 + Number(hyperparameters.n_estimators) / 9000;
    } else {
      accuracy = 0.76 + Math.min(0.05, Number(hyperparameters.C) / 120);
    }
    accuracy = Number(clamp(accuracy + Math.min(0.02, dataset.rowCount / 50000000), 0.7, 0.95).toFixed(3));
    const model: ModelVersion = {
      versionId: nextId('model'),
      algorithm,
      name: `${ALGORITHM_LABELS[algorithm]} v${algorithmCount + 1}`,
      version: `v${algorithmCount + 1}`,
      accuracy,
      f1Score: Number((accuracy - 0.02).toFixed(3)),
      precision: Number((accuracy + 0.004).toFixed(3)),
      recall: Number((accuracy - 0.01).toFixed(3)),
      rocAuc: Number(Math.min(0.99, accuracy + 0.045).toFixed(3)),
      datasetId: dataset.datasetId,
      datasetName: dataset.fileName,
      isActive: false,
      createdAt: new Date().toISOString(),
      trainingStatus: 'ready',
      hyperparameters,
    };
    db.models.push(model);
    persistDb();
    return respond(model, 201);
  }

  const modelMetricsMatch = /^\/admin\/models\/(\d+)\/metrics$/.exec(path);
  if (modelMetricsMatch && method === 'get') {
    requireUser(db, config, ['admin']);
    const model = db.models.find((item) => item.versionId === Number(modelMetricsMatch[1]));
    if (!model) fail(404, 'Model not found.', undefined, config);
    return respond(metricsFor(model));
  }

  const modelActivateMatch = /^\/admin\/models\/(\d+)\/activate$/.exec(path);
  if (modelActivateMatch && (method === 'patch' || method === 'post')) {
    requireUser(db, config, ['admin']);
    const model = db.models.find((item) => item.versionId === Number(modelActivateMatch[1]));
    if (!model) fail(404, 'Model not found.', undefined, config);
    db.models.forEach((item) => {
      item.isActive = item.versionId === model.versionId;
    });
    persistDb();
    return respond(model);
  }

  if (path === '/admin/users' && method === 'get') {
    requireUser(db, config, ['admin']);
    const search = (params.get('search') ?? '').trim().toLowerCase();
    const items = db.users
      .filter((user) => {
        if (!search) return true;
        return `${user.name} ${user.email} ${user.organization ?? ''} ${user.role}`.toLowerCase().includes(search);
      })
      .map((user) => {
        const totalPledged = db.pledges
          .filter((pledge) => pledge.userId === user.userId)
          .reduce((sum, pledge) => sum + pledge.amount, 0);
        return { ...publicUser(user), totalPledged };
      })
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    return respond(items);
  }

  const userRoleMatch = /^\/admin\/users\/(\d+)\/role$/.exec(path);
  if (userRoleMatch && (method === 'patch' || method === 'put')) {
    requireUser(db, config, ['admin']);
    const target = db.users.find((user) => user.userId === Number(userRoleMatch[1]));
    if (!target) fail(404, 'User not found.', undefined, config);
    const input = body() as { role?: User['role'] };
    if (!input.role || !['backer', 'creator', 'admin'].includes(input.role)) {
      fail(400, 'Choose a valid role.', { role: 'Choose a valid role.' }, config);
    }
    if (
      target.role === 'admin' &&
      input.role !== 'admin' &&
      db.users.filter((user) => user.role === 'admin' && user.isActive).length <= 1
    ) {
      fail(400, 'At least one active administrator is required.', undefined, config);
    }
    target.role = input.role;
    persistDb();
    return respond(publicUser(target));
  }

  const userStatusMatch = /^\/admin\/users\/(\d+)\/status$/.exec(path);
  if (userStatusMatch && (method === 'patch' || method === 'put')) {
    const admin = requireUser(db, config, ['admin']);
    const target = db.users.find((user) => user.userId === Number(userStatusMatch[1]));
    if (!target) fail(404, 'User not found.', undefined, config);
    const input = body() as { isActive?: boolean };
    if (typeof input.isActive !== 'boolean') {
      fail(400, 'Choose a valid account status.', { isActive: 'Choose a valid account status.' }, config);
    }
    if (target.userId === admin.userId && input.isActive === false) {
      fail(400, 'You cannot deactivate your own account.', undefined, config);
    }
    target.isActive = input.isActive;
    persistDb();
    return respond(publicUser(target));
  }

  return fail(404, `No mock handler for ${method.toUpperCase()} ${path}`, undefined, config);
};
