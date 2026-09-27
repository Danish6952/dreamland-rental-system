import clsx from 'clsx';
import { AlertTriangle, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { errorMessage } from '@/lib/errors';
import { Button } from './Button';

export function EmptyState({ title, message, action, icon }: { title: string; message?: string; action?: ReactNode; icon?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">{icon ?? <Inbox className="size-6" />}</div>
      <p className="font-semibold text-slate-800">{t(title)}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{t(message)}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="card flex flex-col items-center px-6 py-8 text-center" role="alert">
      <AlertTriangle className="mb-2 size-6 text-red-500" />
      <p className="font-semibold text-slate-800">{t('Could not load data')}</p>
      <p className="mt-1 text-sm text-slate-500">{t(errorMessage(error))}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          {t('Try again')}
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-slate-200/80', className)} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card space-y-2 p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Renders loading / error / content for a TanStack query */
export function QueryState<T>({
  query,
  children,
  skeleton,
}: {
  query: { data: T | undefined; isLoading: boolean; error: unknown; refetch: () => unknown };
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
}) {
  if (query.isLoading) return <>{skeleton ?? <ListSkeleton />}</>;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data === undefined) return null;
  return <>{children(query.data)}</>;
}
