'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { paymentsApi, walletApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@easypay/shared';
import { ArrowUpRight, Loader2, ShieldCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  amount: z
    .number({ invalid_type_error: 'Enter a valid amount' })
    .min(10, 'Minimum withdrawal is $10')
    .max(10000, 'Maximum is $10,000'),
  bankAccountNumber: z.string().min(4, 'Required').max(34),
  bankRoutingNumber: z
    .string()
    .min(4, 'Required')
    .max(11)
    .regex(/^[A-Z0-9]+$/, 'Must be uppercase letters and digits only'),
  accountHolderName: z.string().min(2, 'Required').max(70),
});

type FormValues = z.infer<typeof schema>;

export default function WithdrawalPage() {
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: walletApi.getWallet,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const amount = watch('amount');

  const mutation = useMutation({
    mutationFn: paymentsApi.requestWithdrawal,
    onSuccess: () => {
      toast.success('Withdrawal initiated! Funds typically arrive in 1–3 business days.');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSubmitted(true);
      reset();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message ?? err.message ?? 'Withdrawal failed'),
  });

  const onSubmit = (values: FormValues) => {
    if (!wallet) return;
    if (values.amount > Number(wallet.balance)) {
      toast.error('Amount exceeds wallet balance');
      return;
    }
    mutation.mutate(values);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold">Withdrawal Requested</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your withdrawal has been submitted. Funds typically arrive in{' '}
            <strong className="text-foreground">1–3 business days</strong> depending on your bank.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition"
          >
            Make another withdrawal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Withdraw Funds</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Transfer money from your EasyPay wallet to your bank account.
        </p>
      </div>

      {/* Balance */}
      {wallet && (
        <div className="flex items-center justify-between bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-5 py-4">
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="text-xl font-bold text-indigo-500">
            {formatCurrency(Number(wallet.balance), wallet.currency)}
          </p>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-sm">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Withdrawals are processed via standard bank transfer. Minimum $10, maximum $10,000 per
          request. Funds typically arrive in 1–3 business days.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-border rounded-2xl p-6 space-y-5"
      >
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="10"
              max="10000"
              {...register('amount', { valueAsNumber: true })}
              placeholder="0.00"
              className={cn(
                'w-full pl-8 pr-4 py-3 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
                errors.amount ? 'border-red-500' : 'border-border',
              )}
            />
          </div>
          {errors.amount && (
            <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
          )}
          {amount > 0 && wallet && amount > Number(wallet.balance) && (
            <p className="text-red-500 text-xs mt-1">Exceeds available balance</p>
          )}
        </div>

        {/* Account holder */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Account Holder Name</label>
          <input
            {...register('accountHolderName')}
            placeholder="John Doe"
            className={cn(
              'w-full px-4 py-3 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
              errors.accountHolderName ? 'border-red-500' : 'border-border',
            )}
          />
          {errors.accountHolderName && (
            <p className="text-red-500 text-xs mt-1">{errors.accountHolderName.message}</p>
          )}
        </div>

        {/* Bank account number */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Bank Account Number</label>
          <input
            {...register('bankAccountNumber')}
            placeholder="e.g. 000123456789"
            className={cn(
              'w-full px-4 py-3 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono',
              errors.bankAccountNumber ? 'border-red-500' : 'border-border',
            )}
          />
          {errors.bankAccountNumber && (
            <p className="text-red-500 text-xs mt-1">{errors.bankAccountNumber.message}</p>
          )}
        </div>

        {/* Routing number */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Routing / BIC Number
          </label>
          <input
            {...register('bankRoutingNumber')}
            placeholder="e.g. CHASUS33"
            className={cn(
              'w-full px-4 py-3 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono uppercase',
              errors.bankRoutingNumber ? 'border-red-500' : 'border-border',
            )}
          />
          {errors.bankRoutingNumber && (
            <p className="text-red-500 text-xs mt-1">{errors.bankRoutingNumber.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition disabled:opacity-60"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowUpRight className="w-4 h-4" />
          )}
          {mutation.isPending ? 'Processing…' : 'Request Withdrawal'}
        </button>
      </form>
    </div>
  );
}
