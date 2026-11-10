import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'brand' | 'gold';

const TONES: Record<Tone, string> = {
  success: 'bg-mint/60 text-brand',
  warning: 'bg-warning/15 text-[#7a5b00]',
  danger: 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-container text-on-surface-variant',
  brand: 'bg-brand text-white',
  gold: 'bg-gold-soft text-[#6b4e12]',
};

interface ChipProps {
  children: ReactNode;
  tone?: Tone;
  icon?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function Chip({ children, tone = 'neutral', icon, className, size = 'sm' }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill font-semibold',
        size === 'sm' ? 'px-2.5 py-1 text-label-md' : 'px-3.5 py-1.5 text-label-lg',
        TONES[tone],
        className,
      )}
    >
      {icon ? (
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

export function statusTone(status: string | undefined): Tone {
  const value = (status ?? '').toLowerCase();
  if (value === 'submitted' || value === 'active' || value === 'validated' || value === 'ready') return 'success';
  if (value === 'draft' || value === 'processing' || value === 'training') return 'warning';
  if (value === 'archived' || value === 'failed' || value === 'inactive') return 'neutral';
  return 'neutral';
}
