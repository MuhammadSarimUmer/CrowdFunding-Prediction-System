import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'brand' | 'gold' | 'danger' | 'neutral';

const TONES: Record<Tone, { icon: string; value: string }> = {
  brand: { icon: 'bg-mint/60 text-brand', value: 'text-ink' },
  gold: { icon: 'bg-gold-soft text-[#6b4e12]', value: 'text-ink' },
  danger: { icon: 'bg-error-container text-danger', value: 'text-danger' },
  neutral: { icon: 'bg-surface-container text-on-surface-variant', value: 'text-ink' },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
  tone?: Tone;
  className?: string;
}

export function StatCard({ label, value, hint, icon, tone = 'brand', className }: StatCardProps) {
  return (
    <div className={cn('rounded-card border border-line/40 bg-card p-5 shadow-paper', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-md font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
          <p className={cn('mt-2 font-sans text-headline-md font-bold tracking-[-0.01em]', TONES[tone].value)}>
            {value}
          </p>
        </div>
        {icon ? (
          <span
            className={cn(
              'material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[22px]',
              TONES[tone].icon,
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>
      {hint ? <div className="mt-3 text-label-md text-muted">{hint}</div> : null}
    </div>
  );
}
