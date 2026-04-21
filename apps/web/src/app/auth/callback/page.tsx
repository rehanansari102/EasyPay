'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';

// Handles Google OAuth callback — cookies are already set by the API redirect
export default function AuthCallbackPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    authApi.getMe()
      .then((user) => {
        setAuth(user);
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/auth/login');
      });
  }, [setAuth, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Completing sign in...</p>
    </div>
  );
}
