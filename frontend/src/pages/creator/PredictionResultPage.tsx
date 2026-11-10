import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { predictionApi } from '@/api';
import {
  factorExplanation,
  formatCurrency,
  formatDateTime,
  formatPercent,
  getGoalPerDay,
  humanizeFactor,
  toPercentPoints,
  toRatio,
} from '@/lib/format';
import { getApiErrorMessage } from '@/lib/api';
import { CampaignArtwork } from '@/components/campaign/CampaignArtwork';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { PillButton, buttonClasses } from '@/components/ui/PillButton';
import { ProbabilityGauge } from '@/components/ui/ProbabilityGauge';
import { FactorBarChart } from '@/components/ui/FactorBarChart';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export function PredictionResultPage() {
  const { predictionId } = useParams();
  const id = Number(predictionId);
  const { data: prediction, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['prediction', id],
    queryFn: () => predictionApi.get(id),
    enabled: Number.isFinite(id),
  });

  if (!Number.isFinite(id)) {
    return (
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState icon="search_off" title="Prediction not found" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="mb-8 h-10 w-2/3" />
        <Skeleton className="h-72 w-full rounded-panel" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-card" />
          <Skeleton className="h-80 w-full rounded-card" />
        </div>
      </div>
    );
  }

  if (isError || !prediction) {
    return (
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          icon="cloud_off"
          title="We could not load this prediction"
          description={getApiErrorMessage(error)}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <PillButton variant="secondary" icon="refresh" onClick={() => void refetch()}>
                Try again
              </PillButton>
              <Link to="/creator/predictions" className={buttonClasses('primary', 'md')}>
                Back to history
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const campaign = prediction.campaign;
  const probability = toRatio(prediction.probability);
  const isSuccess = prediction.label === 'Likely Success';
  const factors = Object.entries(prediction.topFactors).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  const recommendation =
    probability >= 0.7
      ? {
          tone: 'success' as const,
          icon: 'rocket_launch',
          title: 'Strong launch signal',
          body: 'The model sees a healthy funding plan. Protect the momentum by keeping the first two reward tiers simple and shipping updates early.',
          actions: [
            'Keep the early-bird tier limited so urgency stays real.',
            'Publish a production timeline with named milestones.',
            'Line up 20–30 early backers before launch day.',
          ],
        }
      : probability >= 0.5
        ? {
            tone: 'warning' as const,
            icon: 'tune',
            title: 'Promising, but tighten the plan',
            body: 'The forecast is above the midpoint, yet a few signals are holding it back. Small changes to the funding math or reward spread can move the score.',
            actions: [
              'Reduce the required daily velocity or extend the window slightly.',
              'Add a lower-priced entry reward to widen the funnel.',
              'Strengthen the pitch with proof, demos, or delivery credentials.',
            ],
          }
        : {
            tone: 'danger' as const,
            icon: 'warning',
            title: 'High-risk forecast',
            body: 'The model expects this campaign to struggle in its current shape. Rework the goal, duration, or reward structure before launch.',
            actions: [
              'Cut the funding goal or split the campaign into phases.',
              'Shorten or extend the duration into the 21–45 day corridor.',
              'Add at least one low-friction reward tier and a clearer prototype story.',
            ],
          };

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Prediction result"
        title="Forecast & explanation"
        description="A probability estimate, the factors that moved it, and what to do next."
        backTo="/creator/predictions"
        backLabel="Back to prediction history"
        actions={
          <>
            {campaign ? (
              <Link to={`/campaigns/${campaign.campaignId}`} className={buttonClasses('secondary', 'md')}>
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  visibility
                </span>
                View campaign
              </Link>
            ) : null}
            <Link to="/creator/predictions/new" className={buttonClasses('primary', 'md')}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                refresh
              </span>
              Run another
            </Link>
          </>
        }
      />

      <Card padding="none" className="overflow-hidden">
        <div className="grid lg:grid-cols-[340px_1fr]">
          <div className="flex flex-col items-center justify-center border-b border-line/40 bg-surface-low/70 px-6 py-8 lg:border-b-0 lg:border-r">
            <ProbabilityGauge probability={probability} size={210} />
            <Chip
              tone={isSuccess ? 'success' : 'danger'}
              icon={isSuccess ? 'trending_up' : 'trending_down'}
              size="md"
              className="mt-2"
            >
              {prediction.label}
            </Chip>
            <p className="mt-3 text-center text-label-md text-muted">
              Generated {formatDateTime(prediction.createdAt)}
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="gold" icon="model_training">
                {prediction.modelVersion}
              </Chip>
              <Chip tone="neutral" icon="fingerprint">
                PRED-{prediction.predictionId}
              </Chip>
            </div>
            <h2 className="mt-4 text-headline-lg font-bold tracking-[-0.015em] text-ink">
              {campaign?.title ?? 'Campaign forecast'}
            </h2>
            <p className="mt-1 text-body-sm text-muted">
              {campaign?.categoryName ?? 'Campaign'} · {campaign?.country ?? 'Market'} ·{' '}
              {campaign?.creatorName ?? 'CrowdPredict creator'}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line/30 pt-5 sm:grid-cols-4">
              <div>
                <p className="text-label-md text-muted">Success probability</p>
                <p className="mt-1 text-headline-sm font-bold text-ink">{formatPercent(probability)}</p>
              </div>
              <div>
                <p className="text-label-md text-muted">Funding goal</p>
                <p className="mt-1 text-headline-sm font-bold text-ink">
                  {campaign ? formatCurrency(campaign.goalAmount) : '—'}
                </p>
              </div>
              <div>
                <p className="text-label-md text-muted">Duration</p>
                <p className="mt-1 text-headline-sm font-bold text-ink">
                  {campaign ? `${campaign.durationDays} days` : '—'}
                </p>
              </div>
              <div>
                <p className="text-label-md text-muted">Required per day</p>
                <p className="mt-1 text-headline-sm font-bold text-ink">
                  {campaign
                    ? formatCurrency(campaign.goalPerDay ?? getGoalPerDay(campaign.goalAmount, campaign.durationDays))
                    : '—'}
                </p>
              </div>
            </div>

            {campaign ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-line/40 bg-surface-low/50 p-3">
                <CampaignArtwork
                  categoryName={campaign.categoryName}
                  title={campaign.title}
                  compact
                  className="h-12 w-12 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{campaign.title}</p>
                  <p className="text-label-md text-muted">
                    {campaign.rewards.length} reward tiers · {formatCurrency(campaign.pledgedAmount ?? 0)} pledged
                  </p>
                </div>
                <Link
                  to={`/campaigns/${campaign.campaignId}`}
                  className="shrink-0 text-label-lg font-semibold text-brand hover:underline"
                >
                  Open
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-headline-sm font-semibold text-ink">Plain-language explanation</h2>
          <p className="mt-1 text-body-sm text-muted">The strongest signals behind the forecast, translated from the model.</p>
          <div className="mt-4 space-y-2.5">
            {factors.map(([key, value]) => {
              const positive = value >= 0;
              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border px-3.5 py-3',
                    positive ? 'border-brand/15 bg-mint/15' : 'border-danger/15 bg-error-container/25',
                  )}
                >
                  <span
                    className={cn(
                      'material-symbols-outlined mt-0.5 text-[20px]',
                      positive ? 'text-brand' : 'text-danger',
                    )}
                    aria-hidden="true"
                  >
                    {positive ? 'trending_up' : 'trending_down'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-body-sm font-semibold text-ink">{humanizeFactor(key)}</p>
                      <span
                        className={cn(
                          'shrink-0 font-mono text-label-md font-semibold',
                          positive ? 'text-brand' : 'text-danger',
                        )}
                      >
                        {positive ? '+' : ''}
                        {Math.round(toPercentPoints(value))} pts
                      </span>
                    </div>
                    <p className="mt-1 text-label-md text-on-surface-variant">{factorExplanation(key, value)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-headline-sm font-semibold text-ink">Factor contribution</h2>
          <p className="mt-1 text-body-sm text-muted">Percentage points added or removed from the baseline forecast.</p>
          <div className="mt-3">
            <FactorBarChart factors={prediction.topFactors} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className={cn(recommendation.tone === 'success' ? 'border-brand/25' : recommendation.tone === 'warning' ? 'border-warning/40' : 'border-danger/25')}>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                recommendation.tone === 'success'
                  ? 'bg-mint text-brand'
                  : recommendation.tone === 'warning'
                    ? 'bg-warning/15 text-[#7a5b00]'
                    : 'bg-error-container text-danger',
              )}
            >
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                {recommendation.icon}
              </span>
            </span>
            <div>
              <h2 className="text-headline-sm font-semibold text-ink">{recommendation.title}</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">{recommendation.body}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2.5 border-t border-line/30 pt-4">
            {recommendation.actions.map((action) => (
              <li key={action} className="flex items-start gap-2 text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined mt-0.5 text-[18px] text-brand" aria-hidden="true">
                  check_circle
                </span>
                {action}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="self-start bg-surface-low/60">
          <h2 className="text-headline-sm font-semibold text-ink">Campaign snapshot</h2>
          <dl className="mt-4 space-y-2.5 text-body-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Category</dt>
              <dd className="font-semibold text-ink">{campaign?.categoryName ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Market</dt>
              <dd className="font-semibold text-ink">{campaign?.country ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Reward tiers</dt>
              <dd className="font-semibold text-ink">{campaign?.rewards.length ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Pledged</dt>
              <dd className="font-semibold text-ink">{campaign ? formatCurrency(campaign.pledgedAmount ?? 0) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Backers</dt>
              <dd className="font-semibold text-ink">{campaign?.backerCount ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Model</dt>
              <dd className="font-semibold text-ink">{prediction.modelVersion}</dd>
            </div>
          </dl>
          {campaign ? (
            <Link to={`/campaigns/${campaign.campaignId}`} className={buttonClasses('secondary', 'sm', true)}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                open_in_new
              </span>
              Open campaign
            </Link>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
