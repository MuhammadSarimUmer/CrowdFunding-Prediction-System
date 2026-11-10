import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { campaignApi } from '@/api';
import type { CampaignListParams } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/lib/api';
import { COUNTRIES } from '@/lib/constants';
import { CampaignCard } from '@/components/campaign/CampaignCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { PillButton, buttonClasses } from '@/components/ui/PillButton';
import { Select } from '@/components/ui/Field';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';

const GOAL_RANGES = [
  { value: '', label: 'Any funding goal' },
  { value: '0-10000', label: 'Under $10k' },
  { value: '10000-25000', label: '$10k – $25k' },
  { value: '25000-50000', label: '$25k – $50k' },
  { value: '50000-', label: '$50k and above' },
];

interface FilterState {
  search: string;
  category: string;
  country: string;
  goal: string;
}

const INITIAL_FILTERS: FilterState = { search: '', category: '', country: '', goal: '' };

function goalRange(value: string): { minGoal?: number; maxGoal?: number } {
  if (!value) return {};
  const [min, max] = value.split('-');
  return {
    minGoal: min ? Number(min) : undefined,
    maxGoal: max ? Number(max) : undefined,
  };
}

export function BrowseCampaignsPage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);

  const params = useMemo<CampaignListParams>(
    () => ({
      search: filters.search || undefined,
      category: filters.category || undefined,
      country: filters.country || undefined,
      ...goalRange(filters.goal),
      page,
      pageSize: 9,
    }),
    [filters, page],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => campaignApi.list(params),
    placeholderData: keepPreviousData,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: campaignApi.categories,
    staleTime: 5 * 60 * 1000,
  });

  const hasFilters = Boolean(filters.search || filters.category || filters.country || filters.goal);

  function updateFilter(key: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilter('search', searchInput.trim());
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS);
    setSearchInput('');
    setPage(1);
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : (data?.page ?? 1) * (data?.pageSize ?? 9) - (data?.pageSize ?? 9) + 1;
  const end = Math.min(total, (data?.page ?? 1) * (data?.pageSize ?? 9));
  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      <section className="relative overflow-hidden bg-house text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-mint/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full border border-mint/15" aria-hidden="true" />
        <div className="relative mx-auto max-w-content px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-label-md font-semibold uppercase tracking-[0.18em] text-gold">
              Curated marketplace · {total > 0 ? `${total} live campaigns` : 'New ideas weekly'}
            </p>
            <h1 className="text-display-lg-mobile font-bold tracking-[-0.02em] sm:text-display-lg">
              Back ideas that are built to last.
            </h1>
            <p className="mt-4 max-w-2xl text-body-lg text-mint/80">
              Every campaign carries a model-backed success signal, transparent funding math, and reward tiers you can
              compare at a glance.
            </p>
          </div>

          <form onSubmit={submitSearch} className="mt-8 flex max-w-2xl flex-col gap-2 rounded-panel bg-white p-2 shadow-modal sm:flex-row">
            <div className="relative flex-1">
              <span
                className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[22px] text-outline"
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search campaigns, creators, or categories"
                aria-label="Search campaigns"
                className="h-11 w-full rounded-xl bg-transparent pl-11 pr-4 text-body-sm text-ink outline-none placeholder:text-muted focus:bg-surface-low"
              />
            </div>
            <PillButton type="submit" size="md" icon="search" className="sm:px-8">
              Search
            </PillButton>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
        <Card padding="md" className="mb-8">
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              label="Category"
              value={filters.category}
              onChange={(event) => updateFilter('category', event.target.value)}
            >
              <option value="">All categories</option>
              {(categories ?? []).map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select
              label="Market"
              value={filters.country}
              onChange={(event) => updateFilter('country', event.target.value)}
            >
              <option value="">All countries</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
            <div>
              <Select
                label="Funding goal"
                value={filters.goal}
                onChange={(event) => updateFilter('goal', event.target.value)}
              >
                {GOAL_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/30 pt-4">
            <p className="text-label-md text-muted">
              {hasFilters ? 'Filtered results are updated as you change each control.' : 'Showing every live campaign.'}
              {isFetching && !isLoading ? <span className="ml-2 text-brand">Refreshing…</span> : null}
            </p>
            {hasFilters ? (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-label-lg font-semibold text-brand hover:underline">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  filter_alt_off
                </span>
                Clear filters
              </button>
            ) : null}
          </div>
        </Card>

        {isError ? (
          <div className="rounded-card border border-danger/20 bg-error-container/40 px-6 py-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-danger" aria-hidden="true">
              cloud_off
            </span>
            <h2 className="mt-2 text-headline-sm font-semibold text-ink">We could not load campaigns</h2>
            <p className="mt-1 text-body-sm text-muted">{getApiErrorMessage(error)}</p>
            <PillButton className="mt-5" variant="secondary" onClick={() => void refetch()} icon="refresh">
              Try again
            </PillButton>
          </div>
        ) : isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="search_off"
            title="No campaigns match those filters"
            description="Try a broader search, a different category, or clear the filters to see everything."
            action={
              <PillButton variant="secondary" onClick={clearFilters} icon="filter_alt_off">
                Clear filters
              </PillButton>
            }
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((campaign) => (
                <CampaignCard key={campaign.campaignId} campaign={campaign} />
              ))}
            </div>
            <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-label-md text-muted">
                Showing {start}–{end} of {total} campaigns
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
                <span className="px-2 text-label-lg font-medium text-on-surface-variant">
                  Page {data?.page ?? page} of {totalPages}
                </span>
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
          </>
        )}

        {user?.role !== 'backer' ? (
          <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-panel border border-brand/20 bg-mint/25 px-6 py-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-headline-sm font-semibold text-ink">Have an idea worth funding?</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Draft a campaign, run it through the model, and launch with a clearer plan.
              </p>
            </div>
            <Link
              to={user ? '/creator/campaigns/new' : '/register'}
              className={buttonClasses('primary', 'md')}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                add
              </span>
              {user ? 'Start a campaign' : 'Become a creator'}
            </Link>
          </div>
        ) : null}
      </div>

      {user?.role !== 'backer' ? (
        <FloatingActionButton
          to={user ? '/creator/campaigns/new' : '/register'}
          icon="add"
          label={user ? 'New campaign' : 'Start a campaign'}
        />
      ) : null}
    </div>
  );
}
