import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role, User } from '@/types';
import { adminApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/constants';
import { formatCurrency, formatDate, initials } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PillButton } from '@/components/ui/PillButton';
import { Chip, type Tone } from '@/components/ui/Chip';
import { FloatingLabelInput } from '@/components/ui/Field';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  backer: 'Browse campaigns, pledge support, and track contributions.',
  creator: 'Create campaigns and run success predictions.',
  admin: 'Manage datasets, models, users, and platform reporting.',
};

const ROLE_ICONS: Record<Role, string> = {
  backer: 'volunteer_activism',
  creator: 'campaign',
  admin: 'admin_panel_settings',
};

function roleTone(role: Role): Tone {
  if (role === 'admin') return 'gold';
  if (role === 'creator') return 'success';
  return 'neutral';
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [nextRole, setNextRole] = useState<Role>('backer');
  const [savingRole, setSavingRole] = useState(false);
  const [statusTarget, setStatusTarget] = useState<User | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data: users, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'users', debouncedSearch],
    queryFn: () => adminApi.users(debouncedSearch),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
  });

  const items = users ?? [];
  const userStats = stats?.users;

  function openRole(user: User) {
    setRoleTarget(user);
    setNextRole(user.role);
  }

  async function saveRole() {
    if (!roleTarget) return;
    if (nextRole === roleTarget.role) {
      setRoleTarget(null);
      return;
    }
    setSavingRole(true);
    try {
      await adminApi.updateRole(roleTarget.userId, nextRole);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ]);
      success(`${roleTarget.name} is now a ${ROLE_LABELS[nextRole].toLowerCase()}.`);
      setRoleTarget(null);
    } catch (roleError) {
      toastError(getApiErrorMessage(roleError, 'Unable to update this user role.'));
    } finally {
      setSavingRole(false);
    }
  }

  async function toggleStatus() {
    if (!statusTarget) return;
    const nextActive = statusTarget.isActive === false;
    setSavingStatus(true);
    try {
      await adminApi.updateStatus(statusTarget.userId, nextActive);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ]);
      success(`${statusTarget.name} ${nextActive ? 'reactivated' : 'deactivated'}.`);
      setStatusTarget(null);
    } catch (statusError) {
      toastError(getApiErrorMessage(statusError, 'Unable to update this account status.'));
    } finally {
      setSavingStatus(false);
    }
  }

  const columns: Array<Column<User>> = [
    {
      key: 'user',
      header: 'User',
      render: (user) => {
        const self = currentUser?.userId === user.userId;
        return (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint/60 text-label-lg font-bold text-brand">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-body-sm font-semibold text-ink">
                <span className="max-w-[220px] truncate">{user.name}</span>
                {self ? <span className="text-label-md font-medium text-muted">(you)</span> : null}
              </p>
              <p className="max-w-[260px] truncate text-label-md text-muted">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => <Chip tone={roleTone(user.role)}>{ROLE_LABELS[user.role]}</Chip>,
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (user) => <span className="text-label-lg">{user.organization ?? '—'}</span>,
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (user) => <span className="whitespace-nowrap">{formatDate(user.createdAt)}</span>,
    },
    {
      key: 'pledged',
      header: 'Pledged',
      align: 'right',
      render: (user) => (
        <span className="font-mono text-label-lg">
          {user.role === 'backer' ? formatCurrency(user.totalPledged ?? 0) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) =>
        user.isActive === false ? (
          <Chip tone="neutral">Inactive</Chip>
        ) : (
          <Chip tone="success" icon="check_circle">
            Active
          </Chip>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (user) => {
        const self = currentUser?.userId === user.userId;
        const active = user.isActive !== false;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => openRole(user)}
              disabled={self}
              title={self ? 'You cannot change your own role' : undefined}
              className="rounded-pill px-2.5 py-1 text-label-md font-semibold text-brand transition hover:bg-mint/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Change role
            </button>
            <button
              type="button"
              onClick={() => setStatusTarget(user)}
              disabled={self}
              title={self ? 'You cannot deactivate your own account' : undefined}
              className={cn(
                'rounded-pill px-2.5 py-1 text-label-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
                active
                  ? 'text-danger hover:bg-error-container/40'
                  : 'text-brand hover:bg-mint/40',
              )}
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        );
      },
    },
  ];

  const statusIsActive = statusTarget?.isActive !== false;

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin console"
        title="Users"
        description="Search the account directory, change roles, and suspend access without losing campaign history."
      />
      <AdminTabs />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={userStats?.total ?? '—'} icon="group" hint="Across all roles" />
        <StatCard label="Active" value={userStats?.active ?? '—'} icon="check_circle" tone="brand" hint="Can sign in today" />
        <StatCard label="Creators" value={userStats?.creators ?? '—'} icon="campaign" tone="gold" hint="Can launch campaigns" />
        <StatCard label="Admins" value={userStats?.admins ?? '—'} icon="admin_panel_settings" tone="neutral" hint="Platform operators" />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-sm">
            <FloatingLabelInput
              label="Search by name or email"
              leadingIcon="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              autoComplete="off"
            />
          </div>
          <p className="flex items-center gap-2 text-label-lg text-muted" role="status" aria-live="polite">
            {isFetching ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mint border-t-brand" aria-hidden="true" />
            ) : null}
            {items.length} {items.length === 1 ? 'account' : 'accounts'}
            {debouncedSearch ? ` matching “${debouncedSearch}”` : ''}
          </p>
        </div>

        {items.length === 0 && !isLoading ? (
          <EmptyState
            icon="person_search"
            title="No matching users"
            description={debouncedSearch ? 'Try a different name or email address.' : 'No accounts have registered yet.'}
            action={
              debouncedSearch ? (
                <PillButton variant="secondary" onClick={() => setSearch('')}>
                  Clear search
                </PillButton>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(user) => user.userId}
            loading={isLoading}
            emptyTitle="No matching users"
          />
        )}
      </div>

      <Modal
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title="Change user role"
        description={roleTarget ? `${roleTarget.name} · ${roleTarget.email}` : undefined}
        footer={
          <>
            <PillButton variant="ghost" onClick={() => setRoleTarget(null)} disabled={savingRole}>
              Cancel
            </PillButton>
            <PillButton onClick={() => void saveRole()} loading={savingRole}>
              Save role
            </PillButton>
          </>
        }
      >
        <div className="space-y-2" role="radiogroup" aria-label="Role">
          {(Object.keys(ROLE_LABELS) as Role[]).map((role) => {
            const selected = nextRole === role;
            return (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setNextRole(role)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition',
                  selected ? 'border-brand bg-mint/25 ring-2 ring-brand/15' : 'border-line/60 hover:bg-surface-low',
                )}
              >
                <span
                  className={cn(
                    'material-symbols-outlined mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[20px]',
                    selected ? 'bg-brand text-white' : 'bg-surface-container text-on-surface-variant',
                  )}
                  aria-hidden="true"
                >
                  {ROLE_ICONS[role]}
                </span>
                <span className="min-w-0">
                  <span className="block text-label-lg font-semibold text-ink">{ROLE_LABELS[role]}</span>
                  <span className="block text-label-md text-muted">{ROLE_DESCRIPTIONS[role]}</span>
                </span>
                <span
                  className={cn(
                    'material-symbols-outlined ml-auto mt-1 text-[20px]',
                    selected ? 'text-brand' : 'text-outline',
                  )}
                  aria-hidden="true"
                >
                  {selected ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-low px-3.5 py-3 text-label-md text-muted">
          <span className="material-symbols-outlined mt-0.5 text-[18px] text-brand" aria-hidden="true">
            info
          </span>
          Role changes apply to new sessions. The user keeps their existing campaigns and pledge history.
        </p>
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusIsActive ? 'Deactivate this account?' : 'Reactivate this account?'}
        description={
          statusTarget
            ? statusIsActive
              ? `${statusTarget.name} will be signed out and blocked from signing in until reactivated. Their campaigns and pledges are preserved.`
              : `${statusTarget.name} will be able to sign in again with their existing credentials.`
            : ''
        }
        confirmLabel={statusIsActive ? 'Deactivate account' : 'Reactivate account'}
        tone={statusIsActive ? 'danger' : 'primary'}
        loading={savingStatus}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => void toggleStatus()}
      />
    </div>
  );
}
