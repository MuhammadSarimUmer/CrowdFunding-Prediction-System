import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

interface FloatingActionButtonProps {
  to?: string;
  onClick?: () => void;
  icon: string;
  label: string;
  ariaLabel?: string;
  className?: string;
}

export function FloatingActionButton({
  to,
  onClick,
  icon,
  label,
  ariaLabel,
  className,
}: FloatingActionButtonProps) {
  const classes = cn(
    'fixed bottom-6 right-6 z-40 inline-flex h-14 items-center gap-2 rounded-pill bg-action px-5 text-label-lg font-semibold text-white shadow-fab transition-all duration-150 ease-press hover:bg-brand hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 active:translate-y-px',
    className,
  );
  const content = (
    <>
      <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={ariaLabel ?? label}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes} aria-label={ariaLabel ?? label}>
      {content}
    </button>
  );
}
