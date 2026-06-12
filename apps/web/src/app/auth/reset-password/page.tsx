'use client';

import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(PASSWORD_REGEX, 'Must contain uppercase, lowercase, number, and special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const { mutate: resetPassword, isPending, isSuccess } = useMutation({
    mutationFn: (data: { newPassword: string }) =>
      authApi.resetPassword(token, data.newPassword),
    onSuccess: (data) => {
      toast.success(data.message || 'Password reset successfully!');
      setTimeout(() => router.push('/auth/login'), 2000);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Reset failed. The link may have expired.');
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600">Invalid Reset Link</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          This password reset link is invalid or has expired.
        </p>
        <Link
          href="/auth/forgot-password"
          className="mt-5 block w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition text-sm text-center"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">Password Reset!</h2>
        <p className="text-muted-foreground mt-2 text-sm">Redirecting you to login...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-center mb-2">Reset Password</h2>
      <p className="text-muted-foreground text-sm text-center mb-6">
        Choose a strong new password for your account.
      </p>

      <form onSubmit={handleSubmit((data) => resetPassword(data))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <input
            {...register('newPassword')}
            type="password"
            placeholder="••••••••"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700"
          />
          {errors.newPassword && (
            <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm Password</label>
          <input
            {...register('confirmPassword')}
            type="password"
            placeholder="••••••••"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700"
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-60"
        >
          {isPending ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
