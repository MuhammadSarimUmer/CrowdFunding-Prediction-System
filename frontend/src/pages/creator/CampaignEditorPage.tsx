import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { campaignApi } from '@/api';
import type { CampaignStatus } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api';
import { COUNTRIES } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { CampaignArtwork } from '@/components/campaign/CampaignArtwork';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { FloatingLabelInput, FloatingLabelTextarea, Select } from '@/components/ui/Field';
import { PillButton, buttonClasses } from '@/components/ui/PillButton';
import { Chip, statusTone } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

const rewardSchema = z.object({
  rewardId: z.coerce.number().optional(),
  title: z.string().optional(),
  minPledge: z.coerce.number({ invalid_type_error: 'Enter an amount.' }).min(1, 'Minimum pledge must be at least $1.'),
  description: z.string().min(10, 'Describe this reward in at least 10 characters.'),
});

const schema = z.object({
  title: z.string().min(3, 'Use at least 3 characters.').max(100, 'Keep the title under 100 characters.'),
  description: z.string().min(80, 'Write at least 80 characters so backers understand the pitch.'),
  goalAmount: z.coerce.number({ invalid_type_error: 'Enter a funding goal.' }).min(100, 'Set a goal of at least $100.'),
  durationDays: z.coerce
    .number({ invalid_type_error: 'Enter a duration.' })
    .int('Use a whole number of days.')
    .min(1, 'Run for at least 1 day.')
    .max(60, 'Campaigns cannot exceed 60 days.'),
  country: z.string().min(1, 'Choose a market country.'),
  categoryId: z.coerce.number({ invalid_type_error: 'Choose a category.' }).min(1, 'Choose a category.'),
  rewards: z.array(rewardSchema).min(1, 'Add at least one reward tier.'),
});

type FormValues = z.infer<typeof schema>;

interface CampaignEditorPageProps {
  mode: 'create' | 'edit';
}

