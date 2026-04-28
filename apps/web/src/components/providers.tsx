'use client';

import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { toast } from 'sonner';

// Deduplicate network-level errors — when server is down all queries fail at once,
// we want one toast not one per query.
const NETWORK_TOAST_ID = 'network-error';
let networkToastShownAt = 0;

function showDedupedError(error: any) {
  const isNetworkError =
    error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED' || !error?.response;

  if (isNetworkError) {
    const now = Date.now();
    // Only show once per 5 seconds
    if (now - networkToastShownAt < 5_000) return;
    networkToastShownAt = now;
    toast.error(error.message ?? 'Unable to reach the server.', { id: NETWORK_TOAST_ID });
  } else {
    toast.error(error.message ?? 'Something went wrong');
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error: any) => showDedupedError(error),
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            // Don't retry on network errors — server is unreachable, retrying immediately just spams requests
            retry: (failureCount, error: any) => {
              if (error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED') return false;
              return failureCount < 1;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
