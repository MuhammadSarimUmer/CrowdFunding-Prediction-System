import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Dataset } from '@/types';
import { adminApi } from '@/api';
import { formatDate, formatNumber, formatPercent, toPercentPoints } from '@/lib/format';
import { ALGORITHM_LABELS } from '@/lib/constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Chip, statusTone } from '@/components/ui/Chip';
import { ModelComparisonChart } from '@/components/ui/ModelComparisonChart';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SkeletonStats, Skeleton } from '@/components/ui/Skeleton';
import { buttonClasses } from '@/components/ui/PillButton';
import { ProgressBar } from '@/components/ui/ProgressBar';

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats });
  const { data: models } = useQuery({ queryKey: ['admin', 'models'], queryFn: adminApi.models });
  const { data: datasets } = useQuery({ queryKey: ['admin', 'datasets'], queryFn: adminApi.datasets });

  const activeModel = models?.find((model) => model.isActive);
  const recentDatasets = (datasets ?? []).slice(0, 4);

  const datasetColumns: Array<Column<Dataset>> = [
    {
      key: 'file',
      header: 'Dataset',
      render: (dataset) => (
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[20px] text-brand" aria-hidden="true">
            description
          </span>
          <div className="min-w-0">
            <p className="max-w-[240px] truncate text-body-sm font-semibold text-ink">{dataset.fileName}</p>
            <p className="text-label-md text-muted">{formatNumber(dataset.rowCount)} rows</p>
          </div>
        </div>
      ),
    },
    {
      key: 'uploaded',
      header: 'Uploaded',
      render: (dataset) => <span className="whitespace-nowrap">{formatDate(dataset.uploadedAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (dataset) => (
        <Chip tone={statusTone(dataset.status)}>{dataset.status ?? 'validated'}</Chip>
      ),
    },
  ];

  if (isLoading || !stats) {
    return (
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="mb-3 h-4 w-40" />
        <Skeleton className="mb-8 h-10 w-1/2" />
        <SkeletonStats />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-card lg:col-span-2" />
          <Skeleton className="h-80 w-full rounded-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin console"
        title="Platform overview"
        description="Monitor the marketplace, the model registry, and the training corpus from one place."
        actions={
          <>
            <Link to="/admin/datasets" className={buttonClasses('secondary', 'md')}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                upload_file
              </span>
              Upload dataset
            </Link>
            <Link to="/admin/models/train" className={buttonClasses('primary', 'md')}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                model_training
              </span>
              Train model
            </Link>
          </>
        }
      />
      <AdminTabs />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active users"
          value={`${formatNumber(stats.users.active)} / ${formatNumber(stats.users.total)}`}
          icon="group"
          hint={`${stats.users.creators} creators · ${stats.users.backers} backers`}
        />
        <StatCard
          label="Campaigns evaluated"
          value={`${formatNumber(stats.campaigns.evaluated)} / ${formatNumber(stats.campaigns.total)}`}
          icon="campaign"
          tone="gold"
          hint={`${stats.campaigns.active} live · ${stats.campaigns.drafts} drafts`}
        />
        <StatCard
          label="Predictions run"
          value={formatNumber(stats.predictions.total)}
          icon="query_stats"
          tone="neutral"
          hint={`${formatPercent(stats.predictions.averageProbability)} average probability`}
        />
        <StatCard
          label="Active model accuracy"
          value={formatPercent(stats.models.accuracy)}
          icon="verified"
          tone="brand"
          hint={`${stats.models.activeVersion ?? 'No active model'} · F1 ${formatPercent(stats.models.f1Score)}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-headline-sm font-semibold text-ink">Model performance</h2>
              <p className="mt-1 text-body-sm text-muted">Accuracy and F1 across every trained version.</p>
            </div>
            <Link to="/admin/models" className="text-label-lg font-semibold text-brand hover:underline">
              Model registry
            </Link>
          </div>
          <div className="mt-4">
            <ModelComparisonChart models={models ?? []} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-headline-sm font-semibold text-ink">Active model</h2>
            <Chip tone="success" icon="verified">
              Live
            </Chip>
          </div>
          {activeModel ? (
            <div className="mt-4">
              <div className="rounded-xl border border-brand/20 bg-mint/25 p-4">
                <p className="text-label-md font-semibold uppercase tracking-[0.1em] text-brand">
                  {ALGORITHM_LABELS[activeModel.algorithm]}
                </p>
                <p className="mt-1 text-headline-sm font-bold text-ink">{activeModel.name ?? activeModel.version}</p>
                <p className="mt-1 text-label-md text-muted">{activeModel.datasetName}</p>
              </div>
              <div className="mt-4 space-y-3">
                <ProgressBar label="Accuracy" value={toPercentPoints(activeModel.accuracy)} showValue />
                <ProgressBar label="F1 score" value={toPercentPoints(activeModel.f1Score)} showValue tone="gold" />
                <ProgressBar label="ROC AUC" value={toPercentPoints(activeModel.rocAuc ?? 0)} showValue />
              </div>
              <Link to="/admin/models" className={buttonClasses('secondary', 'sm', true)}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  tune
                </span>
                Manage models
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-body-sm text-muted">No active model. Train and activate one to start scoring.</p>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card padding="none">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-headline-sm font-semibold text-ink">Recent datasets</h2>
              <p className="text-body-sm text-muted">{formatNumber(stats.datasets.rows)} total training rows</p>
            </div>
            <Link to="/admin/datasets" className="text-label-lg font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="border-t border-line/40">
            <DataTable
              columns={datasetColumns}
              rows={recentDatasets}
              rowKey={(dataset) => dataset.datasetId}
              emptyTitle="No datasets uploaded"
            />
          </div>
        </Card>

        <Card className="self-start">
          <h2 className="text-headline-sm font-semibold text-ink">Quick actions</h2>
          <div className="mt-4 grid gap-2">
            <Link to="/admin/models/train" className={buttonClasses('primary', 'sm', true)}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                model_training
              </span>
              Train a new model
            </Link>
            <Link to="/admin/datasets" className={buttonClasses('secondary', 'sm', true)}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                upload_file
              </span>
              Upload a dataset
            </Link>
            <Link to="/admin/users" className={buttonClasses('secondary', 'sm', true)}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                manage_accounts
              </span>
              Manage users
            </Link>
            <Link to="/admin/models" className={buttonClasses('secondary', 'sm', true)}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                compare_arrows
              </span>
              Compare models
            </Link>
          </div>
          <div className="mt-5 rounded-xl bg-surface-low px-4 py-3 text-label-md text-muted">
            <p className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-brand" aria-hidden="true">
                savings
              </span>
              {stats.datasets.total} datasets · {formatNumber(stats.datasets.rows)} rows available for training.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
