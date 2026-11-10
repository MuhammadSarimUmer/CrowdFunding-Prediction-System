import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ROLE_LABELS } from '@/lib/constants';
import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';
import { buttonClasses } from '@/components/ui/PillButton';

interface NavItem {
  label: string;
  to: string;
  roles?: Array<'backer' | 'creator' | 'admin'>;
}

function navItems(role: string | undefined): NavItem[] {
  const items: NavItem[] = [{ label: 'Discover', to: '/campaigns' }];
  if (!role) return items;
  if (role === 'backer') {
    items.push({ label: 'My Pledges', to: '/my-pledges' });
  }
  if (role === 'creator' || role === 'admin') {
    items.push({ label: 'Creator Studio', to: '/creator/campaigns' });
    items.push({ label: 'Predictions', to: '/creator/predictions' });
  }
  if (role === 'admin') {
    items.push({ label: 'Admin', to: '/admin' });
  }
  return items;
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    await logout();
    success('You have been signed out.');
    navigate('/campaigns');
  }

  const items = navItems(user?.role);

  return (
    <header className="sticky top-0 z-50 border-b border-line/40 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/campaigns" className="flex shrink-0 items-center gap-2.5" aria-label="CrowdPredict home">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint text-brand">
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              eco
            </span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[18px] font-bold tracking-[-0.02em] text-house">CrowdPredict</span>
            <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted sm:block">
              Warm heritage intelligence
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-pill px-4 py-2 text-label-lg font-medium transition-colors',
                  isActive ? 'bg-mint/60 text-brand' : 'text-on-surface-variant hover:bg-surface-container hover:text-ink',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-pill border border-line/50 bg-white py-1 pl-1 pr-2.5 transition hover:border-brand/40 hover:shadow-paper"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-house text-label-md font-semibold text-white">
                  {initials(user.name)}
                </span>
                <span className="max-w-[120px] truncate text-label-lg font-medium text-ink">{user.name}</span>
                <span className="material-symbols-outlined text-[18px] text-muted" aria-hidden="true">
                  expand_more
                </span>
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-64 animate-fade-up overflow-hidden rounded-card border border-line/40 bg-white shadow-modal"
                >
                  <div className="border-b border-line/40 px-4 py-3">
                    <p className="truncate text-body-sm font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-label-md text-muted">{user.email}</p>
                    <span className="mt-2 inline-flex rounded-pill bg-mint/60 px-2 py-0.5 text-label-sm font-semibold text-brand">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                  <div className="p-1.5">
                    {user.role === 'backer' ? (
                      <Link to="/my-pledges" className="flex items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-on-surface-variant hover:bg-surface-low">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                          favorite
                        </span>
                        My pledges
                      </Link>
                    ) : null}
                    {user.role === 'creator' || user.role === 'admin' ? (
                      <Link to="/creator/campaigns" className="flex items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-on-surface-variant hover:bg-surface-low">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                          dashboard
                        </span>
                        Creator studio
                      </Link>
                    ) : null}
                    {user.role === 'admin' ? (
                      <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-on-surface-variant hover:bg-surface-low">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                          admin_panel_settings
                        </span>
                        Admin console
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body-sm text-danger hover:bg-error-container/40"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        logout
                      </span>
                      Sign out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link to="/login" className={buttonClasses('ghost', 'sm')}>
                Sign in
              </Link>
              <Link to="/register" className={buttonClasses('primary', 'sm')}>
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container md:hidden"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
        >
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
            {mobileOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-line/40 bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-body-sm font-medium',
                    isActive ? 'bg-mint/60 text-brand' : 'text-on-surface-variant hover:bg-surface-container',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 border-t border-line/40 pt-4">
            {user ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-house text-label-md font-semibold text-white">
                    {initials(user.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-ink">{user.name}</p>
                    <p className="text-label-md text-muted">{ROLE_LABELS[user.role]}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={buttonClasses('ghost', 'sm')}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link to="/login" className={buttonClasses('secondary', 'sm', true)}>
                  Sign in
                </Link>
                <Link to="/register" className={buttonClasses('primary', 'sm', true)}>
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
