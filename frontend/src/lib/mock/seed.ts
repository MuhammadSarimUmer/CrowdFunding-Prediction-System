import type {
  Campaign,
  Category,
  Dataset,
  ModelVersion,
  Pledge,
  Prediction,
  Reward,
  User,
} from '@/types';

export interface MockUser extends User {
  password: string;
}

export interface MockCampaign extends Campaign {
  creatorId: number;
  rewards: Reward[];
}

export interface MockPledge extends Pledge {
  userId: number;
}

export interface MockDatabase {
  version: number;
  users: MockUser[];
  categories: Category[];
  campaigns: MockCampaign[];
  pledges: MockPledge[];
  predictions: Prediction[];
  datasets: Dataset[];
  models: ModelVersion[];
  counters: {
    user: number;
    campaign: number;
    reward: number;
    pledge: number;
    prediction: number;
    dataset: number;
    model: number;
  };
}

export const DB_VERSION = 3;

const now = Date.now();
const day = 86400000;

function daysAgo(days: number): string {
  return new Date(now - days * day).toISOString();
}

function endsIn(createdDaysAgo: number, durationDays: number): string {
  return new Date(now + (durationDays - createdDaysAgo) * day).toISOString();
}

function rewards(_campaignId: number, tiers: Array<[number, number, string, string]>): Reward[] {
  return tiers.map(([rewardId, minPledge, title, description]) => ({
    rewardId,
    minPledge,
    title,
    description,
    quantity: 100,
  }));
}

