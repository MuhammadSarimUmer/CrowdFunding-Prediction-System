import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';

const TABS = [
  { label: 'Overview', to: '/admin', icon: 'dashboard', end: true },
  { label: 'Datasets', to: '/admin/datasets', icon: 'database' },
  { label: 'Models', to: '/admin/models', icon: 'model_training' },
  { label: 'Users', to: '/admin/users', icon: 'group' },
];

export function AdminTabs() {
  return (
    <div className="mb-8 overflow-x-auto">
      <nav
        className="inline-flex min-w-full gap-1 rounded-pill border border-line/50 bg-white p-1 sm:min-w-0"
        aria-label="Admin sections"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill px-4 py-2 text-label-lg font-medium transition sm:flex-none',
                isActive ? 'bg-mint text-brand' : 'text-on-surface-variant hover:bg-surface-low hover:text-ink',
              )
            }
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {tab.icon}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
