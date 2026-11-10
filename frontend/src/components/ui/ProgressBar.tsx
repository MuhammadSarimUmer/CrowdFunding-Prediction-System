import { cn } from '@/lib/cn';

interface ProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  tone?: 'brand' | 'gold' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showValue = false,
  tone = 'brand',
  size = 'md',
  className,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const colors = {
    brand: 'bg-action',
    gold: 'bg-gold',
    danger: 'bg-danger',
  };
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-label-md">
          {label ? <span className="font-medium text-on-surface-variant">{label}</span> : <span />}
          {showValue ? <span className="font-semibold text-ink">{Math.round(pct)}%</span> : null}
        </div>
      )}
      <div
        className={cn('w-full overflow-hidden rounded-pill bg-surface-high', size === 'sm' ? 'h-1.5' : 'h-2.5')}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className={cn('h-full rounded-pill transition-all duration-500 ease-out', colors[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
