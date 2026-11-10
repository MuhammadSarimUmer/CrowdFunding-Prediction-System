const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-US');

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return compactCurrencyFormatter.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return numberFormatter.format(value);
}

export function toRatio(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Math.abs(value) > 1 ? value / 100 : value;
}

export function toPercentPoints(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${toPercentPoints(value).toFixed(digits)}%`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (minutes < 60) return rtf.format(Math.sign(diff) * minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(Math.sign(diff) * hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(Math.sign(diff) * days, 'day');
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(Math.sign(diff) * months, 'month');
  return rtf.format(Math.sign(diff) * Math.round(months / 12), 'year');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getGoalPerDay(goalAmount: number, durationDays: number): number {
  if (!durationDays || durationDays <= 0) return 0;
  return goalAmount / durationDays;
}

export function daysLeft(endsAt?: string, durationDays?: number, createdAt?: string): number | undefined {
  if (endsAt) {
    const end = new Date(endsAt).getTime();
    if (!Number.isNaN(end)) return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
  }
  if (createdAt && durationDays) {
    const end = new Date(createdAt).getTime() + durationDays * 86400000;
    return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
  }
  return durationDays;
}

export function initials(name: string | undefined): string {
  if (!name) return 'CP';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function humanizeFactor(factor: string): string {
  const map: Record<string, string> = {
    goalAmount: 'Goal amount',
    durationDays: 'Campaign duration',
    goalPerDay: 'Required daily velocity',
    rewardCount: 'Reward tier spread',
    rewardsCount: 'Reward tier spread',
    descriptionLength: 'Pitch depth',
    textLength: 'Pitch depth',
    country: 'Market country',
    category: 'Market category',
    backerVelocity: 'Early backer velocity',
    titleLength: 'Title clarity',
  };
  if (map[factor]) return map[factor];
  return factor
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase())
    .trim();
}

export function factorExplanation(factor: string, value: number): string {
  const positive = value >= 0;
  const explanations: Record<string, [string, string]> = {
    goalAmount: [
      'The funding target is realistic for a first production run, which lifts backer confidence.',
      'The funding target is high relative to comparable campaigns, which adds execution risk.',
    ],
    durationDays: [
      'The campaign window gives backers enough urgency without exhausting momentum.',
      'The campaign window is outside the optimal range for sustained pledge velocity.',
    ],
    goalPerDay: [
      'The required daily funding pace sits inside the historical safe corridor.',
      'The required daily pace is aggressive for a campaign without a pre-built audience.',
    ],
    rewardCount: [
      'A clear spread of reward tiers gives backers several natural entry points.',
      'Too few or poorly spaced tiers limit the number of backers who can convert.',
    ],
    rewardsCount: [
      'A clear spread of reward tiers gives backers several natural entry points.',
      'Too few or poorly spaced tiers limit the number of backers who can convert.',
    ],
    descriptionLength: [
      'The pitch has enough narrative depth to communicate technical feasibility.',
      'A thinner pitch makes it harder for backers to judge delivery risk.',
    ],
    textLength: [
      'The pitch has enough narrative depth to communicate technical feasibility.',
      'A thinner pitch makes it harder for backers to judge delivery risk.',
    ],
    backerVelocity: [
      'Early pledge velocity is tracking above the category median.',
      'Early pledge velocity is below the category median.',
    ],
  };
  const pair = explanations[factor];
  if (pair) return positive ? pair[0] : pair[1];
  return positive
    ? 'This signal is contributing positively to the forecast.'
    : 'This signal is reducing the forecast probability.';
}
