import { useMutation } from '@tanstack/react-query';
import { refreshAll } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/errors';

/**
 * Wraps a business action: shows a toast on success/error and refreshes
 * every query on screen afterwards (see lib/queryClient.refreshAll).
 */
export function useAction<TInput, TResult = unknown>(
  fn: (input: TInput) => Promise<TResult>,
  opts: { success?: string | ((r: TResult) => string); onSuccess?: (r: TResult, input: TInput) => void } = {},
) {
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (result, input) => {
      await refreshAll();
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(result) : opts.success);
      opts.onSuccess?.(result, input);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}
