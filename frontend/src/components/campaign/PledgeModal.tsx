import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Campaign, Reward } from '@/types';
import { pledgeApi } from '@/api';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { PillButton } from '@/components/ui/PillButton';
import { FloatingLabelInput } from '@/components/ui/Field';

interface PledgeModalProps {
  open: boolean;
  onClose: () => void;
  campaign: Campaign;
  reward: Reward | null;
}

export function PledgeModal({ open, onClose, campaign, reward }: PledgeModalProps) {
  const { success } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(String(reward?.minPledge ?? 25));
      setError(null);
    }
  }, [open, reward]);

  async function submit() {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Enter a pledge amount greater than zero.');
      return;
    }
    if (reward && numeric < reward.minPledge) {
      setError(`This reward requires at least ${formatCurrency(reward.minPledge)}.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await pledgeApi.create(campaign.campaignId, {
        amount: numeric,
        rewardId: reward?.rewardId ?? null,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['campaign', campaign.campaignId] }),
        queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
        queryClient.invalidateQueries({ queryKey: ['pledges', 'mine'] }),
      ]);
      success(`Your ${formatCurrency(numeric)} pledge was recorded.`);
      onClose();
    } catch (submitError) {
      const fieldErrors = getApiFieldErrors(submitError);
      setError(fieldErrors.amount ?? getApiErrorMessage(submitError, 'Unable to record your pledge.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Back this campaign"
      description={campaign.title}
      footer={
        <>
          <PillButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </PillButton>
          <PillButton onClick={() => void submit()} loading={submitting} icon="favorite">
            Pledge {amount ? formatCurrency(Number(amount) || 0) : ''}
          </PillButton>
        </>
      }
    >
      <div className="space-y-4">
        {reward ? (
          <div className="rounded-xl border border-brand/20 bg-mint/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-label-md font-semibold uppercase tracking-[0.1em] text-brand">Selected reward</p>
              <p className="text-body-sm font-semibold text-ink">{formatCurrency(reward.minPledge)}</p>
            </div>
            <p className="mt-1 text-body-sm font-semibold text-ink">{reward.title ?? 'Campaign reward'}</p>
            <p className="mt-1 text-body-sm text-on-surface-variant">{reward.description}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-line/50 bg-surface-low p-4">
            <p className="text-body-sm font-semibold text-ink">Pledge without a reward</p>
            <p className="mt-1 text-body-sm text-muted">
              Every dollar helps this campaign hit its goal. You can still choose a reward before launch in a real
              deployment.
            </p>
          </div>
        )}

        <FloatingLabelInput
          label="Pledge amount (USD)"
          type="number"
          min={reward?.minPledge ?? 1}
          step="1"
          leadingIcon="payments"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={error ?? undefined}
          hint={reward ? `Minimum ${formatCurrency(reward.minPledge)} for this reward.` : 'Enter any amount above zero.'}
        />

        <div className="rounded-xl bg-surface-low px-4 py-3 text-label-md text-muted">
          <p className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-brand" aria-hidden="true">
              lock
            </span>
            Payments are simulated in mock mode. The pledge is recorded immediately so you can test the full flow.
          </p>
        </div>
      </div>
    </Modal>
  );
}
