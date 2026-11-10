import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Pledge } from '@/types';
import { pledgeApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { CampaignArtwork } from '@/components/campaign/CampaignArtwork';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PillButton, buttonClasses } from '@/components/ui/PillButton';
import { Chip } from '@/components/ui/Chip';

export function MyPledgesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: pledges, isLoading } = useQuery({
    queryKey: ['pledges', 'mine'],
    queryFn: pledgeApi.mine,
  });

  const items = pledges ?? [];
  const total = items.reduce((sum, pledge) => sum + pledge.amount, 0);
  const campaignCount = new Set(items.map((pledge) => pledge.campaignId)).size;
  const average = items.length > 0 ? total / items.length : 0;
  const latest = items[0];

  const columns: Array<Column<Pledge>> = [
    {
      key: 'campaign',
      header: 'Campaign',
      render: (pledge) => (
        <div className="flex items-center gap-3">
          <CampaignArtwork
            categoryName={pledge.campaign?.categoryName}
            title={pledge.campaign?.title ?? 'Campaign'}
            compact
            className="h-10 w-10 shrink-0 rounded-lg"
          />
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-ink">
              {pledge.campaign?.title ?? `Campaign ${pledge.campaignId}`}
            </p>
            <p className="text-label-md text-muted">{pledge.campaign?.categoryName ?? 'Campaign'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'reward',
      header: 'Reward',
      render: (pledge) => (
        <div>
          <p className="text-body-sm text-on-surface-variant">{pledge.reward?.title ?? 'No reward selected'}</p>
          {pledge.reward ? (
            <p className="text-label-md text-muted">Minimum {formatCurrency(pledge.reward.minPledge)}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (pledge) => <span className="font-semibold text-ink">{formatCurrency(pledge.amount)}</span>,
    },
    {
      key: 'date',
      header: 'Pledged',
      render: (pledge) => <span className="whitespace-nowrap">{formatDate(pledge.date)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <Chip tone="success" icon="check_circle">Recorded</Chip>,
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (pledge) => (
        <Link
          to={`/campaigns/${pledge.campaignId}`}
          className="inline-flex items-center gap-1 text-label-lg font-semibold text-brand hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          View
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Backer workspace"
        title={`My pledges${user ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Every campaign you have backed, the reward you selected, and what you contributed."
        actions={
          <Link to="/campaigns" className={buttonClasses('primary', 'md')}>
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              explore
            </span>
            Discover campaigns
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total pledged" value={formatCurrency(total)} icon="volunteer_activism" hint="Across all campaigns" />
        <StatCard label="Campaigns supported" value={campaignCount} icon="campaign" tone="gold" hint="Unique projects" />
        <StatCard label="Average pledge" value={formatCurrency(average)} icon="receipt_long" tone="neutral" hint="Per contribution" />
        <StatCard
          label="Latest pledge"
          value={latest ? formatDate(latest.date) : '—'}
          icon="schedule"
          tone="brand"
          hint={latest?.campaign?.title ?? 'No pledges yet'}
        />
      </div>

      <div className="mt-8">
        {items.length === 0 && !isLoading ? (
          <EmptyState
            icon="favorite_border"
            title="You have not backed a campaign yet"
            description="Explore live campaigns with model-backed success signals and find an idea worth supporting."
            action={
              <Link to="/campaigns" className={buttonClasses('primary', 'md')}>
                Browse campaigns
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(pledge) => pledge.pledgeId}
            loading={isLoading}
            onRowClick={(pledge) => navigate(`/campaigns/${pledge.campaignId}`)}
            emptyTitle="No pledges yet"
          />
        )}
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-3 rounded-card border border-line/40 bg-surface-low/70 px-5 py-4 text-body-sm text-muted sm:flex-row sm:items-center">
        <p className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-brand" aria-hidden="true">
            info
          </span>
          Pledges are recorded instantly in mock mode. A production build would hand off to the payment provider here.
        </p>
        <PillButton variant="ghost" size="sm" onClick={() => navigate('/campaigns')} iconRight="arrow_forward">
          Keep exploring
        </PillButton>
      </div>
    </div>
  );
}
