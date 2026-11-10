import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ModelAlgorithm, ModelVersion } from '@/types';
import { adminApi } from '@/api';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/lib/api';
import {
  ALGORITHM_DESCRIPTIONS,
  ALGORITHM_HYPERPARAMETERS,
  ALGORITHM_LABELS,
} from '@/lib/constants';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Select, FloatingLabelInput } from '@/components/ui/Field';
import { PillButton, buttonClasses } from '@/components/ui/PillButton';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/cn';

const ALGORITHMS: Array<{ value: ModelAlgorithm; icon: string; recommended?: boolean }> = [
  { value: 'RandomForest', icon: 'forest', recommended: true },
  { value: 'XGBoost', icon: 'bolt' },
  { value: 'LogisticRegression', icon: 'functions' },
];

function defaultsFor(algorithm: ModelAlgorithm): Record<string, number> {
  return Object.fromEntries(
    ALGORITHM_HYPERPARAMETERS[algorithm].map((field) => [field.name, field.defaultValue]),
  );
}

export function AdminTrainPage() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [algorithm, setAlgorithm] = useState<ModelAlgorithm>('RandomForest');
  const [datasetId, setDatasetId] = useState(0);
  const [hyperparameters, setHyperparameters] = useState<Record<string, number>>(() => defaultsFor('RandomForest'));
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [trainedModel, setTrainedModel] = useState<ModelVersion | null>(null);
  const [activating, setActivating] = useState(false);

  const { data: datasets, isLoading: datasetsLoading } = useQuery({
    queryKey: ['admin', 'datasets'],
    queryFn: adminApi.datasets,
  });

  useEffect(() => {
    if (datasetId === 0 && datasets && datasets.length > 0) {
      setDatasetId(datasets[0].datasetId);
    }
  }, [datasets, datasetId]);

  const selectedDataset = useMemo(
    () => datasets?.find((dataset) => dataset.datasetId === datasetId),
    [datasets, datasetId],
  );

  const fields = ALGORITHM_HYPERPARAMETERS[algorithm];
  const progressLabel =
    progress < 25 ? 'Validating dataset and features' : progress < 75 ? 'Fitting model weights' : 'Evaluating held-out metrics';

  function chooseAlgorithm(next: ModelAlgorithm) {
    if (training) return;
    setAlgorithm(next);
    setHyperparameters(defaultsFor(next));
  }

  function updateHyperparameter(name: string, value: number) {
    setHyperparameters((current) => ({ ...current, [name]: value }));
  }

  async function train() {
    if (!datasetId || !selectedDataset) {
      toastError('Choose a dataset before training.');
      return;
    }
    for (const field of fields) {
      const value = Number(hyperparameters[field.name]);
      if (!Number.isFinite(value) || value < field.min || value > field.max) {
        toastError(`${field.label} must be between ${field.min} and ${field.max}.`);
        return;
      }
    }
    setTraining(true);
    setTrainedModel(null);
    setProgress(5);
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + 4 + Math.random() * 6));
    }, 260);
    try {
      const model = await adminApi.train({ algorithm, datasetId, hyperparameters });
      setProgress(100);
      setTrainedModel(model);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'models'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ]);
      success(`${model.name ?? 'Model'} trained successfully.`);
    } catch (trainError) {
      toastError(getApiErrorMessage(trainError, 'The model could not be trained.'));
    } finally {
      window.clearInterval(timer);
      setTraining(false);
    }
  }

  async function activateTrained() {
    if (!trainedModel) return;
    setActivating(true);
    try {
      await adminApi.activate(trainedModel.versionId);
      setTrainedModel({ ...trainedModel, isActive: true });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'models'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ]);
      success('The new model is now active in production.');
    } catch (activateError) {
      toastError(getApiErrorMessage(activateError, 'Unable to activate this model.'));
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin console"
        title="Train a model"
        description="Pick an algorithm and dataset, tune the hyperparameters, and promote a challenger when it beats the incumbent."
        backTo="/admin/models"
        backLabel="Back to model registry"
      />
      <AdminTabs />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <div className="mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-brand" aria-hidden="true">
                schema
              </span>
              <h2 className="text-headline-sm font-semibold text-ink">Choose an algorithm</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Algorithm">
              {ALGORITHMS.map((item) => {
                const active = algorithm === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseAlgorithm(item.value)}
                    disabled={training}
                    className={cn(
                      'relative rounded-xl border p-4 text-left transition-all duration-150 disabled:opacity-60',
                      active
                        ? 'border-brand bg-mint/25 ring-2 ring-brand/15'
                        : 'border-line/60 bg-white hover:border-brand/40 hover:bg-surface-low',
                    )}
                  >
                    {item.recommended ? (
                      <span className="absolute right-2.5 top-2.5 rounded-pill bg-gold-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b4e12]">
                        Recommended
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'material-symbols-outlined mb-2 flex h-9 w-9 items-center justify-center rounded-full text-[20px]',
                        active ? 'bg-brand text-white' : 'bg-surface-container text-on-surface-variant',
                      )}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <p className="text-label-lg font-semibold text-ink">{ALGORITHM_LABELS[item.value]}</p>
                    <p className="mt-1 text-label-md text-muted">{ALGORITHM_DESCRIPTIONS[item.value]}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-brand" aria-hidden="true">
                database
              </span>
              <h2 className="text-headline-sm font-semibold text-ink">Dataset</h2>
            </div>
            <Select
              label="Training dataset"
              value={datasetId}
              onChange={(event) => setDatasetId(Number(event.target.value))}
              disabled={training || datasetsLoading}
            >
              {datasetsLoading ? <option value={0}>Loading datasets…</option> : null}
              {!datasetsLoading && (datasets ?? []).length === 0 ? <option value={0}>No datasets available</option> : null}
              {(datasets ?? []).map((dataset) => (
                <option key={dataset.datasetId} value={dataset.datasetId}>
                  {dataset.fileName} · {formatNumber(dataset.rowCount)} rows
                </option>
              ))}
            </Select>

            {selectedDataset ? (
              <div className="mt-4 grid gap-3 rounded-xl border border-line/40 bg-surface-low/60 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-label-md text-muted">Rows</p>
                  <p className="mt-1 text-body-sm font-semibold text-ink">{formatNumber(selectedDataset.rowCount)}</p>
                </div>
                <div>
                  <p className="text-label-md text-muted">Features</p>
                  <p className="mt-1 text-body-sm font-semibold text-ink">{selectedDataset.features ?? 18}</p>
                </div>
                <div>
                  <p className="text-label-md text-muted">Uploaded</p>
                  <p className="mt-1 text-body-sm font-semibold text-ink">{formatDate(selectedDataset.uploadedAt)}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-line/70 bg-surface-low/50 px-4 py-3">
                <p className="text-body-sm text-muted">No dataset selected. Upload one to continue.</p>
                <Link to="/admin/datasets" className="shrink-0 text-label-lg font-semibold text-brand hover:underline">
                  Upload dataset
                </Link>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-brand" aria-hidden="true">
                tune
              </span>
              <h2 className="text-headline-sm font-semibold text-ink">Hyperparameters</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <FloatingLabelInput
                  key={`${algorithm}-${field.name}`}
                  label={field.label}
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={hyperparameters[field.name] ?? field.defaultValue}
                  onChange={(event) => updateHyperparameter(field.name, Number(event.target.value))}
                  hint={field.helper}
                  disabled={training}
                />
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-surface-low px-4 py-3 text-label-md text-muted">
              <p className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-[18px] text-brand" aria-hidden="true">
                  info
                </span>
                The mock adapter generates deterministic metrics from the dataset size and hyperparameters. A real
                backend would enqueue an asynchronous training job here.
              </p>
            </div>
          </Card>
        </div>

        <aside className="space-y-5 self-start lg:sticky lg:top-24">
          <Card>
            <h2 className="text-headline-sm font-semibold text-ink">Training summary</h2>
            <dl className="mt-4 space-y-2.5 text-body-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Algorithm</dt>
                <dd className="font-semibold text-ink">{ALGORITHM_LABELS[algorithm]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Dataset</dt>
                <dd className="max-w-[180px] truncate text-right font-semibold text-ink">
                  {selectedDataset?.fileName ?? 'Not selected'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Rows</dt>
                <dd className="font-semibold text-ink">
                  {selectedDataset ? formatNumber(selectedDataset.rowCount) : '—'}
                </dd>
              </div>
              {fields.map((field) => (
                <div key={field.name} className="flex justify-between gap-3">
                  <dt className="text-muted">{field.label}</dt>
                  <dd className="font-mono text-label-lg font-semibold text-ink">
                    {hyperparameters[field.name] ?? field.defaultValue}
                  </dd>
                </div>
              ))}
            </dl>

            {training ? (
              <div className="mt-5 border-t border-line/30 pt-4">
                <ProgressBar value={progress} showValue label={progressLabel} />
                <ul className="mt-4 space-y-2">
                  {['Validating dataset', 'Fitting model', 'Evaluating metrics'].map((label, index) => {
                    const threshold = index === 0 ? 1 : index === 1 ? 25 : 75;
                    const complete = progress >= threshold;
                    return (
                      <li key={label} className="flex items-center gap-2 text-label-lg">
                        <span
                          className={cn(
                            'material-symbols-outlined text-[18px]',
                            complete ? 'text-brand' : 'text-outline',
                          )}
                          aria-hidden="true"
                        >
                          {complete ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span className={complete ? 'text-ink' : 'text-muted'}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <PillButton
                fullWidth
                size="lg"
                className="mt-5"
                icon="play_arrow"
                onClick={() => void train()}
                disabled={!selectedDataset || datasetsLoading}
              >
                Train model
              </PillButton>
            )}
            <p className="mt-3 text-center text-label-md text-muted">
              Training is simulated in mock mode and completes in a few seconds.
            </p>
          </Card>

          {trainedModel ? (
            <Card className="border-brand/25">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-brand">
                  <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                    check_circle
                  </span>
                </span>
                <div>
                  <h2 className="text-body-md font-semibold text-ink">{trainedModel.name ?? 'New model'}</h2>
                  <p className="text-label-md text-muted">Training complete</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-low px-3 py-2">
                  <p className="text-label-md text-muted">Accuracy</p>
                  <p className="mt-1 font-mono text-body-md font-semibold text-ink">{formatPercent(trainedModel.accuracy, 1)}</p>
                </div>
                <div className="rounded-xl bg-surface-low px-3 py-2">
                  <p className="text-label-md text-muted">F1 score</p>
                  <p className="mt-1 font-mono text-body-md font-semibold text-ink">{formatPercent(trainedModel.f1Score, 1)}</p>
                </div>
                <div className="rounded-xl bg-surface-low px-3 py-2">
                  <p className="text-label-md text-muted">Precision</p>
                  <p className="mt-1 font-mono text-body-md font-semibold text-ink">{formatPercent(trainedModel.precision ?? 0, 1)}</p>
                </div>
                <div className="rounded-xl bg-surface-low px-3 py-2">
                  <p className="text-label-md text-muted">ROC AUC</p>
                  <p className="mt-1 font-mono text-body-md font-semibold text-ink">{formatPercent(trainedModel.rocAuc ?? 0, 1)}</p>
                </div>
              </div>
              {trainedModel.isActive ? (
                <Chip tone="success" icon="verified" className="mt-4">
                  Active in production
                </Chip>
              ) : (
                <div className="mt-4 grid gap-2">
                  <PillButton
                    fullWidth
                    size="sm"
                    icon="verified"
                    onClick={() => void activateTrained()}
                    loading={activating}
                  >
                    Activate this model
                  </PillButton>
                  <Link to="/admin/models" className={buttonClasses('secondary', 'sm', true)}>
                    Review in registry
                  </Link>
                </div>
              )}
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
