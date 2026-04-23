'use client';

import { TransactionDto } from '@easypay/shared';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { useTheme } from 'next-themes';

interface Props {
  transactions: TransactionDto[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold text-foreground">${Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export function SpendingChart({ transactions }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

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

  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const axisColor = isDark ? '#4b5563' : '#d1d5db';

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-sm">Activity (Last 7 Days)</h3>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Received
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Sent
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradRecv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={isDark ? 0.3 : 0.2} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={isDark ? 0.3 : 0.2} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridColor} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: axisColor }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? '#374151' : '#e5e7eb', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="received"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradRecv)"
            dot={false}
            activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
            name="received"
          />
          <Area
            type="monotone"
            dataKey="sent"
            stroke="#f43f5e"
            strokeWidth={2}
            fill="url(#gradSent)"
            dot={false}
            activeDot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }}
            name="sent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

