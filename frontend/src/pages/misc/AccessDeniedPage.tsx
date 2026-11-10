import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { roleHome } from '@/lib/auth';
import { buttonClasses } from '@/components/ui/PillButton';

export function AccessDeniedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="mx-auto flex max-w-content flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-error-container text-danger">
        <span className="material-symbols-outlined text-[40px]" aria-hidden="true">
          lock
        </span>
      </span>
      <p className="mt-6 text-label-md font-semibold uppercase tracking-[0.16em] text-brand">403 · Access denied</p>
      <h1 className="mt-2 font-sans text-headline-xl-mobile font-bold tracking-[-0.015em] text-ink sm:text-headline-xl">
        This workspace isn’t available to your role
      </h1>
      <p className="mt-3 max-w-reading text-body-md text-muted">
        {user
          ? `You’re signed in as a ${user.role}, but this area requires different permissions. Head back to your dashboard or switch accounts.`
          : 'Sign in with an account that has permission to view this page.'}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to={user ? roleHome(user.role) : '/login'} className={buttonClasses('primary', 'md')}>
          {user ? 'Go to my dashboard' : 'Sign in'}
        </Link>
        <Link to="/campaigns" className={buttonClasses('secondary', 'md')}>
          Browse campaigns
        </Link>
        {user ? (
          <button type="button" onClick={() => void signOut()} className={buttonClasses('ghost', 'md')}>
            Switch account
          </button>
        ) : null}
      </div>
    </div>
  );
}
