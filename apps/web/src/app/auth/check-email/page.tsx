'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Mail, RefreshCw } from 'lucide-react';
import { authApi } from '@/lib/api';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    if (!email || resending) return;
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setResent(true);
      toast.success('Verification email resent!');
    } catch {
      toast.error('Could not resend email. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-5">
        <Mail className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>

      <h2 className="text-2xl font-bold mb-2">Check your inbox</h2>
      <p className="text-muted-foreground text-sm leading-relaxed mb-1">
        We&apos;ve sent a verification link to
      </p>
      {email && (
        <p className="font-semibold text-sm mb-4 text-foreground break-all">{email}</p>
      )}
      <p className="text-muted-foreground text-sm leading-relaxed mb-6">
        Click the link in the email to activate your account. If you don&apos;t see it, check
        your spam folder.
      </p>

      {/* Resend */}
      <button
        onClick={handleResend}
        disabled={resending || resent}
        className="w-full flex items-center justify-center gap-2 border py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-60 mb-3"
      >
        <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
        {resent ? 'Email sent!' : resending ? 'Sending...' : 'Resend verification email'}
      </button>

      <Link
        href="/auth/login"
        className="block w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 transition"
      >
        Back to sign in
      </Link>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}
