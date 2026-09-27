import { useCarAlerts, useRentalAlerts } from '@/hooks/useAlerts';
import { PageHeader } from '@/components/ui/PageHeader';
import { AlertList } from '@/components/alerts/AlertList';
import { ErrorState, ListSkeleton } from '@/components/ui/States';

export default function AlertsPage() {
  const r = useRentalAlerts();
  const c = useCarAlerts();
  return (
    <div>
      <PageHeader back title="Alerts" />
      {r.isLoading || c.isLoading ? (
        <ListSkeleton />
      ) : r.error || c.error ? (
        <ErrorState error={r.error ?? c.error} onRetry={() => (r.refetch(), c.refetch())} />
      ) : (
        <AlertList rentalAlerts={r.data ?? []} carAlerts={c.data ?? []} />
      )}
    </div>
  );
}
