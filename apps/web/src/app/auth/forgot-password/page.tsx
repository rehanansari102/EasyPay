'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { mutate: forgotPassword, isPending, isSuccess } = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      toast.success('Reset link sent! Check your email.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Something went wrong');
    },
  });

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (isSuccess) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Check your inbox</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          If <strong>{getValues('email')}</strong> is registered, we&apos;ve sent a password reset link.
          <br />The link expires in <strong>15 minutes</strong>.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 block text-sm text-primary font-medium hover:underline"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-center mb-2">Forgot Password</h2>
      <p className="text-muted-foreground text-sm text-center mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit((data) => forgotPassword(data.email))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email address</label>
          <input
            {...register('email')}
            type="email"
            placeholder="alice@example.com"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-60"
        >
          {isPending ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
