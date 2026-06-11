'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['SUBMITTED', 'APPROVED', 'REJECTED'];

type KycEntry = {
  id: string;
  userId: string;
  documentType: string;
  createdAt: string;
  user: { id: string; email: string; firstName: string; lastName: string; kycStatus: string };
};

// ── Review Modal ───────────────────────────────────────────────
function ReviewModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const { data: doc, isLoading } = useQuery({
    queryKey: ['admin', 'kyc-doc', userId],
    queryFn: () => adminApi.getKycDocument(userId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ status, notes }: { status: 'APPROVED' | 'REJECTED'; notes?: string }) =>
      adminApi.updateKyc(userId, status, notes),
    onSuccess: (_, vars) => {
      toast.success(`KYC ${vars.status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">KYC Review</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">✕</button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading document…</div>
        ) : doc ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-muted-foreground text-xs mb-0.5">Applicant</p>
                <p className="font-medium">{doc.user.firstName} {doc.user.lastName}</p>
                <p className="text-muted-foreground text-xs">{doc.user.email}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-muted-foreground text-xs mb-0.5">Document Type</p>
                <p className="font-medium capitalize">{doc.documentType?.replace(/_/g, ' ').toLowerCase()}</p>
                <p className="text-muted-foreground text-xs">Status: {doc.user.kycStatus}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {doc.frontImageUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Front</p>
                  <a href={doc.frontImageUrl} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.frontImageUrl}
                      alt="Front"
                      className="w-full h-40 object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition"
                    />
                  </a>
                </div>
              )}
              {doc.backImageUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Back</p>
                  <a href={doc.backImageUrl} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.backImageUrl}
                      alt="Back"
                      className="w-full h-40 object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition"
                    />
                  </a>
                </div>
              )}
              {doc.selfieUrl && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1.5">Selfie</p>
                  <a href={doc.selfieUrl} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.selfieUrl}
                      alt="Selfie"
                      className="w-40 h-40 object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition"
                    />
                  </a>
                </div>
              )}
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Review notes (optional)…"
              rows={3}
              className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
            />

            <div className="flex gap-3">
              <button
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ status: 'APPROVED', notes })}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </button>
              <button
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ status: 'REJECTED', notes })}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 disabled:opacity-50 transition"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">Document not found</p>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function AdminKycPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('SUBMITTED');
  const [reviewUserId, setReviewUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kyc', page, status],
    queryFn: () => adminApi.getKycSubmissions({ page, limit: 20, status }),
    enabled: user?.role === 'ADMIN',
  });

  if (user?.role !== 'ADMIN') { router.push('/dashboard'); return null; }

  const items: KycEntry[] = data?.data ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KYC Review</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data?.total ?? '—'} submissions
          </p>
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition',
                status === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">User</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Doc Type</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">KYC Status</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Submitted</th>
              <th className="text-right px-5 py-3.5 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : items.length === 0
              ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                      No {status.toLowerCase()} submissions
                    </td>
                  </tr>
                )
              : items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                    <td className="px-5 py-4">
                      <p className="font-medium">
                        {item.user.firstName} {item.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.user.email}</p>
                    </td>
                    <td className="px-5 py-4 capitalize text-muted-foreground">
                      {item.documentType?.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        item.user.kycStatus === 'APPROVED' && 'bg-emerald-500/10 text-emerald-600',
                        item.user.kycStatus === 'SUBMITTED' && 'bg-amber-500/10 text-amber-600',
                        item.user.kycStatus === 'REJECTED' && 'bg-red-500/10 text-red-600',
                      )}>
                        {item.user.kycStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setReviewUserId(item.user.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition"
                      >
                        <Eye className="w-3 h-3" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.totalPages}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {reviewUserId && (
        <ReviewModal userId={reviewUserId} onClose={() => setReviewUserId(null)} />
      )}
    </div>
  );
}
