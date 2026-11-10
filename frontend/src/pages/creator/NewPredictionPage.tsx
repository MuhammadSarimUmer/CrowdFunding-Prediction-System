import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Campaign } from '@/types';
import { campaignApi, predictionApi } from '@/api';
import { getApiErrorMessage } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency, formatDate, getGoalPerDay } from '@/lib/format';
import { CampaignArtwork } from '@/components/campaign/CampaignArtwork';
import { PredictionBadge } from '@/components/campaign/PredictionBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Chip, statusTone } from '@/components/ui/Chip';
import { PillButton, buttonClasses } from '@/components/ui/PillButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

const STEPS = [
  { key: 1, label: 'Choose campaign', icon: 'campaign' },
  { key: 2, label: 'Confirm signals', icon: 'fact_check' },
  { key: 3, label: 'Analyze', icon: 'auto_awesome' },
];

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/25 py-2.5 last:border-0">
      <dt className="text-body-sm text-muted">{label}</dt>
      <dd className="text-right text-body-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function CampaignOption({
  campaign,
  selected,
  onSelect,
}: {
  campaign: Campaign;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-3 rounded-card border p-3 text-left transition-all duration-150',
        selected
          ? 'border-brand bg-mint/25 ring-2 ring-brand/15'
          : 'border-line/50 bg-white hover:border-brand/40 hover:bg-surface-low',
      )}
    >
      <CampaignArtwork
        categoryName={campaign.categoryName}
        title={campaign.title}
        compact
        className="h-14 w-14 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-semibold text-ink">{campaign.title}</p>
        <p className="text-label-md text-muted">
          {formatCurrency(campaign.goalAmount)} · {campaign.durationDays} days · {campaign.categoryName}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Chip tone={statusTone(campaign.status)}>{campaign.status === 'DRAFT' ? 'Draft' : 'Live'}</Chip>
        {campaign.prediction ? <PredictionBadge probability={campaign.prediction.probability} /> : null}
      </div>
    </button>
  );
}

