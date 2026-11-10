import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, padding = 'md', hover = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line/40 bg-card shadow-paper',
        PADDING[padding],
        hover && 'transition-all duration-200 ease-press hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
