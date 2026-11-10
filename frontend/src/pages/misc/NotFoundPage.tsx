import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { roleHome } from '@/lib/auth';
import { buttonClasses } from '@/components/ui/PillButton';

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto flex max-w-content flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-mint/60 text-brand">
        <span className="material-symbols-outlined text-[40px]" aria-hidden="true">
          travel_explore
        </span>
      </span>
      <p className="mt-6 text-label-md font-semibold uppercase tracking-[0.16em] text-brand">404 · Page not found</p>
      <h1 className="mt-2 font-sans text-headline-xl-mobile font-bold tracking-[-0.015em] text-ink sm:text-headline-xl">
        We couldn’t find that page
      </h1>
      <p className="mt-3 max-w-reading text-body-md text-muted">
        The link may be outdated, or the campaign may have been removed by its creator. Try the campaign directory
        instead.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to={user ? roleHome(user.role) : '/campaigns'} className={buttonClasses('primary', 'md')}>
          {user ? 'Go to my dashboard' : 'Explore campaigns'}
        </Link>
        <Link to="/campaigns" className={buttonClasses('secondary', 'md')}>
          Browse all campaigns
        </Link>
      </div>
    </div>
  );
}
