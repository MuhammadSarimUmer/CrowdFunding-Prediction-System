import { cn } from '@/lib/cn';
import { toPercentPoints } from '@/lib/format';

interface PredictionBadgeProps {
  probability: number;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function PredictionBadge({ probability, label, size = 'sm', className }: PredictionBadgeProps) {
  const percent = toPercentPoints(probability);
  const tone =
    percent >= 65
      ? 'bg-mint text-brand'
      : percent >= 50
        ? 'bg-gold-soft text-[#6b4e12]'
        : 'bg-error-container text-on-error-container';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill font-semibold shadow-paper',
        size === 'sm' ? 'px-2.5 py-1 text-label-md' : 'px-3.5 py-1.5 text-label-lg',
        tone,
        className,
      )}
      title={label ? `${label} · ${Math.round(percent)}% probability` : undefined}
    >
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
        auto_awesome
      </span>
      {Math.round(percent)}%{label ? <span className="hidden sm:inline"> · {label}</span> : null}
    </span>
  );
}
