import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Reward } from '@/types';
import { campaignApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  daysLeft,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  getGoalPerDay,
  initials,
} from '@/lib/format';
import { getApiErrorMessage } from '@/lib/api';
import { CampaignArtwork } from '@/components/campaign/CampaignArtwork';
import { PredictionBadge } from '@/components/campaign/PredictionBadge';
import { PledgeModal } from '@/components/campaign/PledgeModal';
import { Card } from '@/components/ui/Card';
import { Chip, statusTone } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { PillButton, buttonClasses } from '@/components/ui/PillButton';
import { ProbabilityGauge } from '@/components/ui/ProbabilityGauge';
import { FactorBarChart } from '@/components/ui/FactorBarChart';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';

export function CampaignDetailPage() {
  const { campaignId } = useParams();
  const id = Number(campaignId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pledgeOpen, setPledgeOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const { data: campaign, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignApi.get(id),
    enabled: Number.isFinite(id),
  });

  if (!Number.isFinite(id)) {
    return (
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          icon="search_off"
          title="Campaign not found"
          description="The campaign link may be incomplete."
          action={
            <Link to="/campaigns" className={buttonClasses('primary', 'md')}>
              Browse campaigns
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-4 w-32" />
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <Skeleton className="aspect-[16/9] w-full rounded-panel" />
            <Skeleton className="mt-6 h-5 w-28" />
            <Skeleton className="mt-4 h-10 w-3/4" />
            <Skeleton className="mt-4 h-4 w-1/3" />
            <div className="mt-8 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="space-y-5">
            <Skeleton className="h-64 w-full rounded-card" />
            <Skeleton className="h-72 w-full rounded-card" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          icon="cloud_off"
          title="We could not load this campaign"
          description={getApiErrorMessage(error, 'It may have been removed or is still a private draft.')}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <PillButton variant="secondary" onClick={() => void refetch()} icon="refresh">
                Try again
              </PillButton>
              <Link to="/campaigns" className={buttonClasses('primary', 'md')}>
                Browse campaigns
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const goal = campaign.goalAmount || 1;
  const pledged = campaign.pledgedAmount ?? 0;
  const pct = Math.min(100, (pledged / goal) * 100);
  const remaining = daysLeft(campaign.endsAt, campaign.durationDays, campaign.createdAt);
  const isOwner = Boolean(user && (user.role === 'admin' || campaign.creatorId === user.userId));
  const canPledge = campaign.status === 'SUBMITTED' && (remaining === undefined || remaining > 0);
  const prediction = campaign.prediction;

  function openPledge(reward: Reward | null) {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setSelectedReward(reward);
    setPledgeOpen(true);
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-1 text-label-lg font-medium text-on-surface-variant transition hover:text-brand"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          arrow_back
        </span>
        Back to campaigns
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <CampaignArtwork
            categoryName={campaign.categoryName}
            title={campaign.title}
            className="aspect-[16/9] rounded-panel border border-line/40"
          />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Chip tone="neutral" icon="category">
              {campaign.categoryName ?? 'Campaign'}
            </Chip>
            <Chip tone={statusTone(campaign.status)} icon={campaign.status === 'DRAFT' ? 'edit_note' : 'public'}>
              {campaign.status === 'DRAFT' ? 'Private draft' : 'Live campaign'}
            </Chip>
            {prediction ? (
              <PredictionBadge
                probability={prediction.probability}
                label={prediction.label}
                size="md"
                className="shadow-none"
              />
            ) : null}
          </div>

          <h1 className="mt-4 text-headline-xl-mobile font-bold tracking-[-0.02em] text-ink sm:text-headline-xl">
            {campaign.title}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-house text-label-lg font-semibold text-white">
              {initials(campaign.creatorName)}
            </span>
            <div>
              <p className="text-body-sm font-semibold text-ink">{campaign.creatorName ?? 'CrowdPredict creator'}</p>
              <p className="text-label-md text-muted">
                {campaign.creator?.organization ?? 'Independent creator'} · {campaign.country}
              </p>
            </div>
          </div>

          {campaign.status === 'DRAFT' ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-body-sm text-[#6b5200]">
              <span className="material-symbols-outlined mt-0.5 text-[20px]" aria-hidden="true">
                visibility_off
              </span>
              <p>
                This is a private draft. Only you and administrators can see it. Run a prediction or publish it from
                the creator studio when it is ready.
              </p>
            </div>
          ) : null}

          <section className="mt-8">
            <h2 className="text-headline-sm font-semibold text-ink">The pitch</h2>
            <p className="mt-3 whitespace-pre-line text-body-md leading-7 text-on-surface-variant">
              {campaign.description}
            </p>
          </section>

          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-headline-sm font-semibold text-ink">Reward tiers</h2>
                <p className="mt-1 text-body-sm text-muted">Choose a tier, or pledge any amount you like.</p>
              </div>
              <span className="text-label-md text-muted">{campaign.rewards.length} tiers</span>
            </div>
            <div className="space-y-3">
              {campaign.rewards.map((reward) => (
                <Card key={reward.rewardId} padding="sm" hover className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint/50 text-brand">
                      <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                        card_giftcard
                      </span>
                    </span>
                    <div>
                      <p className="text-label-md font-semibold uppercase tracking-[0.1em] text-brand">
                        Pledge {formatCurrency(reward.minPledge)} or more
                      </p>
                      <h3 className="mt-1 text-body-md font-semibold text-ink">{reward.title ?? 'Campaign reward'}</h3>
                      <p className="mt-1 text-body-sm text-on-surface-variant">{reward.description}</p>
                    </div>
                  </div>
                  <PillButton
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => openPledge(reward)}
                    disabled={!canPledge}
                  >
                    {canPledge ? 'Select reward' : 'Closed'}
                  </PillButton>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-headline-sm font-semibold text-ink">Campaign details</h2>
            <Card className="mt-4">
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-label-md font-semibold uppercase tracking-[0.1em] text-muted">Funding goal</dt>
                  <dd className="mt-1 text-body-md font-semibold text-ink">{formatCurrency(campaign.goalAmount)}</dd>
                </div>
                <div>
                  <dt className="text-label-md font-semibold uppercase tracking-[0.1em] text-muted">Required per day</dt>
                  <dd className="mt-1 text-body-md font-semibold text-ink">
                    {formatCurrency(campaign.goalPerDay ?? getGoalPerDay(campaign.goalAmount, campaign.durationDays))}
                  </dd>
                </div>
                <div>
                  <dt className="text-label-md font-semibold uppercase tracking-[0.1em] text-muted">Campaign window</dt>
                  <dd className="mt-1 text-body-md font-semibold text-ink">{campaign.durationDays} days</dd>
                </div>
                <div>
                  <dt className="text-label-md font-semibold uppercase tracking-[0.1em] text-muted">Market</dt>
                  <dd className="mt-1 text-body-md font-semibold text-ink">{campaign.country}</dd>
                </div>
                <div>
                  <dt className="text-label-md font-semibold uppercase tracking-[0.1em] text-muted">Launched</dt>
                  <dd className="mt-1 text-body-md font-semibold text-ink">{formatDate(campaign.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-label-md font-semibold uppercase tracking-[0.1em] text-muted">Campaign ID</dt>
                  <dd className="mt-1 font-mono text-body-sm text-on-surface-variant">CP-{campaign.campaignId}</dd>
                </div>
              </dl>
            </Card>
          </section>
        </div>

        <aside className="space-y-5 self-start lg:sticky lg:top-24">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <p className="text-headline-sm font-bold text-ink">{formatPercent(pct / 100)} funded</p>
              <Chip tone={remaining !== undefined && remaining <= 5 ? 'warning' : 'neutral'} icon="schedule">
                {remaining !== undefined ? `${remaining} days left` : `${campaign.durationDays} days`}
              </Chip>
            </div>
            <ProgressBar value={pct} className="mt-3" />
            <p className="mt-4 text-body-sm text-on-surface-variant">
              <strong className="text-headline-sm font-bold text-ink">{formatCurrency(pledged)}</strong> raised of{' '}
              {formatCurrency(campaign.goalAmount)}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 border-y border-line/30 py-4 text-center">
              <div>
                <p className="text-body-md font-semibold text-ink">{formatNumber(campaign.backerCount ?? 0)}</p>
                <p className="text-label-md text-muted">Backers</p>
              </div>
              <div>
                <p className="text-body-md font-semibold text-ink">{formatPercent(pct / 100)}</p>
                <p className="text-label-md text-muted">Funded</p>
              </div>
              <div>
                <p className="text-body-md font-semibold text-ink">{campaign.durationDays}</p>
                <p className="text-label-md text-muted">Days</p>
              </div>
            </div>
            <PillButton
              fullWidth
              size="lg"
              className="mt-5"
              icon="favorite"
              onClick={() => openPledge(null)}
              disabled={!canPledge}
            >
              {canPledge ? (user ? 'Back this campaign' : 'Sign in to pledge') : 'Campaign closed'}
            </PillButton>
            <p className="mt-3 text-center text-label-md text-muted">
              {canPledge ? 'Mock checkout records your pledge instantly.' : 'This campaign is not accepting pledges.'}
            </p>
          </Card>

          {isOwner ? (
            <Card padding="sm" className="bg-surface-low/70">
              <p className="mb-3 text-label-md font-semibold uppercase tracking-[0.1em] text-muted">Creator actions</p>
              <div className="grid gap-2">
                <Link
                  to={`/creator/campaigns/${campaign.campaignId}/edit`}
                  className={buttonClasses('secondary', 'sm', true)}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    edit
                  </span>
                  Edit campaign
                </Link>
                <Link
                  to={`/creator/predictions/new?campaignId=${campaign.campaignId}`}
                  className={buttonClasses('primary', 'sm', true)}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    auto_awesome
                  </span>
                  {prediction ? 'Run prediction again' : 'Run prediction'}
                </Link>
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-headline-sm font-semibold text-ink">Model signal</h2>
              {prediction ? <Chip tone="gold" icon="auto_awesome">AI forecast</Chip> : null}
            </div>
            {prediction ? (
              <>
                <div className="mt-4 flex flex-col items-center">
                  <ProbabilityGauge probability={prediction.probability} size={170} label="Success forecast" />
                  <Chip
                    tone={prediction.label === 'Likely Success' ? 'success' : 'danger'}
                    className="mt-2"
                    icon={prediction.label === 'Likely Success' ? 'trending_up' : 'trending_down'}
                  >
                    {prediction.label}
                  </Chip>
                  <p className="mt-2 text-center text-label-md text-muted">
                    {prediction.modelVersion} · {formatDateTime(prediction.createdAt)}
                  </p>
                </div>
                <div className="mt-5 border-t border-line/30 pt-5">
                  <h3 className="text-label-lg font-semibold text-ink">What is driving this score</h3>
                  <p className="mb-2 mt-1 text-label-md text-muted">Top contributing factors, in percentage points.</p>
                  <FactorBarChart factors={prediction.topFactors} />
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-line/70 bg-surface-low/60 px-4 py-8 text-center">
                <span className="material-symbols-outlined text-[28px] text-outline" aria-hidden="true">
                  query_stats
                </span>
                <p className="mt-2 text-body-sm font-semibold text-ink">No prediction yet</p>
                <p className="mt-1 text-label-md text-muted">
                  {isOwner
                    ? 'Run the model from the creator studio to add a success forecast here.'
                    : 'The creator has not evaluated this campaign yet.'}
                </p>
              </div>
            )}
          </Card>
        </aside>
      </div>

      <PledgeModal
        open={pledgeOpen}
        onClose={() => setPledgeOpen(false)}
        campaign={campaign}
        reward={selectedReward}
      />
    </div>
  );
}
