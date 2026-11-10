import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-action text-white shadow-paper hover:bg-brand hover:shadow-lift',
  secondary: 'border border-outline/40 bg-transparent text-brand hover:border-brand/50 hover:bg-mint/40',
  ghost: 'text-on-surface-variant hover:bg-surface-container hover:text-ink',
  danger: 'bg-danger text-white shadow-paper hover:bg-[#a91a10]',
  gold: 'bg-gold text-house shadow-paper hover:bg-[#b8914a]',
  dark: 'bg-house text-white shadow-paper hover:bg-[#152a25]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-label-lg',
  md: 'h-11 px-6 text-label-lg',
  lg: 'h-12 px-8 text-body-md',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', fullWidth = false): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-pill font-semibold tracking-[-0.005em] transition-all duration-150 ease-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
  );
}

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: string;
  iconRight?: string;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function PillButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: PillButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses(variant, size, fullWidth), className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : icon ? (
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
      {iconRight && !loading ? (
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          {iconRight}
        </span>
      ) : null}
    </button>
  );
}
