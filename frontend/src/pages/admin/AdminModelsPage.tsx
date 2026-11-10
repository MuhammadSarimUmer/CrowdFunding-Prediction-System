import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ModelVersion } from '@/types';
import { adminApi } from '@/api';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/lib/api';
import { ALGORITHM_LABELS } from '@/lib/constants';
import { formatDate, formatDateTime, formatNumber, formatPercent, toPercentPoints } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PillButton, buttonClasses } from '@/components/ui/PillButton';
import { Chip, statusTone } from '@/components/ui/Chip';
import { ModelComparisonChart } from '@/components/ui/ModelComparisonChart';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';

function modelName(model: ModelVersion): string {
  return model.name ?? `${ALGORITHM_LABELS[model.algorithm]} ${model.version ?? ''}`.trim();
}

export function AdminModelsPage() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [metricsTarget, setMetricsTarget] = useState<ModelVersion | null>(null);
  const [activateTarget, setActivateTarget] = useState<ModelVersion | null>(null);
  const [activating, setActivating] = useState(false);

  const { data: models, isLoading } = useQuery({
    queryKey: ['admin', 'models'],
    queryFn: adminApi.models,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin', 'model-metrics', metricsTarget?.versionId],
    queryFn: () => adminApi.metrics(metricsTarget!.versionId),
    enabled: Boolean(metricsTarget),
  });

  const items = models ?? [];
  const activeModel = items.find((model) => model.isActive);
  const bestF1 = items.reduce((best, model) => Math.max(best, model.f1Score), 0);
  const latest = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  async function activate() {
    if (!activateTarget) return;
    setActivating(true);
    try {
      await adminApi.activate(activateTarget.versionId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'models'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ]);
      success(`${modelName(activateTarget)} is now the active production model.`);
      setActivateTarget(null);
    } catch (activateError) {
      toastError(getApiErrorMessage(activateError, 'Unable to activate this model.'));
    } finally {
      setActivating(false);
    }
  }

  const columns: Array<Column<ModelVersion>> = [
    {
      key: 'model',
      header: 'Model version',
      render: (model) => (
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-lg bg-mint/40 text-[20px] text-brand" aria-hidden="true">
            model_training
          </span>
          <div>
            <p className="text-body-sm font-semibold text-ink">{modelName(model)}</p>
            <p className="text-label-md text-muted">{ALGORITHM_LABELS[model.algorithm]}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'dataset',
      header: 'Dataset',
      render: (model) => (
        <span className="block max-w-[220px] truncate text-label-lg">{model.datasetName ?? `Dataset ${model.datasetId}`}</span>
      ),
    },
    {
      key: 'accuracy',
      header: 'Accuracy',
      align: 'right',
      render: (model) => <span className="font-mono text-label-lg font-semibold text-ink">{formatPercent(model.accuracy, 1)}</span>,
    },
    {
      key: 'f1',
      header: 'F1',
      align: 'right',
      render: (model) => <span className="font-mono text-label-lg">{formatPercent(model.f1Score, 1)}</span>,
    },
    {
      key: 'roc',
      header: 'ROC AUC',
      align: 'right',
      render: (model) => <span className="font-mono text-label-lg">{formatPercent(model.rocAuc ?? 0, 1)}</span>,
    },
    {
      key: 'trained',
      header: 'Trained',
      render: (model) => <span className="whitespace-nowrap">{formatDate(model.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (model) =>
        model.isActive ? (
          <Chip tone="success" icon="verified">
            Active
          </Chip>
        ) : (
          <Chip tone={statusTone(model.trainingStatus)}>{model.trainingStatus ?? 'Ready'}</Chip>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (model) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setMetricsTarget(model)}
            className="rounded-pill px-2.5 py-1 text-label-md font-semibold text-brand transition hover:bg-mint/40"
          >
            Metrics
          </button>
          {!model.isActive ? (
            <button
              type="button"
              onClick={() => setActivateTarget(model)}
              className="rounded-pill px-2.5 py-1 text-label-md font-semibold text-on-surface-variant transition hover:bg-surface-container"
            >
              Activate
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin console"
        title="Model registry"
        description="Compare trained versions, inspect evaluation metrics, and promote a challenger to production."
        actions={
          <Link to="/admin/models/train" className={buttonClasses('primary', 'md')}>
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              model_training
            </span>
            Train model
          </Link>
        }
      />
      <AdminTabs />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Model versions" value={items.length} icon="layers" hint="All algorithms" />
        <StatCard
          label="Active accuracy"
          value={activeModel ? formatPercent(activeModel.accuracy, 1) : '—'}
          icon="verified"
          tone="brand"
          hint={activeModel ? modelName(activeModel) : 'No active model'}
        />
        <StatCard label="Best F1" value={formatPercent(bestF1, 1)} icon="emoji_events" tone="gold" hint="Across all versions" />
        <StatCard
          label="Last trained"
          value={latest ? formatDate(latest.createdAt) : '—'}
          icon="schedule"
          tone="neutral"
          hint={latest ? modelName(latest) : 'No models yet'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-headline-sm font-semibold text-ink">Version comparison</h2>
              <p className="mt-1 text-body-sm text-muted">Accuracy and F1 score by model version.</p>
            </div>
            <Chip tone="neutral" icon="compare_arrows">
              {items.length} versions
            </Chip>
          </div>
          <div className="mt-4">
            <ModelComparisonChart models={items} />
          </div>
        </Card>

        <Card>
          <h2 className="text-headline-sm font-semibold text-ink">Production model</h2>
          {activeModel ? (
            <div className="mt-4">
              <div className="rounded-xl border border-brand/20 bg-mint/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-label-md font-semibold uppercase tracking-[0.1em] text-brand">
                    {ALGORITHM_LABELS[activeModel.algorithm]}
                  </p>
                  <Chip tone="success">Active</Chip>
                </div>
                <p className="mt-1 text-headline-sm font-bold text-ink">{modelName(activeModel)}</p>
                <p className="mt-1 truncate text-label-md text-muted">{activeModel.datasetName}</p>
              </div>
              <dl className="mt-4 space-y-2.5 text-body-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Accuracy</dt>
                  <dd className="font-semibold text-ink">{formatPercent(activeModel.accuracy, 1)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">F1 score</dt>
                  <dd className="font-semibold text-ink">{formatPercent(activeModel.f1Score, 1)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">ROC AUC</dt>
                  <dd className="font-semibold text-ink">{formatPercent(activeModel.rocAuc ?? 0, 1)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Promoted</dt>
                  <dd className="font-semibold text-ink">{formatDate(activeModel.createdAt)}</dd>
                </div>
              </dl>
              <PillButton variant="secondary" size="sm" fullWidth className="mt-4" onClick={() => setMetricsTarget(activeModel)} icon="analytics">
                View full metrics
              </PillButton>
            </div>
          ) : (
            <p className="mt-4 text-body-sm text-muted">No active model. Promote a trained version to start scoring campaigns.</p>
          )}
        </Card>
      </div>

      <div className="mt-8">
        {items.length === 0 && !isLoading ? (
          <EmptyState
            icon="model_training"
            title="No models trained yet"
            description="Choose a dataset and algorithm, set the hyperparameters, and train your first challenger."
            action={
              <Link to="/admin/models/train" className={buttonClasses('primary', 'md')}>
                Train a model
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(model) => model.versionId}
            loading={isLoading}
            emptyTitle="No models trained yet"
          />
        )}
      </div>

      <Modal
        open={Boolean(metricsTarget)}
        onClose={() => setMetricsTarget(null)}
        title={metricsTarget ? `Metrics · ${modelName(metricsTarget)}` : 'Model metrics'}
        description={metricsTarget ? `${ALGORITHM_LABELS[metricsTarget.algorithm]} · ${metricsTarget.datasetName ?? `Dataset ${metricsTarget.datasetId}`}` : undefined}
        size="lg"
        footer={
          <PillButton variant="secondary" onClick={() => setMetricsTarget(null)}>
            Close
          </PillButton>
        }
      >
        {metricsLoading || !metrics ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-card" />
            <Skeleton className="h-40 w-full rounded-card" />
            <Skeleton className="h-40 w-full rounded-card" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ['Accuracy', metrics.accuracy],
                ['F1 score', metrics.f1Score],
                ['Precision', metrics.precision],
                ['Recall', metrics.recall],
                ['ROC AUC', metrics.rocAuc ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-line/40 bg-surface-low/60 px-3 py-2.5">
                  <p className="text-label-md text-muted">{label}</p>
                  <p className="mt-1 font-mono text-body-md font-semibold text-ink">{formatPercent(Number(value), 1)}</p>
                </div>
              ))}
              <div className="rounded-xl border border-line/40 bg-surface-low/60 px-3 py-2.5">
                <p className="text-label-md text-muted">Evaluated</p>
                <p className="mt-1 text-label-lg font-semibold text-ink">{formatDateTime(metrics.evaluatedAt)}</p>
              </div>
            </div>

            {metrics.confusionMatrix ? (
              <div>
                <h3 className="text-body-md font-semibold text-ink">Confusion matrix</h3>
                <p className="mt-1 text-label-md text-muted">10,000 held-out campaign records.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ['True positive', metrics.confusionMatrix.truePositive, 'bg-mint/40 text-brand'],
                    ['False positive', metrics.confusionMatrix.falsePositive, 'bg-gold-soft text-[#6b4e12]'],
                    ['False negative', metrics.confusionMatrix.falseNegative, 'bg-error-container/60 text-danger'],
                    ['True negative', metrics.confusionMatrix.trueNegative, 'bg-surface-container text-on-surface-variant'],
                  ].map(([label, value, tone]) => (
                    <div key={String(label)} className={`rounded-xl px-3 py-3 ${tone}`}>
                      <p className="text-label-md font-semibold">{label}</p>
                      <p className="mt-1 font-mono text-body-md font-bold">{formatNumber(Number(value))}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {metrics.featureImportance?.length ? (
              <div>
                <h3 className="text-body-md font-semibold text-ink">Feature importance</h3>
                <div className="mt-3 space-y-3">
                  {metrics.featureImportance.slice(0, 8).map((feature) => (
                    <ProgressBar
                      key={feature.feature}
                      label={feature.feature.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}
                      value={toPercentPoints(feature.importance)}
                      showValue
                      size="sm"
                      tone="brand"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(activateTarget)}
        title="Promote this model?"
        description={`${activateTarget ? modelName(activateTarget) : 'This model'} will become the active production model. Every new prediction will use it immediately.`}
        confirmLabel="Activate model"
        loading={activating}
        onClose={() => setActivateTarget(null)}
        onConfirm={() => void activate()}
      />
    </div>
  );
}
