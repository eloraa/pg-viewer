'use client';
import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount: number, error: unknown) => {
        function isAuthError(err: unknown): err is { response: { data: { remark: string } } } {
          if (
            typeof err === 'object' &&
            err !== null &&
            'response' in err
          ) {
            const response = (err as { response?: unknown }).response;
            if (
              typeof response === 'object' &&
              response !== null &&
              'data' in response
            ) {
              const data = (response as { data?: unknown }).data;
              if (
                typeof data === 'object' &&
                data !== null &&
                'remark' in data &&
                (data as { remark?: unknown }).remark === 'authentication_error'
              ) {
                return true;
              }
            }
          }
          return false;
        }
        if (isAuthError(error)) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
