import type { Role } from '@/types';

export function roleHome(role: Role | undefined): string {
  if (role === 'admin') return '/admin';
  if (role === 'creator') return '/creator/campaigns';
  return '/campaigns';
}

export function safeRedirect(value: string | null, fallback: string): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return fallback;
}
