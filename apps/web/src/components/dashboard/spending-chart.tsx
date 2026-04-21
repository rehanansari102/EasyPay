'use client';

import { TransactionDto } from '@finvault/shared';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

interface Props {
  transactions: TransactionDto[];
}

export function SpendingChart({ transactions }: Props) {
  // Build last-7-days data
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 6 - i));
    return { label: format(date, 'EEE'), date, sent: 0, received: 0 };
  });

  transactions.forEach((tx) => {
    const txDate = startOfDay(new Date(tx.createdAt));
    const day = days.find((d) => d.date.getTime() === txDate.getTime());
    if (!day) return;
    if (tx.type === 'DEPOSIT' || tx.receiverWalletId) {
      day.received += Number(tx.amount);
    } else {
      day.sent += Number(tx.amount);
    }
  });

  const chartData = days.map(({ label, sent, received }) => ({ label, sent, received }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-border">
      <h3 className="font-semibold mb-4">Spending (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [`$${value.toFixed(2)}`]}
          />
          <Bar dataKey="received" fill="#22c55e" radius={[4, 4, 0, 0]} name="Received" />
          <Bar dataKey="sent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Sent" />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Received</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> Sent</span>
      </div>
    </div>
  );
}
