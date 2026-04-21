'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { TransactionDto } from '@finvault/shared';
import { formatCurrency } from '@finvault/shared';
import { format } from 'date-fns';
import { useState } from 'react';

const transferSchema = z.object({
  toAccountNumber: z.string().length(10, 'Account number must be 10 digits'),
  amount: z.number().min(1).max(10000),
  description: z.string().max(200).optional(),
});

type TransferForm = z.infer<typeof transferSchema>;

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [showSendModal, setShowSendModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsApi.getHistory({ limit: 50, page: 1 }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
  });

  const { mutate: transfer, isPending } = useMutation({
    mutationFn: transactionsApi.transfer,
    onSuccess: () => {
      toast.success('Transfer successful!');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setShowSendModal(false);
      reset();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Transfer failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button
          onClick={() => setShowSendModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition"
        >
          + Send Money
        </button>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Send Money</h2>
            <form onSubmit={handleSubmit((d) => transfer(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Recipient Account Number</label>
                <input
                  {...register('toAccountNumber')}
                  placeholder="10-digit account number"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700"
                />
                {errors.toAccountNumber && <p className="text-red-500 text-sm mt-1">{errors.toAccountNumber.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (USD)</label>
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700"
                />
                {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <input
                  {...register('description')}
                  placeholder="Payment for..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowSendModal(false); reset(); }} className="flex-1 border py-2.5 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60">
                  {isPending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (data?.data?.length ?? 0) === 0 ? (
          <p className="text-center text-muted-foreground py-16">No transactions yet. Send or receive money to get started.</p>
        ) : (
          <div className="divide-y divide-border">
            {data?.data?.map((tx: TransactionDto) => (
              <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{tx.description ?? tx.type}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), 'MMM d, yyyy · h:mm a')} · Ref: {tx.reference.slice(0, 8)}...</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
