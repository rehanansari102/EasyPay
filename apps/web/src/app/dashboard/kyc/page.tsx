'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { kycApi } from '@/lib/api';
import { toast } from 'sonner';
import { ShieldCheck, Upload, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type DocType = 'CNIC' | 'NICOP' | 'PASSPORT';

const DOC_TYPES: { value: DocType; label: string; hint: string; needsBack: boolean }[] = [
  {
    value: 'CNIC',
    label: 'CNIC',
    hint: 'Format: XXXXX-XXXXXXX-X  (e.g. 42101-1234567-1)',
    needsBack: true,
  },
  {
    value: 'NICOP',
    label: 'NICOP',
    hint: 'Format: XXXXX-XXXXXXX-X  (e.g. 42101-1234567-1)',
    needsBack: true,
  },
  {
    value: 'PASSPORT',
    label: 'Passport',
    hint: '2 uppercase letters + 7 digits  (e.g. AB1234567)',
    needsBack: false,
  },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    PENDING: {
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Not submitted',
      className: 'bg-slate-500/10 text-slate-400',
    },
    SUBMITTED: {
      icon: <Clock className="w-4 h-4" />,
      label: 'Under review',
      className: 'bg-amber-500/10 text-amber-500',
    },
    APPROVED: {
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Approved',
      className: 'bg-emerald-500/10 text-emerald-500',
    },
    REJECTED: {
      icon: <XCircle className="w-4 h-4" />,
      label: 'Rejected',
      className: 'bg-rose-500/10 text-rose-500',
    },
  };
  const item = map[status] ?? map.PENDING;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full', item.className)}>
      {item.icon}
      {item.label}
    </span>
  );
}

function FileDropzone({
  label,
  required,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image (JPG, PNG) or PDF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5 MB');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    onChange(dataUrl);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
          value
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-border hover:border-indigo-500/40 hover:bg-indigo-500/5',
        )}
      >
        {value ? (
          <>
            <CheckCircle className="w-6 h-6 text-emerald-500" />
            <p className="text-sm text-emerald-500 font-medium">File uploaded</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="text-xs text-muted-foreground underline"
            >
              Remove
            </button>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop or <span className="text-indigo-400 font-medium">click to upload</span>
            </p>
            <p className="text-xs text-muted-foreground">JPG, PNG or PDF — max 5 MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

export default function KycPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [docType, setDocType] = useState<DocType>('CNIC');
  const [docNumber, setDocNumber] = useState('');
  const [frontImage, setFrontImage] = useState('');
  const [backImage, setBackImage] = useState('');
  const [selfieImage, setSelfieImage] = useState('');

  const { data: kycData, isLoading } = useQuery({
    queryKey: ['kyc', 'status'],
    queryFn: kycApi.getStatus,
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: kycApi.submit,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['kyc', 'status'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Submission failed'),
  });

  const selectedDocType = DOC_TYPES.find((d) => d.value === docType)!;
  const isApproved = kycData?.kycStatus === 'APPROVED';
  const isSubmitted = kycData?.kycStatus === 'SUBMITTED';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontImage) { toast.error('Front image is required'); return; }
    if (selectedDocType.needsBack && !backImage) { toast.error('Back image is required for ' + docType); return; }

    mutation.mutate({
      docType,
      docNumber: docNumber.trim(),
      frontImageUrl: frontImage,
      backImageUrl: backImage || undefined,
      selfieUrl: selfieImage || undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-500/10 rounded-2xl">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Identity Verification</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Verify your identity to unlock full access to EasyPay
          </p>
        </div>
        {!isLoading && kycData && <StatusBadge status={kycData.kycStatus} />}
      </div>

      {/* Approved state */}
      {isApproved && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4">
          <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-500">Identity Verified</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your {kycData.kycDocument?.docType} has been approved. Your account has full access.
            </p>
          </div>
        </div>
      )}

      {/* Under review */}
      {isSubmitted && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4">
          <Clock className="w-8 h-8 text-amber-500 shrink-0" />
          <div>
            <p className="font-semibold text-amber-500">Under Review</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              We are reviewing your {kycData.kycDocument?.docType} ({kycData.kycDocument?.docNumber}).
              This usually takes 1–2 business days.
            </p>
          </div>
        </div>
      )}

      {/* Rejection notice */}
      {kycData?.kycStatus === 'REJECTED' && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5">
          <p className="font-semibold text-rose-500 flex items-center gap-2">
            <XCircle className="w-5 h-5" /> Verification Rejected
          </p>
          {kycData.kycDocument?.reviewNotes && (
            <p className="text-sm text-muted-foreground mt-1.5">{kycData.kycDocument.reviewNotes}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">Please resubmit with correct documents.</p>
        </div>
      )}

      {/* Form — hidden only when approved */}
      {!isApproved && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-6">
          {/* Doc type selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Document Type</label>
            <div className="grid grid-cols-3 gap-3">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => { setDocType(d.value); setDocNumber(''); setBackImage(''); }}
                  className={cn(
                    'py-2.5 rounded-xl border text-sm font-medium transition-colors',
                    docType === d.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-border hover:border-indigo-500/40 text-muted-foreground',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Document number */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {selectedDocType.label} Number <span className="text-rose-500">*</span>
            </label>
            <input
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder={docType === 'PASSPORT' ? 'AB1234567' : '42101-1234567-1'}
              required
              className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">{selectedDocType.hint}</p>
          </div>

          {/* Front image */}
          <FileDropzone
            label={docType === 'PASSPORT' ? 'Bio-data Page (front)' : 'Front Side'}
            required
            value={frontImage}
            onChange={setFrontImage}
          />

          {/* Back image — required for CNIC / NICOP */}
          {selectedDocType.needsBack && (
            <FileDropzone
              label="Back Side"
              required
              value={backImage}
              onChange={setBackImage}
            />
          )}

          {/* Selfie — optional */}
          <FileDropzone
            label="Selfie with Document (optional but recommended)"
            value={selfieImage}
            onChange={setSelfieImage}
          />

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            By submitting, you confirm that the information and documents provided are genuine and
            belong to you. Submitting false or forged documents is a criminal offence under Pakistani law.
          </p>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
          >
            {mutation.isPending ? 'Submitting…' : isSubmitted ? 'Resubmit Documents' : 'Submit for Verification'}
          </button>
        </form>
      )}
    </div>
  );
}
