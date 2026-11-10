import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backTo,
  backLabel = 'Back',
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      {backTo ? (
        <Link
          to={backTo}
          className="mb-4 inline-flex items-center gap-1 text-label-lg font-medium text-on-surface-variant transition hover:text-brand"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            arrow_back
          </span>
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="mb-2 text-label-md font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
          ) : null}
          <h1 className="font-sans text-headline-xl-mobile font-bold tracking-[-0.015em] text-ink sm:text-headline-xl">
            {title}
          </h1>
          {description ? <p className="mt-2 max-w-reading text-body-md text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