export function NewPredictionPage() {
  const [searchParams] = useSearchParams();
  const initialCampaignId = Number(searchParams.get('campaignId')) || 0;
  const [selectedId, setSelectedId] = useState(initialCampaignId);
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success } = useToast();

  const { data: mine, isLoading: mineLoading } = useQuery({
    queryKey: ['campaigns', 'mine'],
    queryFn: campaignApi.mine,
  });

  const {
    data: campaign,
    isLoading: campaignLoading,
    isError: campaignError,
  } = useQuery({
    queryKey: ['campaign', selectedId],
    queryFn: () => campaignApi.get(selectedId),
    enabled: selectedId > 0,
  });

  const campaigns = useMemo(() => mine?.items ?? [], [mine]);
  const selected = campaign ?? campaigns.find((item) => item.campaignId === selectedId);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    },
    [],
  );

  const progressLabel =
    progress < 30 ? 'Preparing campaign features' : progress < 70 ? 'Running the active production model' : 'Explaining the top factors';

  async function runPrediction() {
    if (!selectedId) return;
    setStep(3);
    setProgress(6);
    setError(null);
    timerRef.current = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + 4 + Math.random() * 7));
    }, 260);
    try {
      const prediction = await predictionApi.create(selectedId);
      setProgress(100);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['predictions'] }),
        queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign', selectedId] }),
      ]);
      success('Prediction generated.');
      await new Promise((resolve) => setTimeout(resolve, 550));
      navigate(`/creator/predictions/${prediction.predictionId}`);
    } catch (runError) {
      setError(getApiErrorMessage(runError, 'The model could not score this campaign.'));
      setStep(2);
    } finally {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  if (selectedId > 0 && campaignLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="mb-8 h-10 w-2/3" />
        <Skeleton className="h-80 w-full rounded-card" />
      </div>
    );
  }

  if (selectedId > 0 && campaignError) {
    return (
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          icon="search_off"
          title="Campaign not found"
          description="Choose one of your campaigns to evaluate instead."
          action={
            <PillButton variant="secondary" onClick={() => { setSelectedId(0); setStep(1); }}>
              Choose another campaign
            </PillButton>
          }
        />
      </div>
    );
  }

  if (!mineLoading && campaigns.length === 0) {
    return (
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Prediction engine"
          title="Run a prediction"
          description="Create a campaign first, then score it with the production model."
          backTo="/creator/campaigns"
          backLabel="Back to campaigns"
        />
        <EmptyState
          icon="campaign"
          title="No campaigns to evaluate"
          description="Draft a campaign with a goal, duration, and reward tiers, then come back to run the model."
          action={
            <Link to="/creator/campaigns/new" className={buttonClasses('primary', 'md')}>
              Create a campaign
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Prediction engine"
        title="Run a prediction"
        description="Review the campaign signals, confirm the model, and generate a probability forecast with an explanation."
        backTo="/creator/predictions"
        backLabel="Back to prediction history"
      />

      <ol className="mb-8 grid gap-2 sm:grid-cols-3" aria-label="Prediction steps">
        {STEPS.map((item) => {
          const active = step === item.key;
          const complete = step > item.key;
          return (
            <li
              key={item.key}
              className={cn(
                'flex items-center gap-3 rounded-card border px-4 py-3',
                active ? 'border-brand bg-mint/25' : complete ? 'border-brand/20 bg-white' : 'border-line/40 bg-white/60',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-label-md font-semibold',
                  active ? 'bg-brand text-white' : complete ? 'bg-mint text-brand' : 'bg-surface-container text-muted',
                )}
              >
                {complete ? (
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    check
                  </span>
                ) : (
                  item.key
                )}
              </span>
              <div>
                <p className={cn('text-label-lg font-semibold', active ? 'text-brand' : 'text-ink')}>{item.label}</p>
                <p className="text-label-md text-muted">Step {item.key} of 3</p>
              </div>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-danger/20 bg-error-container/50 px-4 py-3 text-body-sm text-danger" role="alert">
          <span className="material-symbols-outlined mt-0.5 text-[18px]" aria-hidden="true">
            error
          </span>
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <h2 className="text-headline-sm font-semibold text-ink">Choose a campaign</h2>
            <p className="mt-1 text-body-sm text-muted">Drafts and live campaigns can both be evaluated.</p>
            {mineLoading ? (
              <div className="mt-5 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-card" />
                ))}
              </div>
            ) : (
              <div className="mt-5 max-h-[440px] space-y-2 overflow-y-auto pr-1">
                {campaigns.map((item) => (
                  <CampaignOption
                    key={item.campaignId}
                    campaign={item}
                    selected={selectedId === item.campaignId}
                    onSelect={() => setSelectedId(item.campaignId)}
                  />
                ))}
              </div>
            )}
            <div className="mt-5 flex justify-end border-t border-line/30 pt-4">
              <PillButton
                disabled={!selected}
                onClick={() => setStep(2)}
                iconRight="arrow_forward"
              >
                Continue
              </PillButton>
            </div>
          </Card>
          <Card className="self-start bg-surface-low/60">
            <h3 className="text-label-lg font-semibold text-ink">How it works</h3>
            <ul className="mt-3 space-y-3 text-body-sm text-on-surface-variant">
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[18px] text-brand" aria-hidden="true">
                  check_circle
                </span>
                The model reads funding goal, duration, reward spread, and pitch depth.
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[18px] text-brand" aria-hidden="true">
                  check_circle
                </span>
                You get a success probability, a label, and the top contributing factors.
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[18px] text-brand" aria-hidden="true">
                  check_circle
                </span>
                Draft campaigns are published to the marketplace after the forecast is generated.
              </li>
            </ul>
          </Card>
        </div>
      ) : null}

      {step === 2 && selected ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <CampaignArtwork
                    categoryName={selected.categoryName}
                    title={selected.title}
                    compact
                    className="h-16 w-16 shrink-0 rounded-xl"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={statusTone(selected.status)}>{selected.status === 'DRAFT' ? 'Draft' : 'Live'}</Chip>
                      {selected.prediction ? (
                        <PredictionBadge probability={selected.prediction.probability} label={selected.prediction.label} />
                      ) : null}
                    </div>
                    <h2 className="mt-2 text-headline-sm font-semibold text-ink">{selected.title}</h2>
                    <p className="mt-1 text-body-sm text-muted">
                      {selected.categoryName} · {selected.country} · created {formatDate(selected.createdAt)}
                    </p>
                  </div>
                </div>
                <PillButton variant="ghost" size="sm" onClick={() => setStep(1)} icon="swap_horiz">
                  Change
                </PillButton>
              </div>

              <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">
                <SignalRow label="Funding goal" value={formatCurrency(selected.goalAmount)} />
                <SignalRow
                  label="Required per day"
                  value={formatCurrency(selected.goalPerDay ?? getGoalPerDay(selected.goalAmount, selected.durationDays))}
                />
                <SignalRow label="Duration" value={`${selected.durationDays} days`} />
                <SignalRow label="Reward tiers" value={`${selected.rewards.length} tiers`} />
                <SignalRow label="Pitch length" value={`${selected.description.trim().length} characters`} />
                <SignalRow label="Market" value={selected.country} />
              </dl>
            </Card>

            <Card>
              <h2 className="text-headline-sm font-semibold text-ink">Confirm the model</h2>
              <p className="mt-1 text-body-sm text-muted">
                The production model is selected automatically. You cannot change it from the creator workspace.
              </p>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-brand/20 bg-mint/25 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      model_training
                    </span>
                  </span>
                  <div>
                    <p className="text-body-sm font-semibold text-ink">
                      {selected.prediction?.modelVersion ?? 'RandomForest v3'}
                    </p>
                    <p className="text-label-md text-muted">Active production model · read-only</p>
                  </div>
                </div>
                <Chip tone="success" icon="verified">
                  Active
                </Chip>
              </div>
              <div className="mt-4 rounded-xl bg-surface-low px-4 py-3 text-label-md text-muted">
                <p className="flex items-start gap-2">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] text-brand" aria-hidden="true">
                    info
                  </span>
                  {selected.status === 'DRAFT'
                    ? 'This draft will be published to the marketplace when the prediction completes.'
                    : 'A new prediction will be added to this campaign and the latest forecast will be shown publicly.'}
                </p>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <PillButton variant="ghost" onClick={() => setStep(1)}>
                  Back
                </PillButton>
                <PillButton onClick={() => void runPrediction()} icon="auto_awesome" loading={false}>
                  Run prediction
                </PillButton>
              </div>
            </Card>
          </div>

          <Card className="self-start bg-surface-low/60">
            <h3 className="text-label-lg font-semibold text-ink">Signal checklist</h3>
            <ul className="mt-3 space-y-2.5 text-body-sm text-on-surface-variant">
              {[
                ['Goal math', formatCurrency(selected.goalAmount)],
                ['Duration', `${selected.durationDays} days`],
                ['Reward spread', `${selected.rewards.length} tiers`],
                ['Pitch depth', `${selected.description.trim().length} chars`],
                ['Category', selected.categoryName ?? '—'],
                ['Market', selected.country],
              ].map(([label, value]) => (
                <li key={label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-brand" aria-hidden="true">
                      check_circle
                    </span>
                    {label}
                  </span>
                  <span className="font-semibold text-ink">{value}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-line/30 pt-4">
              <p className="text-label-md text-muted">Estimated run time</p>
              <p className="mt-1 text-body-md font-semibold text-ink">Under 10 seconds</p>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 3 ? (
        <Card className="mx-auto max-w-2xl">
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mint/60 text-brand">
              <span className="material-symbols-outlined animate-pulse text-[32px]" aria-hidden="true">
                auto_awesome
              </span>
            </span>
            <h2 className="mt-4 text-headline-sm font-semibold text-ink">Analyzing your campaign</h2>
            <p className="mt-1 max-w-md text-body-sm text-muted">
              The model is scoring {selected?.title ?? 'your campaign'} and preparing a plain-language explanation.
            </p>
            <div className="mt-6 w-full max-w-md">
              <ProgressBar value={progress} showValue label={progressLabel} />
            </div>
            <ul className="mt-6 w-full max-w-md space-y-2 text-left">
              {['Preparing campaign features', 'Running the active production model', 'Explaining the top factors'].map(
                (label, index) => {
                  const threshold = index === 0 ? 1 : index === 1 ? 30 : 70;
                  const complete = progress >= threshold;
                  return (
                    <li key={label} className="flex items-center gap-2 text-body-sm">
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
                },
              )}
            </ul>
            <p className="mt-6 text-label-md text-muted">Keep this tab open. You will be redirected to the result.</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
