import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Campaign } from '@/types';
import { campaignApi } from '@/api';
import { formatCompactCurrency, formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { CampaignArtwork } from '@/components/campaign/CampaignArtwork';
import { PredictionBadge } from '@/components/campaign/PredictionBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip, statusTone } from '@/components/ui/Chip';
import { PillButton, buttonClasses } from '@/components/ui/PillButton';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { cn } from '@/lib/cn';

type Filter = 'all' | 'live' | 'draft';

export function CreatorCampaignsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', 'mine'],
    queryFn: campaignApi.mine,
  });

  const items = data?.items ?? [];
  const filtered = items.filter((campaign) => {
    if (filter === 'live') return campaign.status === 'SUBMITTED';
    if (filter === 'draft') return campaign.status === 'DRAFT';
    return true;
  });
  const evaluated = items.filter((campaign) => campaign.prediction);
  const averageProbability =
    evaluated.length > 0
      ? evaluated.reduce((sum, campaign) => sum + (campaign.prediction?.probability ?? 0), 0) / evaluated.length
      : 0;

  const columns: Array<Column<Campaign>> = [
    {
      key: 'campaign',
      header: 'Campaign',
      render: (campaign) => (
        <div className="flex items-center gap-3">
          <CampaignArtwork
            categoryName={campaign.categoryName}
            title={campaign.title}
            compact
            className="h-10 w-10 shrink-0 rounded-lg"
          />
          <div className="min-w-0">
            <p className="max-w-[220px] truncate text-body-sm font-semibold text-ink">{campaign.title}</p>
            <p className="text-label-md text-muted">
              {campaign.categoryName} · created {formatDate(campaign.createdAt)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (campaign) => (
        <Chip tone={statusTone(campaign.status)} icon={campaign.status === 'DRAFT' ? 'edit_note' : 'public'}>
          {campaign.status === 'DRAFT' ? 'Draft' : 'Live'}
        </Chip>
      ),
    },
    {
      key: 'goal',
      header: 'Goal',
      align: 'right',
      render: (campaign) => <span className="whitespace-nowrap">{formatCurrency(campaign.goalAmount)}</span>,
    },
    {
      key: 'raised',
      header: 'Raised',
      align: 'right',
      render: (campaign) => (
        <div className="text-right">
          <p className="font-semibold text-ink">{formatCompactCurrency(campaign.pledgedAmount ?? 0)}</p>
          <p className="text-label-md text-muted">
            {formatPercent(Math.min(1, (campaign.pledgedAmount ?? 0) / Math.max(1, campaign.goalAmount)))}
          </p>
        </div>
      ),
    },
    {
      key: 'prediction',
      header: 'Forecast',
      render: (campaign) =>
        campaign.prediction ? (
          <PredictionBadge probability={campaign.prediction.probability} label={campaign.prediction.label} />
        ) : (
          <span className="text-label-md text-muted">Not evaluated</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (campaign) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
          <Link
            to={`/campaigns/${campaign.campaignId}`}
            className={buttonClasses('ghost', 'sm')}
            title="View campaign"
            aria-label={`View ${campaign.title}`}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              visibility
            </span>
          </Link>
          <Link
            to={`/creator/campaigns/${campaign.campaignId}/edit`}
            className={buttonClasses('secondary', 'sm')}
            title="Edit campaign"
            aria-label={`Edit ${campaign.title}`}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              edit
            </span>
          </Link>
          <Link
            to={`/creator/predictions/new?campaignId=${campaign.campaignId}`}
            className={buttonClasses('primary', 'sm')}
            title="Run prediction"
            aria-label={`Run prediction for ${campaign.title}`}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              auto_awesome
            </span>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Creator studio"
        title="Your campaigns"
        description="Draft, evaluate, and publish your campaigns from one workspace."
        actions={
          <>
            <Link to="/creator/predictions" className={buttonClasses('secondary', 'md')}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                history
              </span>
              Prediction history
            </Link>
            <Link to="/creator/campaigns/new" className={buttonClasses('primary', 'md')}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                add
              </span>
              New campaign
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total campaigns" value={items.length} icon="campaign" hint="Drafts and live" />
        <StatCard
          label="Live campaigns"
          value={items.filter((campaign) => campaign.status === 'SUBMITTED').length}
          icon="public"
          tone="gold"
          hint="Visible to backers"
        />
        <StatCard
          label="Drafts"
          value={items.filter((campaign) => campaign.status === 'DRAFT').length}
          icon="edit_note"
          tone="neutral"
          hint="Still private"
        />
        <StatCard
          label="Average forecast"
          value={evaluated.length > 0 ? formatPercent(averageProbability) : '—'}
          icon="auto_awesome"
          tone="brand"
          hint={`${evaluated.length} of ${items.length} evaluated`}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-pill border border-line/50 bg-white p-1" role="tablist" aria-label="Filter campaigns">
          {(['all', 'live', 'draft'] as Filter[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-pill px-4 py-1.5 text-label-lg font-medium capitalize transition',
                filter === value ? 'bg-mint text-brand' : 'text-on-surface-variant hover:bg-surface-low',
              )}
            >
              {value === 'all' ? `All (${items.length})` : value === 'live' ? `Live (${items.filter((campaign) => campaign.status === 'SUBMITTED').length})` : `Drafts (${items.filter((campaign) => campaign.status === 'DRAFT').length})`}
            </button>
          ))}
        </div>
        <p className="text-label-md text-muted">Select a row to open the campaign.</p>
      </div>

      <div className="mt-4">
        {filtered.length === 0 && !isLoading ? (
          <EmptyState
            icon="campaign"
            title={items.length === 0 ? 'Create your first campaign' : 'No campaigns in this view'}
            description={
              items.length === 0
                ? 'Draft a campaign, add reward tiers, and run it through the prediction engine before launch.'
                : 'Switch the filter to see your other campaigns.'
            }
            action={
              items.length === 0 ? (
                <Link to="/creator/campaigns/new" className={buttonClasses('primary', 'md')}>
                  Create campaign
                </Link>
              ) : (
                <PillButton variant="secondary" onClick={() => setFilter('all')}>
                  Show all campaigns
                </PillButton>
              )
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(campaign) => campaign.campaignId}
            loading={isLoading}
            onRowClick={(campaign) => navigate(`/campaigns/${campaign.campaignId}`)}
            emptyTitle="No campaigns in this view"
          />
        )}
      </div>

      <FloatingActionButton to="/creator/campaigns/new" icon="add" label="New campaign" />
    </div>
  );
}
