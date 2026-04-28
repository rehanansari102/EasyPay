'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/lib/api';
import { VirtualCardDto } from '@easypay/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  CreditCard,
  Snowflake,
  Plus,
  X,
  Loader2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Create card schema ─────────────────────────────────────────
const createCardSchema = z.object({
  nameOnCard: z.string().min(2, 'Name must be at least 2 characters').max(26),
  spendingLimit: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(1)
    .optional()
    .or(z.literal(NaN).transform(() => undefined)),
});
type CreateCardForm = z.infer<typeof createCardSchema>;

// ── Card display component ─────────────────────────────────────
function VirtualCardDisplay({
  card,
  onToggleFreeze,
  isFreezing,
}: {
  card: VirtualCardDto;
  onToggleFreeze: (id: string) => void;
  isFreezing: boolean;
}) {
  const isFrozen = card.status === 'FROZEN';

  return (
    <div
      className={cn(
        'relative rounded-2xl p-5 overflow-hidden transition-all duration-300',
        isFrozen
          ? 'bg-gradient-to-br from-slate-600 to-slate-800'
          : 'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700',
      )}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <span
          className={cn(
            'text-xs font-bold px-2.5 py-1 rounded-full tracking-wide',
            isFrozen ? 'bg-sky-400/25 text-sky-200' : 'bg-white/20 text-white',
          )}
        >
          {isFrozen ? '❄ FROZEN' : '● ACTIVE'}
        </span>
        <CreditCard className="w-6 h-6 text-white/60" />
      </div>

      {/* Card number */}
      <p className="text-white/90 text-lg font-mono tracking-[0.2em] relative z-10 mb-5">
        {card.cardNumberMasked}
      </p>

      {/* Name & expiry */}
      <div className="flex items-end justify-between relative z-10 mb-4">
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">Card Holder</p>
          <p className="text-white font-semibold text-sm">{card.nameOnCard}</p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">Expires</p>
          <p className="text-white font-semibold text-sm">
            {String(card.expiryMonth).padStart(2, '0')}/
            {String(card.expiryYear).slice(-2)}
          </p>
        </div>
      </div>

      {/* Freeze button */}
      <button
        onClick={() => onToggleFreeze(card.id)}
        disabled={isFreezing}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition relative z-10',
          isFrozen
            ? 'bg-sky-400/20 text-sky-200 hover:bg-sky-400/30'
            : 'bg-white/10 text-white hover:bg-white/20',
        )}
      >
        {isFreezing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Snowflake className="w-4 h-4" />
        )}
        {isFrozen ? 'Unfreeze Card' : 'Freeze Card'}
      </button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function CardsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: cards, isLoading } = useQuery({
    queryKey: ['wallet-cards'],
    queryFn: walletApi.getCards,
  });

  const { mutate: createCard, isPending: isCreating } = useMutation({
    mutationFn: walletApi.createCard,
    onSuccess: () => {
      toast.success('Virtual card created!');
      queryClient.invalidateQueries({ queryKey: ['wallet-cards'] });
      setShowCreateModal(false);
      reset();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message ?? err.message ?? 'Failed to create card'),
  });

  const { mutate: toggleFreeze, variables: freezingCardId, isPending: isFreezing } = useMutation({
    mutationFn: walletApi.toggleFreezeCard,
    onSuccess: (updated: VirtualCardDto) => {
      toast.success(updated.status === 'FROZEN' ? 'Card frozen' : 'Card unfrozen');
      queryClient.invalidateQueries({ queryKey: ['wallet-cards'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message ?? err.message ?? 'Failed to update card'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCardForm>({
    resolver: zodResolver(createCardSchema),
  });

  const cardList: VirtualCardDto[] = cards ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Virtual Cards</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create and manage virtual cards for online payments.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          New Card
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-sm">
        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Virtual cards use your wallet balance. Card numbers are masked for security — the full
          number is only shown once at creation.
        </p>
      </div>

      {/* Card grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : cardList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <CreditCard className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-base">No virtual cards yet</p>
          <p className="text-muted-foreground text-sm max-w-xs">
            Create a virtual card to make secure online payments without exposing your account
            number.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-1 flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            Create Your First Card
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cardList.map((card) => (
            <VirtualCardDisplay
              key={card.id}
              card={card}
              onToggleFreeze={(id) => toggleFreeze(id)}
              isFreezing={isFreezing && freezingCardId === card.id}
            />
          ))}
        </div>
      )}

      {/* Create Card Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">New Virtual Card</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  reset();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => createCard(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name on Card</label>
                <input
                  {...register('nameOnCard')}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700"
                />
                {errors.nameOnCard && (
                  <p className="text-red-500 text-sm mt-1">{errors.nameOnCard.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Spending Limit (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <input
                    {...register('spendingLimit', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="No limit"
                    className="w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                {errors.spendingLimit && (
                  <p className="text-red-500 text-sm mt-1">{errors.spendingLimit.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    reset();
                  }}
                  className="flex-1 border py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 transition flex items-center justify-center gap-2 text-sm"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCreating ? 'Creating...' : 'Create Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