export function createSeedDatabase(): MockDatabase {
  const users: MockUser[] = [
    {
      userId: 1,
      name: 'Marcus Chen',
      email: 'admin@crowdpredict.app',
      password: 'admin123',
      role: 'admin',
      organization: 'CrowdPredict',
      isActive: true,
      createdAt: daysAgo(400),
      adminLevel: 2,
    },
    {
      userId: 2,
      name: 'Ayesha Khan',
      email: 'ayesha@ecobottle.io',
      password: 'creator123',
      role: 'creator',
      organization: 'EcoTech Labs',
      isActive: true,
      createdAt: daysAgo(320),
    },
    {
      userId: 3,
      name: 'Tariq Mahmood',
      email: 'tariq@solarpack.io',
      password: 'creator123',
      role: 'creator',
      organization: 'Apex Gear',
      isActive: true,
      createdAt: daysAgo(280),
    },
    {
      userId: 4,
      name: 'Elena Rostova',
      email: 'elena@verdehydro.co',
      password: 'creator123',
      role: 'creator',
      organization: 'EcoLabs',
      isActive: true,
      createdAt: daysAgo(240),
    },
    {
      userId: 5,
      name: 'Sara Ahmed',
      email: 'backer@crowdpredict.app',
      password: 'backer123',
      role: 'backer',
      isActive: true,
      createdAt: daysAgo(180),
    },
    {
      userId: 6,
      name: 'Omar Farooq',
      email: 'omar@example.com',
      password: 'backer123',
      role: 'backer',
      isActive: true,
      createdAt: daysAgo(150),
    },
    {
      userId: 7,
      name: 'Hana Ali',
      email: 'hana@example.com',
      password: 'backer123',
      role: 'backer',
      isActive: true,
      createdAt: daysAgo(120),
    },
    {
      userId: 8,
      name: 'Marcus Vance',
      email: 'marcus@crowdpredict.app',
      password: 'admin123',
      role: 'admin',
      organization: 'CrowdPredict',
      isActive: true,
      createdAt: daysAgo(300),
      adminLevel: 1,
    },
    {
      userId: 9,
      name: 'Layla Hassan',
      email: 'layla@example.com',
      password: 'backer123',
      role: 'backer',
      isActive: false,
      createdAt: daysAgo(90),
    },
    {
      userId: 10,
      name: 'Zainab Iqbal',
      email: 'zainab@example.com',
      password: 'creator123',
      role: 'creator',
      organization: 'Studio Wood',
      isActive: true,
      createdAt: daysAgo(70),
    },
  ];

  const categories: Category[] = [
    { categoryId: 1, name: 'Technology' },
    { categoryId: 2, name: 'Design' },
    { categoryId: 3, name: 'Environment' },
    { categoryId: 4, name: 'Health' },
    { categoryId: 5, name: 'Food' },
    { categoryId: 6, name: 'Education' },
    { categoryId: 7, name: 'Games' },
  ];

  const campaigns: MockCampaign[] = [
    {
      campaignId: 5001,
      title: 'EcoBottle Smart Cap',
      description:
        'A self-purifying smart cap that turns any reusable bottle into safe drinking water. The cap combines UV-C purification, hydration tracking, and a 30-day battery in a package that fits in your palm. Our team has shipped two hardware products before and this campaign funds the first production run plus independent lab certification.',
      goalAmount: 15000,
      durationDays: 30,
      country: 'PK',
      categoryId: 1,
      status: 'SUBMITTED',
      creatorId: 2,
      createdAt: daysAgo(12),
      endsAt: endsIn(12, 30),
      pledgedAmount: 11700,
      backerCount: 342,
      rewards: rewards(5001, [
        [12, 25, 'Early-bird cap', '1x EcoBottle Smart Cap with UV-C purification and hydration tracking.'],
        [13, 45, 'Duo pack', '2x Smart Caps plus custom laser engraving and priority shipping.'],
        [14, 100, 'Founder backer edition', '2x titanium caps, lifetime analytics, and a factory video call.'],
      ]),
    },
    {
      campaignId: 5002,
      title: 'SolarPack Nomad',
      description:
        'A weatherproof solar backpack built for remote work and off-grid travel. Integrated 20,000mAh bank, pass-through charging, and a roll-top dry compartment. We are funding tooling for the second-generation fabric and a certified safety test batch.',
      goalAmount: 25000,
      durationDays: 30,
      country: 'US',
      categoryId: 2,
      status: 'SUBMITTED',
      creatorId: 3,
      createdAt: daysAgo(8),
      endsAt: endsIn(8, 30),
      pledgedAmount: 23000,
      backerCount: 514,
      rewards: rewards(5002, [
        [21, 45, 'Explorer pack', 'Solar backpack with 20,000mAh solar bank and USB-C fast charge.'],
        [22, 95, 'Nomad bundle', 'Backpack, solar bank, and modular packing cubes.'],
        [23, 180, 'Expedition kit', 'Full travel system with rain shell and repair kit.'],
      ]),
    },
    {
      campaignId: 5003,
      title: 'AeroPurifier Pocket HEPA',
      description:
        'A pocket-sized HEPA purifier for shared workspaces and hotel rooms. It filters a 25m³ room in 18 minutes while running quieter than a library. Funds cover injection molds, filter certification, and the first 2,000 units.',
      goalAmount: 8000,
      durationDays: 45,
      country: 'PK',
      categoryId: 3,
      status: 'SUBMITTED',
      creatorId: 4,
      createdAt: daysAgo(18),
      endsAt: endsIn(18, 45),
      pledgedAmount: 3600,
      backerCount: 118,
      rewards: rewards(5003, [
        [31, 35, 'Pocket purifier', 'One AeroPurifier with USB-C cable and travel pouch.'],
        [32, 65, 'Clean air duo', 'Two purifiers for home and office.'],
      ]),
    },
    {
      campaignId: 5004,
      title: 'SoundWave Bio-Acoustic Sleep Mask',
      description:
        'A sleep mask that uses bone conduction and adaptive soundscapes to help shift workers fall asleep faster. Early testing showed a 22% reduction in sleep latency. We are raising funds for a larger clinical pilot and a production-ready electronics build.',
      goalAmount: 40000,
      durationDays: 15,
      country: 'GB',
      categoryId: 4,
      status: 'SUBMITTED',
      creatorId: 10,
      createdAt: daysAgo(6),
      endsAt: endsIn(6, 15),
      pledgedAmount: 7200,
      backerCount: 64,
      rewards: rewards(5004, [
        [41, 90, 'SoundWave mask', 'One bio-acoustic sleep mask with six soundscapes.'],
        [42, 160, 'Duo sleep set', 'Two masks plus a travel case and shared app plan.'],
      ]),
    },
    {
      campaignId: 5005,
      title: 'ModuDesk Modular Ergonomic Desk',
      description:
        'A solid oak standing desk that assembles in four minutes with no tools. The modular rail system supports monitors, lights, and charging without drilling. This campaign funds the first CNC production run and a 10-year warranty reserve.',
      goalAmount: 50000,
      durationDays: 30,
      country: 'CA',
      categoryId: 2,
      status: 'SUBMITTED',
      creatorId: 10,
      createdAt: daysAgo(20),
      endsAt: endsIn(20, 30),
      pledgedAmount: 52500,
      backerCount: 689,
      rewards: rewards(5005, [
        [51, 80, 'Accessory mount kit', 'Rail-mounted monitor arm and cable tray.'],
        [52, 450, 'ModuDesk core', 'Solid oak desk with dual motor lift and rail system.'],
        [53, 900, 'Studio bundle', 'Desk, monitor arm, light bar, and cable management.'],
      ]),
    },
    {
      campaignId: 5006,
      title: 'VerdeHydro Home Aquaponics',
      description:
        'A countertop aquaponics system that grows herbs and leafy greens with 90% less water than soil. The closed-loop tank is designed for apartments and comes with a starter seed kit. Funds cover food-safe tooling and a 500-home beta program.',
      goalAmount: 12000,
      durationDays: 30,
      country: 'DE',
      categoryId: 3,
      status: 'SUBMITTED',
      creatorId: 4,
      createdAt: daysAgo(10),
      endsAt: endsIn(10, 30),
      pledgedAmount: 9720,
      backerCount: 285,
      rewards: rewards(5006, [
        [61, 120, 'Starter greenhouse', 'One aquaponics unit, seed kit, and water test strips.'],
        [62, 240, 'Family garden', 'Two units plus an expanded seed and nutrient kit.'],
      ]),
    },
    {
      campaignId: 5007,
      title: 'Hearth & Grain Sourdough Kit',
      description:
        'A beginner-friendly sourdough kit with a temperature-controlled proofing box, heritage starter, and a guided 21-day course. We are funding a small-batch production run and a new bakery partnership in Lahore.',
      goalAmount: 9000,
      durationDays: 21,
      country: 'US',
      categoryId: 5,
      status: 'SUBMITTED',
      creatorId: 2,
      createdAt: daysAgo(5),
      endsAt: endsIn(5, 21),
      pledgedAmount: 5400,
      backerCount: 190,
      rewards: rewards(5007, [
        [71, 25, 'Starter loaf kit', 'Proofing box, heritage starter, and digital course.'],
        [72, 60, "Baker's bundle", 'Two kits plus a cast-iron loaf pan.'],
      ]),
    },
    {
      campaignId: 5008,
      title: 'NeuroNotes Focus Journal',
      description:
        'A 90-day journal built around cognitive-load research, with weekly focus experiments and a companion app for gentle accountability. This campaign funds the first print run on recycled paper and a free classroom pilot.',
      goalAmount: 6000,
      durationDays: 25,
      country: 'GB',
      categoryId: 6,
      status: 'SUBMITTED',
      creatorId: 2,
      createdAt: daysAgo(9),
      endsAt: endsIn(9, 25),
      pledgedAmount: 4200,
      backerCount: 160,
      rewards: rewards(5008, [
        [81, 22, 'Focus journal', 'One 90-day NeuroNotes journal and app access.'],
        [82, 40, 'Team pack', 'Three journals for a study group or team.'],
      ]),
    },
    {
      campaignId: 5009,
      title: 'Lumen Arcade Controller',
      description:
        'A low-latency arcade controller with hot-swappable switches and per-key RGB, designed for fighting games and retro platforms. Funds cover the aluminum case tooling and a first run of 1,500 units.',
      goalAmount: 30000,
      durationDays: 35,
      country: 'CA',
      categoryId: 7,
      status: 'SUBMITTED',
      creatorId: 3,
      createdAt: daysAgo(14),
      endsAt: endsIn(14, 35),
      pledgedAmount: 12000,
      backerCount: 240,
      rewards: rewards(5009, [
        [91, 60, 'Lumen controller', 'One arcade controller with hot-swap switches.'],
        [92, 110, 'Arcade duo', 'Two controllers and a braided USB-C cable set.'],
      ]),
    },
    {
      campaignId: 5010,
      title: 'TerraTiles Recycled Desk Mat',
      description:
        'A desk mat made from 100% recycled ocean-bound plastic, with a modular tile system for cable routing and pen storage. We are raising funds for a new press and a closed-loop take-back program.',
      goalAmount: 5000,
      durationDays: 14,
      country: 'PK',
      categoryId: 3,
      status: 'SUBMITTED',
      creatorId: 4,
      createdAt: daysAgo(4),
      endsAt: endsIn(4, 14),
      pledgedAmount: 900,
      backerCount: 40,
      rewards: rewards(5010, [
        [101, 30, 'TerraTiles mat', 'One recycled desk mat with two modular tiles.'],
        [102, 55, 'Studio pack', 'Mat, cable tiles, and pen dock.'],
      ]),
    },
    {
      campaignId: 5011,
      title: 'EcoBottle Smart Cap v2',
      description:
        'The second-generation smart cap with a replaceable filter cartridge and a solar charging ring. Currently in draft while we finalize the bill of materials and lab partners.',
      goalAmount: 20000,
      durationDays: 30,
      country: 'PK',
      categoryId: 1,
      status: 'DRAFT',
      creatorId: 2,
      createdAt: daysAgo(2),
      endsAt: endsIn(2, 30),
      pledgedAmount: 0,
      backerCount: 0,
      rewards: rewards(5011, [
        [111, 30, 'Early-bird cap v2', '1x EcoBottle Smart Cap v2 with solar ring.'],
      ]),
    },
    {
      campaignId: 5012,
      title: 'SolarPack Mini',
      description:
        'A compact 10L solar sling for city commutes. Draft campaign pending final fabric samples.',
      goalAmount: 15000,
      durationDays: 21,
      country: 'US',
      categoryId: 2,
      status: 'DRAFT',
      creatorId: 3,
      createdAt: daysAgo(1),
      endsAt: endsIn(1, 21),
      pledgedAmount: 0,
      backerCount: 0,
      rewards: rewards(5012, [
        [121, 40, 'SolarPack Mini', 'One compact solar sling with 10,000mAh bank.'],
      ]),
    },
  ];

  const predictions: Prediction[] = [
    {
      predictionId: 9001,
      campaignId: 5001,
      probability: 0.78,
      label: 'Likely Success',
      topFactors: {
        goalAmount: 0.28,
        durationDays: 0.21,
        goalPerDay: 0.16,
        rewardCount: 0.09,
        descriptionLength: 0.04,
      },
      createdAt: daysAgo(11),
      modelVersion: 'RandomForest v3',
      modelAlgorithm: 'RandomForest',
      modelVersionId: 3,
    },
    {
      predictionId: 9002,
      campaignId: 5002,
      probability: 0.88,
      label: 'Likely Success',
      topFactors: {
        goalAmount: 0.24,
        backerVelocity: 0.22,
        durationDays: 0.18,
        rewardCount: 0.11,
        descriptionLength: 0.06,
      },
      createdAt: daysAgo(7),
      modelVersion: 'RandomForest v3',
      modelAlgorithm: 'RandomForest',
      modelVersionId: 3,
    },
    {
      predictionId: 9003,
      campaignId: 5003,
      probability: 0.64,
      label: 'Likely Success',
      topFactors: {
        goalPerDay: 0.18,
        goalAmount: 0.14,
        durationDays: 0.12,
        rewardCount: 0.07,
        descriptionLength: 0.03,
      },
      createdAt: daysAgo(17),
      modelVersion: 'RandomForest v3',
      modelAlgorithm: 'RandomForest',
      modelVersionId: 3,
    },
    {
      predictionId: 9004,
      campaignId: 5004,
      probability: 0.42,
      label: 'Likely Fail',
      topFactors: {
        goalAmount: -0.16,
        goalPerDay: -0.14,
        durationDays: -0.08,
        rewardCount: -0.04,
        descriptionLength: 0.05,
      },
      createdAt: daysAgo(5),
      modelVersion: 'RandomForest v3',
      modelAlgorithm: 'RandomForest',
      modelVersionId: 3,
    },
    {
      predictionId: 9005,
      campaignId: 5005,
      probability: 0.95,
      label: 'Likely Success',
      topFactors: {
        backerVelocity: 0.3,
        goalPerDay: 0.22,
        goalAmount: 0.18,
        rewardCount: 0.12,
        descriptionLength: 0.08,
      },
      createdAt: daysAgo(19),
      modelVersion: 'RandomForest v3',
      modelAlgorithm: 'RandomForest',
      modelVersionId: 3,
    },
    {
      predictionId: 9006,
      campaignId: 5006,
      probability: 0.82,
      label: 'Likely Success',
      topFactors: {
        goalAmount: 0.26,
        durationDays: 0.2,
        goalPerDay: 0.15,
        rewardCount: 0.08,
        descriptionLength: 0.05,
      },
      createdAt: daysAgo(9),
      modelVersion: 'RandomForest v3',
      modelAlgorithm: 'RandomForest',
      modelVersionId: 3,
    },
    {
      predictionId: 9007,
      campaignId: 5007,
      probability: 0.71,
      label: 'Likely Success',
      topFactors: {
        goalPerDay: 0.2,
        goalAmount: 0.17,
        durationDays: 0.13,
        rewardCount: 0.08,
        descriptionLength: 0.04,
      },
      createdAt: daysAgo(4),
      modelVersion: 'RandomForest v3',
      modelAlgorithm: 'RandomForest',
      modelVersionId: 3,
    },
    {
      predictionId: 9008,
      campaignId: 5008,
      probability: 0.76,
      label: 'Likely Success',
      topFactors: {
        goalAmount: 0.23,
        durationDays: 0.18,
        goalPerDay: 0.14,
        rewardCount: 0.09,
        descriptionLength: 0.06,
      },
      createdAt: daysAgo(8),
      modelVersion: 'RandomForest v3',
      modelAlgorithm: 'RandomForest',
      modelVersionId: 3,
    },
    {
      predictionId: 9009,
      campaignId: 5009,
      probability: 0.58,
      label: 'Likely Success',
      topFactors: {
        goalPerDay: 0.16,
        goalAmount: 0.12,
        backerVelocity: 0.08,
        rewardCount: 0.05,
        durationDays: 0.03,
      },
      createdAt: daysAgo(13),
      modelVersion: 'RandomForest v3',
      modelAlgorithm: 'RandomForest',
      modelVersionId: 3,
    },
    {
      predictionId: 9010,
      campaignId: 5010,
      probability: 0.36,
      label: 'Likely Fail',
      topFactors: {
        goalPerDay: -0.18,
        backerVelocity: -0.14,
        goalAmount: -0.08,
        rewardCount: -0.05,
        durationDays: 0.02,
      },
      createdAt: daysAgo(3),
      modelVersion: 'RandomForest v3',
      modelAlgorithm: 'RandomForest',
      modelVersionId: 3,
    },
  ];

  const pledges: MockPledge[] = [
    {
      pledgeId: 1,
      userId: 5,
      campaignId: 5001,
      rewardId: 12,
      amount: 25,
      date: daysAgo(10),
    },
    {
      pledgeId: 2,
      userId: 5,
      campaignId: 5002,
      rewardId: 22,
      amount: 145,
      date: daysAgo(7),
    },
    {
      pledgeId: 3,
      userId: 5,
      campaignId: 5006,
      rewardId: 61,
      amount: 120,
      date: daysAgo(4),
    },
    {
      pledgeId: 4,
      userId: 5,
      campaignId: 5005,
      rewardId: 51,
      amount: 80,
      date: daysAgo(2),
    },
    {
      pledgeId: 5,
      userId: 6,
      campaignId: 5001,
      rewardId: 13,
      amount: 45,
      date: daysAgo(8),
    },
    {
      pledgeId: 6,
      userId: 7,
      campaignId: 5005,
      rewardId: 53,
      amount: 900,
      date: daysAgo(5),
    },
    {
      pledgeId: 7,
      userId: 8,
      campaignId: 5002,
      rewardId: 22,
      amount: 95,
      date: daysAgo(3),
    },
    {
      pledgeId: 8,
      userId: 9,
      campaignId: 5007,
      rewardId: 72,
      amount: 60,
      date: daysAgo(1),
    },
  ];

  const datasets: Dataset[] = [
    {
      datasetId: 1,
      fileName: 'crowdfunding_global_2024_master.csv',
      rowCount: 420000,
      features: 18,
      uploadedAt: daysAgo(30),
      uploadedBy: 'Marcus Chen',
      status: 'validated',
    },
    {
      datasetId: 2,
      fileName: 'hardware_cleantech_pakistan_subsample.csv',
      rowCount: 18400,
      features: 18,
      uploadedAt: daysAgo(22),
      uploadedBy: 'Marcus Chen',
      status: 'validated',
    },
    {
      datasetId: 3,
      fileName: 'kickstarter_tech_us_uk_2021_2024.csv',
      rowCount: 280000,
      features: 21,
      uploadedAt: daysAgo(65),
      uploadedBy: 'Marcus Vance',
      status: 'validated',
    },
    {
      datasetId: 4,
      fileName: 'indiegogo_failed_campaigns_audit.csv',
      rowCount: 62500,
      features: 16,
      uploadedAt: daysAgo(88),
      uploadedBy: 'Marcus Vance',
      status: 'archived',
    },
  ];

  const models: ModelVersion[] = [
    {
      versionId: 1,
      algorithm: 'LogisticRegression',
      name: 'LogisticRegression v1',
      version: 'v1',
      accuracy: 0.768,
      f1Score: 0.74,
      precision: 0.751,
      recall: 0.729,
      rocAuc: 0.814,
      datasetId: 1,
      datasetName: 'crowdfunding_global_2024_master.csv',
      isActive: false,
      createdAt: daysAgo(100),
      trainingStatus: 'ready',
      hyperparameters: { C: 1, max_iter: 1000 },
    },
    {
      versionId: 2,
      algorithm: 'RandomForest',
      name: 'RandomForest v2',
      version: 'v2',
      accuracy: 0.841,
      f1Score: 0.82,
      precision: 0.833,
      recall: 0.808,
      rocAuc: 0.895,
      datasetId: 1,
      datasetName: 'crowdfunding_global_2024_master.csv',
      isActive: false,
      createdAt: daysAgo(70),
      trainingStatus: 'ready',
      hyperparameters: { n_estimators: 100, max_depth: 8 },
    },
    {
      versionId: 3,
      algorithm: 'RandomForest',
      name: 'RandomForest v3',
      version: 'v3',
      accuracy: 0.864,
      f1Score: 0.842,
      precision: 0.856,
      recall: 0.829,
      rocAuc: 0.912,
      datasetId: 1,
      datasetName: 'crowdfunding_global_2024_master.csv',
      isActive: true,
      createdAt: daysAgo(20),
      trainingStatus: 'ready',
      hyperparameters: { n_estimators: 200, max_depth: 12 },
    },
    {
      versionId: 4,
      algorithm: 'XGBoost',
      name: 'XGBoost v2.1',
      version: 'v2.1',
      accuracy: 0.852,
      f1Score: 0.833,
      precision: 0.847,
      recall: 0.821,
      rocAuc: 0.905,
      datasetId: 1,
      datasetName: 'crowdfunding_global_2024_master.csv',
      isActive: false,
      createdAt: daysAgo(15),
      trainingStatus: 'ready',
      hyperparameters: { learning_rate: 0.1, n_estimators: 300 },
    },
  ];

  return {
    version: DB_VERSION,
    users,
    categories,
    campaigns,
    pledges,
    predictions,
    datasets,
    models,
    counters: {
      user: 10,
      campaign: 5012,
      reward: 121,
      pledge: 8,
      prediction: 9010,
      dataset: 4,
      model: 4,
    },
  };
}
