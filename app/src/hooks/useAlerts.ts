import { useQuery } from '@tanstack/react-query';
import { alertService } from '@/services/alertService';

export const useRentalAlerts = () =>
  useQuery({ queryKey: ['alerts', 'rentals'], queryFn: () => alertService.rentalAlerts(), refetchInterval: 60_000 });

export const useCarAlerts = () =>
  useQuery({ queryKey: ['alerts', 'cars'], queryFn: () => alertService.carAlerts(), refetchInterval: 5 * 60_000 });

/** Total number of alerts (for the bell badge) */
export function useAlertCount() {
  const r = useRentalAlerts();
  const c = useCarAlerts();
  return (r.data?.length ?? 0) + (c.data?.length ?? 0);
}
