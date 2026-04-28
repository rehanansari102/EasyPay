'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi, paymentsApi } from '@/lib/api';
import { formatCurrency } from '@easypay/shared';
import { toast } from 'sonner';
import {
  Wallet,
  Copy,
  CheckCircle,
  Plus,
  ArrowDownLeft,
  CreditCard,
  X,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import Link from 'next/link';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
);

// ── Stripe payment form (step 2 of top-up) ────────────────────
function StripePaymentForm({
  amount,
  currency,
  onSuccess,
  onCancel,
}: {
  amount: number;
  currency: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsPaying(true);
    setPayError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setPayError(error.message ?? 'Payment failed');
      setIsPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3 text-center">
        <p className="text-sm text-muted-foreground">Amount to add</p>
        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          {formatCurrency(amount, currency)}
        </p>
      </div>

      <PaymentElement />

      {payError && (
        <p className="text-red-500 text-sm">{payError}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPaying || !stripe}
          className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 transition flex items-center justify-center gap-2 text-sm"
        >
          {isPaying && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPaying ? 'Processing...' : `Pay ${formatCurrency(amount, currency)}`}
        </button>
      </div>
    </form>
  );
}

// ── Top-up modal ───────────────────────────────────────────────
function TopUpModal({
  currency,
  onClose,
  onSuccess,
}: {
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'amount' | 'payment' | 'success'>('amount');
  const [amount, setAmount] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 1) {
      setAmountError('Minimum top-up is $1.00');
      return;
    }
    if (parsed > 10000) {
      setAmountError('Maximum top-up is $10,000');
      return;
    }
    setAmountError(null);
    setIsCreating(true);
    try {
      const result = await paymentsApi.createTopup(parsed);
      setClientSecret(result.clientSecret);
      setStep('payment');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? err.message ?? 'Failed to initiate top-up');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePaySuccess = useCallback(() => {
    setStep('success');
    onSuccess();
  }, [onSuccess]);

  const [mounted, setMounted] = useState(false);
  const portalRef = useRef<Element | null>(null);
  useEffect(() => {
    portalRef.current = document.body;
    setMounted(true);
  }, []);

  if (!mounted || !portalRef.current) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] overflow-y-auto">
      <div className="flex items-start justify-center min-h-full p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">
            {step === 'success' ? 'Funds Added!' : 'Add Funds'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'amount' && (
          <form onSubmit={handleAmountSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount ({currency})</label>
              <input
                type="number"
                min="1"
                max="10000"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700 text-lg font-mono"
                autoFocus
              />
              {amountError && <p className="text-red-500 text-sm mt-1">{amountError}</p>}
              <p className="text-muted-foreground text-xs mt-1.5">Min $1 · Max $10,000</p>
            </div>
            <button
              type="submit"
              disabled={isCreating || !amount}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {isCreating ? 'Preparing...' : 'Continue to Payment'}
            </button>
          </form>
        )}

        {step === 'payment' && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: 'stripe' } }}
          >
            <StripePaymentForm
              amount={parseFloat(amount)}
              currency={currency}
              onSuccess={handlePaySuccess}
              onCancel={onClose}
            />
          </Elements>
        )}

        {step === 'success' && (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="font-semibold">
              {formatCurrency(parseFloat(amount), currency)} added successfully
            </p>
            <p className="text-muted-foreground text-sm">
              Your wallet balance will update shortly.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:bg-primary/90 transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
      </div>
    </div>,
    portalRef.current,
  );
}
export default function WalletPage() {
  const queryClient = useQueryClient();
  const [showTopUp, setShowTopUp] = useState(false);
  const [copiedAccountNumber, setCopiedAccountNumber] = useState(false);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: walletApi.getWallet,
  });

  const handleCopyAccountNumber = () => {
    if (!wallet?.accountNumber) return;
    navigator.clipboard.writeText(wallet.accountNumber);
    setCopiedAccountNumber(true);
    toast.success('Account number copied!');
    setTimeout(() => setCopiedAccountNumber(false), 2000);
  };

  const handleTopUpSuccess = useCallback(() => {
    // Poll every 2s for up to 30s until webhook credits the wallet
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (attempts >= 15) clearInterval(interval);
    }, 2000);
  }, [queryClient]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Your balance, account details and funding options.
          </p>
        </div>
        <button
          onClick={() => setShowTopUp(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          Add Funds
        </button>
      </div>

      {/* ── Balance + Account Details ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Balance card */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
          <Wallet className="w-6 h-6 text-white/70 relative z-10 mb-4" />
          {walletLoading ? (
            <div className="h-10 w-40 bg-white/20 rounded-lg animate-pulse mb-2" />
          ) : (
            <p className="text-4xl font-bold relative z-10">
              {formatCurrency(wallet?.balance ?? '0', wallet?.currency ?? 'USD')}
            </p>
          )}
          <p className="text-white/60 text-sm mt-1 relative z-10">Available Balance</p>

          <button
            onClick={() => setShowTopUp(true)}
            className="mt-5 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition text-white text-sm font-medium px-4 py-2 rounded-xl relative z-10"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Add Funds
          </button>
        </div>

        {/* Account details */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-border p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Account Details
          </h3>

          <div className="space-y-3">
            <DetailRow label="Account Number">
              {walletLoading ? (
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{wallet?.accountNumber}</span>
                  <button
                    onClick={handleCopyAccountNumber}
                    className="text-muted-foreground hover:text-foreground transition"
                    aria-label="Copy account number"
                  >
                    {copiedAccountNumber ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </DetailRow>

            <DetailRow label="Currency">
              {walletLoading ? (
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <span className="font-semibold">{wallet?.currency}</span>
              )}
            </DetailRow>

            <DetailRow label="Status">
              {walletLoading ? (
                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              ) : (
                <WalletStatusBadge status={wallet?.status ?? 'ACTIVE'} />
              )}
            </DetailRow>
          </div>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/cards"
          className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-border hover:border-primary/40 transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition">
            <CreditCard className="w-5 h-5 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Virtual Cards</p>
            <p className="text-muted-foreground text-xs">Manage your payment cards</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/dashboard/transactions"
          className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-border hover:border-primary/40 transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition">
            <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Transactions</p>
            <p className="text-muted-foreground text-xs">View your full history</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Top-up modal ── */}
      {showTopUp && (
        <TopUpModal
          currency={wallet?.currency ?? 'USD'}
          onClose={() => setShowTopUp(false)}
          onSuccess={handleTopUpSuccess}
        />
      )}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function WalletStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    SUSPENDED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    CLOSED: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };
  return (
    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', map[status] ?? map.ACTIVE)}>
      {status}
    </span>
  );
}
