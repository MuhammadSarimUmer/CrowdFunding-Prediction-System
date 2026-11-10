import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line/70 bg-surface-low/60 px-6 py-16 text-center">
      <span
        className="material-symbols-outlined mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mint/50 text-[28px] text-brand"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="text-headline-sm font-semibold text-ink">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-body-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
