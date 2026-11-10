import { Link } from 'react-router-dom';
import type { Campaign } from '@/types';
import { daysLeft, formatCompactCurrency, formatNumber, formatPercent } from '@/lib/format';
import { CampaignArtwork } from './CampaignArtwork';
import { PredictionBadge } from './PredictionBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const goal = campaign.goalAmount || 1;
  const pledged = campaign.pledgedAmount ?? 0;
  const pct = Math.min(100, (pledged / goal) * 100);
  const remaining = daysLeft(campaign.endsAt, campaign.durationDays, campaign.createdAt);

  return (
    <Link
      to={`/campaigns/${campaign.campaignId}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line/40 bg-card shadow-paper transition-all duration-200 ease-press hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
    >
      <div className="relative">
        <CampaignArtwork categoryName={campaign.categoryName} title={campaign.title} className="aspect-[16/9]" />
        {campaign.prediction ? (
          <div className="absolute right-3 top-3">
            <PredictionBadge probability={campaign.prediction.probability} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-headline-sm font-semibold tracking-[-0.01em] text-ink transition group-hover:text-brand">
          {campaign.title}
        </h3>
        <p className="mt-1 text-label-md text-muted">by {campaign.creatorName ?? 'CrowdPredict creator'}</p>
        <p className="mt-3 line-clamp-2 text-body-sm text-on-surface-variant">{campaign.description}</p>

        <div className="mt-auto pt-5">
          <ProgressBar value={pct} size="sm" />
          <div className="mt-2 flex items-center justify-between gap-3 text-label-md">
            <span className="text-on-surface-variant">
              <strong className="font-semibold text-ink">{formatCompactCurrency(pledged)}</strong> of{' '}
              {formatCompactCurrency(campaign.goalAmount)}
            </span>
            <span className="shrink-0 font-medium text-brand">{formatPercent(pct / 100)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line/30 pt-3 text-label-md text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                group
              </span>
              {formatNumber(campaign.backerCount ?? 0)} backers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                schedule
              </span>
              {remaining !== undefined ? `${remaining} days left` : `${campaign.durationDays} days`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
