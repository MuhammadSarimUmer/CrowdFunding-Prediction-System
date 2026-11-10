import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Prediction } from '@/types';
import { predictionApi } from '@/api';
import { formatDateTime, formatPercent, toRatio } from '@/lib/format';
import { CampaignArtwork } from '@/components/campaign/CampaignArtwork';
import { PredictionBadge } from '@/components/campaign/PredictionBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PillButton, buttonClasses } from '@/components/ui/PillButton';
import { Chip } from '@/components/ui/Chip';

export function PredictionHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['predictions', 'list', page],
    queryFn: () => predictionApi.list({ page, pageSize }),
  });

  const { data: all } = useQuery({
    queryKey: ['predictions', 'all'],
    queryFn: () => predictionApi.list({ page: 1, pageSize: 1000 }),
  });

  const items = data?.items ?? [];
  const allItems = all?.items ?? [];
  const average =
    allItems.length > 0
      ? allItems.reduce((sum, prediction) => sum + toRatio(prediction.probability), 0) / allItems.length
      : 0;
  const successCount = allItems.filter((prediction) => toRatio(prediction.probability) >= 0.5).length;
  const totalPages = data?.totalPages ?? 1;

  const columns: Array<Column<Prediction>> = [
    {
      key: 'campaign',
      header: 'Campaign',
      render: (prediction) => (
        <div className="flex items-center gap-3">
          <CampaignArtwork
            categoryName={prediction.campaign?.categoryName}
            title={prediction.campaign?.title ?? 'Campaign'}
            compact
            className="h-10 w-10 shrink-0 rounded-lg"
          />
          <div className="min-w-0">
            <p className="max-w-[220px] truncate text-body-sm font-semibold text-ink">
              {prediction.campaign?.title ?? `Campaign ${prediction.campaignId}`}
            </p>
            <p className="text-label-md text-muted">{prediction.campaign?.categoryName ?? 'Campaign'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'probability',
      header: 'Probability',
      render: (prediction) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-body-sm font-semibold text-ink">
            {formatPercent(prediction.probability)}
          </span>
          <PredictionBadge probability={prediction.probability} />
        </div>
      ),
    },
    {
      key: 'label',
      header: 'Forecast',
      render: (prediction) => (
        <Chip
          tone={prediction.label === 'Likely Success' ? 'success' : 'danger'}
          icon={prediction.label === 'Likely Success' ? 'trending_up' : 'trending_down'}
        >
          {prediction.label}
        </Chip>
      ),
    },
    {
      key: 'model',
      header: 'Model',
      render: (prediction) => (
        <span className="whitespace-nowrap text-label-lg text-on-surface-variant">{prediction.modelVersion}</span>
      ),
    },
    {
      key: 'date',
      header: 'Generated',
      render: (prediction) => (
        <span className="whitespace-nowrap text-label-lg text-on-surface-variant">
          {formatDateTime(prediction.createdAt)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (prediction) => (
        <Link
          to={`/creator/predictions/${prediction.predictionId}`}
          className="inline-flex items-center gap-1 text-label-lg font-semibold text-brand hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          Open
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
        eyebrow="Prediction engine"
        title="Prediction history"
        description="Every model run you have generated, with the probability, label, and production model version."
        actions={
          <>
            <Link to="/creator/campaigns" className={buttonClasses('secondary', 'md')}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                campaign
              </span>
              Campaigns
            </Link>
            <Link to="/creator/predictions/new" className={buttonClasses('primary', 'md')}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                auto_awesome
              </span>
              New prediction
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total predictions" value={all?.total ?? '—'} icon="history" hint="Across your campaigns" />
        <StatCard label="Average probability" value={formatPercent(average)} icon="query_stats" tone="gold" hint="All runs" />
        <StatCard label="Likely success" value={successCount} icon="trending_up" tone="brand" hint="At or above 50%" />
        <StatCard
          label="Latest model"
          value={allItems[0]?.modelVersion ?? '—'}
          icon="model_training"
          tone="neutral"
          hint="Production version"
        />
      </div>

      <div className="mt-8">
        {items.length === 0 && !isLoading ? (
          <EmptyState
            icon="query_stats"
            title="No predictions yet"
            description="Choose one of your campaigns and run it through the production model to get a success forecast."
            action={
              <Link to="/creator/predictions/new" className={buttonClasses('primary', 'md')}>
                Run your first prediction
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(prediction) => prediction.predictionId}
            loading={isLoading}
            onRowClick={(prediction) => navigate(`/creator/predictions/${prediction.predictionId}`)}
            emptyTitle="No predictions yet"
          />
        )}
      </div>

      {items.length > 0 ? (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-label-md text-muted">
            Page {data?.page ?? page} of {totalPages} · {data?.total ?? 0} total predictions
          </p>
          <div className="flex items-center gap-2">
            <PillButton
              variant="secondary"
              size="sm"
              icon="arrow_back"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </PillButton>
            <PillButton
              variant="secondary"
              size="sm"
              iconRight="arrow_forward"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </PillButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
