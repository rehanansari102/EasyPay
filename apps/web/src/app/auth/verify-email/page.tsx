'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please check your email link.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((data) => {
        setStatus('success');
        setMessage(data.message);
        toast.success('Email verified!');
        setTimeout(() => router.push('/dashboard'), 2500);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      });
  }, [token, router]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
      {status === 'verifying' && (
        <>
          <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Verifying your email...</h2>
          <p className="text-muted-foreground mt-2 text-sm">Please wait a moment.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">Email Verified!</h2>
          <p className="text-muted-foreground mt-2 text-sm">{message}</p>
          <p className="text-muted-foreground mt-1 text-sm">Redirecting to dashboard...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">Verification Failed</h2>
          <p className="text-muted-foreground mt-2 text-sm">{message}</p>
          <div className="mt-5 space-y-2">
            <Link
              href="/auth/login"
              className="block w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition text-sm"
            >
              Back to Login
            </Link>
            <button
              onClick={() => authApi.resendVerification('').catch(() => {})}
              className="block w-full border py-2.5 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
            >
              Resend verification email
            </button>
          </div>
        </>
      )}
    </div>
  );
}
