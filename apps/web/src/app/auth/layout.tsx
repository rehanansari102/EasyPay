import type { Metadata } from 'next';
import { ShieldCheck, Check, TrendingUp, Globe, Lock } from 'lucide-react';

export const metadata: Metadata = { title: 'Authentication' };

const features = [
  'Instant global transfers',
  'Virtual cards, issued in seconds',
  'Bank-grade 256-bit encryption',
  'Real-time transaction alerts',
  'Two-factor authentication',
];

const stats = [
  { value: '$2.4B+', label: 'Transacted' },
  { value: '180+', label: 'Countries' },
  { value: '99.9%', label: 'Uptime' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: brand showcase (desktop only) ── */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#0b0b16] px-14 py-10 relative overflow-hidden flex-shrink-0">
        {/* Ambient orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-24 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 animate-fade-in flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">EasyPay</span>
        </div>

        {/* Main content */}
        <div className="relative flex-1 flex flex-col justify-center gap-7 max-w-lg py-6">
          {/* Headline */}
          <div className="animate-slide-up">
            <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
              Digital Banking Platform
            </p>
            <h2 className="text-4xl font-bold text-white leading-[1.1] tracking-tight">
              Banking built<br />for the{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                future
              </span>
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Join thousands who trust EasyPay for fast, secure, and borderless money management.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-2.5 animate-slide-up delay-100">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-indigo-300" />
                </div>
                <span className="text-slate-300 text-sm">{f}</span>
              </li>
            ))}
          </ul>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 animate-slide-up delay-200">
            {stats.map(({ value, label }) => (
              <div key={label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 text-center">
                <p className="text-white text-lg font-bold tracking-tight">{value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom cards */}
        <div className="relative space-y-2.5 flex-shrink-0 animate-float">
          <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">Transfer to Europe</p>
                <p className="text-slate-400 text-xs mt-0.5">€1,200.00 sent · 2 min ago</p>
              </div>
              <span className="text-emerald-400 text-sm font-bold flex-shrink-0">Done</span>
            </div>
          </div>

          <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">Payment received</p>
                <p className="text-slate-400 text-xs mt-0.5">+$2,500.00 · just now</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f9fafb] dark:bg-[#070711] overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-10 animate-slide-down">
            <div className="inline-flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">EasyPay</span>
            </div>
            <p className="text-muted-foreground text-sm">Digital Banking Platform</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
