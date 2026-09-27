import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: { retry: 0 },
  },
});

/**
 * After any business action (car out, payment, return …) many screens change
 * at once (dashboard, alerts, car, rental, reports). With a small data set it
 * is simplest and safest to refetch everything that is on screen.
 */
export function refreshAll() {
  return queryClient.invalidateQueries();
}