export function CampaignEditorPage({ mode }: CampaignEditorPageProps) {
  const { campaignId } = useParams();
  const id = Number(campaignId);
  const isEdit = mode === 'edit';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [action, setAction] = useState<'draft' | 'evaluate' | null>(null);
  const loadedCampaignId = useRef<number | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: campaignApi.categories,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: campaign,
    isLoading: campaignLoading,
    isError: campaignError,
    error: campaignFetchError,
  } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignApi.get(id),
    enabled: isEdit && Number.isFinite(id),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      goalAmount: 15000,
      durationDays: 30,
      country: 'US',
      categoryId: 1,
      rewards: [{ title: 'Early bird', minPledge: 25, description: 'Describe what this reward includes.' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'rewards' });
  const watched = watch();

  useEffect(() => {
    if (campaign && loadedCampaignId.current !== campaign.campaignId) {
      loadedCampaignId.current = campaign.campaignId;
      reset({
        title: campaign.title,
        description: campaign.description,
        goalAmount: campaign.goalAmount,
        durationDays: campaign.durationDays,
        country: campaign.country,
        categoryId: campaign.categoryId,
        rewards: campaign.rewards.map((reward) => ({
          rewardId: reward.rewardId,
          title: reward.title ?? '',
          minPledge: reward.minPledge,
          description: reward.description,
        })),
      });
    }
  }, [campaign, reset]);

  const categoryName = categories?.find((category) => category.categoryId === Number(watched.categoryId))?.name;
  const goalPerDay = Number(watched.goalAmount || 0) / Math.max(1, Number(watched.durationDays || 1));

  async function persist(values: FormValues, intent: 'draft' | 'evaluate') {
    setAction(intent);
    setFormError(null);
    try {
      const status: CampaignStatus =
        intent === 'draft' && !isEdit ? 'DRAFT' : (campaign?.status ?? 'DRAFT');
      const payload = {
        title: values.title.trim(),
        description: values.description.trim(),
        goalAmount: Number(values.goalAmount),
        durationDays: Number(values.durationDays),
        country: values.country,
        categoryId: Number(values.categoryId),
        status,
        rewards: values.rewards.map((reward) => ({
          rewardId: reward.rewardId,
          title: reward.title?.trim() || undefined,
          minPledge: Number(reward.minPledge),
          description: reward.description.trim(),
        })),
      };
      const saved = isEdit
        ? await campaignApi.update(id, payload)
        : await campaignApi.create(payload);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign', saved.campaignId] }),
      ]);
      if (intent === 'evaluate') {
        success(isEdit ? 'Changes saved. Continue to the model.' : 'Draft saved. Continue to the model.');
        navigate(`/creator/predictions/new?campaignId=${saved.campaignId}`);
      } else {
        success(isEdit ? 'Campaign updated.' : 'Campaign saved as a draft.');
        navigate('/creator/campaigns');
      }
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      let handled = false;
      for (const [field, message] of Object.entries(fieldErrors)) {
        try {
          setError(field as FieldPath<FormValues>, { message });
          handled = true;
        } catch {
          // ignore unknown field paths
        }
      }
      if (!handled) setFormError(getApiErrorMessage(error, 'Unable to save the campaign.'));
    } finally {
      setAction(null);
    }
  }

  if (isEdit && !Number.isFinite(id)) {
    return (
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState icon="search_off" title="Campaign not found" />
      </div>
    );
  }

  if (isEdit && campaignLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="mb-8 h-10 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-card" />
            <Skeleton className="h-64 w-full rounded-card" />
          </div>
          <Skeleton className="h-80 w-full rounded-card" />
        </div>
      </div>
    );
  }

  if (isEdit && (campaignError || !campaign)) {
    return (
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          icon="cloud_off"
          title="We could not load this campaign"
          description={getApiErrorMessage(campaignFetchError, 'It may have been removed.')}
          action={
            <Link to="/creator/campaigns" className={buttonClasses('primary', 'md')}>
              Back to creator studio
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Creator studio"
        title={isEdit ? 'Edit campaign' : 'Create a campaign'}
        description="Build the pitch, set the funding math, and add reward tiers. Save a draft now and evaluate it with the model when you are ready."
        backTo="/creator/campaigns"
        backLabel="Back to campaigns"
        actions={
          campaign ? (
            <Chip tone={statusTone(campaign.status)} icon={campaign.status === 'DRAFT' ? 'edit_note' : 'public'}>
              {campaign.status === 'DRAFT' ? 'Private draft' : 'Live campaign'}
            </Chip>
          ) : null
        }
      />

      <form className="grid gap-6 lg:grid-cols-[1fr_340px]" noValidate>
        <div className="space-y-6">
          {formError ? (
            <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-error-container/50 px-4 py-3 text-body-sm text-danger" role="alert">
              <span className="material-symbols-outlined mt-0.5 text-[18px]" aria-hidden="true">
                error
              </span>
              {formError}
            </div>
          ) : null}

          <Card>
            <div className="mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-brand" aria-hidden="true">
                edit_note
              </span>
              <h2 className="text-headline-sm font-semibold text-ink">The basics</h2>
            </div>
            <div className="space-y-4">
              <FloatingLabelInput
                label="Campaign title"
                maxLength={100}
                error={errors.title?.message}
                hint="A clear, specific title works best."
                {...register('title')}
              />
              <FloatingLabelTextarea
                label="Campaign pitch"
                rows={7}
                error={errors.description?.message}
                hint={`${watched.description?.length ?? 0} characters · at least 80 required`}
                {...register('description')}
              />
            </div>
          </Card>

          <Card>
            <div className="mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-brand" aria-hidden="true">
                savings
              </span>
              <h2 className="text-headline-sm font-semibold text-ink">Funding math</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FloatingLabelInput
                label="Funding goal (USD)"
                type="number"
                min={100}
                step="100"
                leadingIcon="attach_money"
                error={errors.goalAmount?.message}
                {...register('goalAmount')}
              />
              <FloatingLabelInput
                label="Duration (days)"
                type="number"
                min={1}
                max={60}
                step="1"
                leadingIcon="schedule"
                error={errors.durationDays?.message}
                {...register('durationDays')}
              />
              <Select label="Category" error={errors.categoryId?.message} {...register('categoryId')}>
                {(categories ?? []).map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Select label="Market country" error={errors.country?.message} {...register('country')}>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-4 rounded-xl bg-surface-low px-4 py-3 text-label-md text-muted">
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-brand" aria-hidden="true">
                  calculate
                </span>
                You need to raise about <strong className="text-ink">{formatCurrency(goalPerDay)}</strong> per day to hit
                this goal.
              </p>
            </div>
          </Card>

          <Card>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-brand" aria-hidden="true">
                  card_giftcard
                </span>
                <h2 className="text-headline-sm font-semibold text-ink">Reward tiers</h2>
              </div>
              <PillButton
                variant="secondary"
                size="sm"
                icon="add"
                onClick={() =>
                  append({ title: '', minPledge: 50, description: 'Describe what this reward includes.' })
                }
              >
                Add tier
              </PillButton>
            </div>
            {errors.rewards?.root?.message ? (
              <p className="mb-3 text-label-md font-medium text-danger" role="alert">
                {errors.rewards.root.message}
              </p>
            ) : null}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-xl border border-line/50 bg-surface-low/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-label-md font-semibold uppercase tracking-[0.1em] text-muted">
                      Tier {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="inline-flex items-center gap-1 rounded-pill px-2 py-1 text-label-md font-medium text-danger transition hover:bg-error-container/40 disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        delete
                      </span>
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                    <FloatingLabelInput
                      label="Reward title (optional)"
                      error={errors.rewards?.[index]?.title?.message}
                      {...register(`rewards.${index}.title`)}
                    />
                    <FloatingLabelInput
                      label="Minimum pledge"
                      type="number"
                      min={1}
                      step="1"
                      leadingIcon="attach_money"
                      error={errors.rewards?.[index]?.minPledge?.message}
                      {...register(`rewards.${index}.minPledge`)}
                    />
                  </div>
                  <div className="mt-3">
                    <FloatingLabelTextarea
                      label="What the backer receives"
                      rows={3}
                      error={errors.rewards?.[index]?.description?.message}
                      {...register(`rewards.${index}.description`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <PillButton
              variant="secondary"
              size="lg"
              onClick={() => void handleSubmit((values) => persist(values, 'draft'))()}
              loading={isSubmitting && action === 'draft'}
              disabled={isSubmitting}
              icon="save"
            >
              {isEdit ? 'Save changes' : 'Save draft'}
            </PillButton>
            <PillButton
              size="lg"
              onClick={() => void handleSubmit((values) => persist(values, 'evaluate'))()}
              loading={isSubmitting && action === 'evaluate'}
              disabled={isSubmitting}
              icon="auto_awesome"
            >
              Save & evaluate
            </PillButton>
          </div>
        </div>

        <aside className="space-y-5 self-start lg:sticky lg:top-24">
          <Card padding="sm">
            <p className="mb-3 text-label-md font-semibold uppercase tracking-[0.1em] text-muted">Live preview</p>
            <CampaignArtwork
              categoryName={categoryName}
              title={watched.title || 'Untitled campaign'}
              className="aspect-[16/9] rounded-xl"
              compact
            />
            <div className="mt-4">
              <h3 className="line-clamp-2 text-body-md font-semibold text-ink">
                {watched.title || 'Untitled campaign'}
              </h3>
              <p className="mt-1 text-label-md text-muted">{categoryName ?? 'Choose a category'}</p>
              <p className="mt-3 line-clamp-3 text-body-sm text-on-surface-variant">
                {watched.description || 'Your pitch preview appears here as you type.'}
              </p>
              <dl className="mt-4 space-y-2 border-t border-line/30 pt-4 text-label-md">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Goal</dt>
                  <dd className="font-semibold text-ink">{formatCurrency(Number(watched.goalAmount) || 0)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Duration</dt>
                  <dd className="font-semibold text-ink">{Number(watched.durationDays) || 0} days</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Per day</dt>
                  <dd className="font-semibold text-ink">{formatCurrency(goalPerDay)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Reward tiers</dt>
                  <dd className="font-semibold text-ink">{fields.length}</dd>
                </div>
              </dl>
            </div>
          </Card>
          <div className="rounded-card border border-line/40 bg-surface-low/70 p-4 text-label-md text-muted">
            <p className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-brand" aria-hidden="true">
                lightbulb
              </span>
              New campaigns stay private as drafts until you evaluate them. Running the model on a draft publishes it
              to the marketplace.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
