import { useQuery } from '@tanstack/react-query';
import { rentalService, type RentalFilter } from '@/services/rentalService';

export const useRentals = (filter: RentalFilter = {}) =>
  useQuery({ queryKey: ['rentals', filter], queryFn: () => rentalService.list(filter) });

export const useRental = (id: string | undefined) =>
  useQuery({ queryKey: ['rental', id], queryFn: () => rentalService.get(id!), enabled: !!id });

export const useRentalHistory = (id: string | undefined, paymentIds: string[] | undefined) =>
  useQuery({
    queryKey: ['rental', id, 'history', paymentIds],
    queryFn: () => rentalService.history(id!, paymentIds ?? []),
    enabled: !!id && !!paymentIds,
  });
