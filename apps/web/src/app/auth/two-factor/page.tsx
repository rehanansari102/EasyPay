'use client';

import { useRef, useState, KeyboardEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function TwoFactorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') ?? '';
  const { setAuth } = useAuthStore();

  // 6-digit code split into individual inputs
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const { mutate: verifyCode, isPending } = useMutation({
    mutationFn: (code: string) => authApi.verifyTwoFactor(sessionId, code),
    onSuccess: (data) => {
      setAuth(data.user);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      router.replace('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid code. Please try again.');
      // Clear inputs on error
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    },
  });

  const handleDigitChange = (index: number, value: string) => {
    // Accept only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    // Auto-submit when all digits filled
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (digit && index === 5) {
      const code = [...next].join('');
      if (code.length === 6) verifyCode(code);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    if (pasted.length === 6) {
      verifyCode(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  if (!sessionId) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600">Session Expired</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Your login session has expired. Please log in again.
        </p>
        <Link
          href="/auth/login"
          className="mt-5 block w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition text-sm text-center"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold mb-2">Two-Factor Authentication</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Enter the 6-digit code from your authenticator app.
      </p>

      <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isPending}
            className="w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-800 dark:border-gray-700 disabled:opacity-50 transition"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      <button
        onClick={() => verifyCode(digits.join(''))}
        disabled={isPending || digits.join('').length !== 6}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-60"
      >
        {isPending ? 'Verifying...' : 'Verify Code'}
      </button>

      <div className="mt-4 text-center text-sm">
        <Link href="/auth/login" className="text-muted-foreground hover:text-primary transition">
          Use a different account
        </Link>
      </div>
    </div>
  );
}
