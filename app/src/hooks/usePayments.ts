import { useQuery } from '@tanstack/react-query';
import { paymentService, type PaymentFilter } from '@/services/paymentService';

export const usePayments = (filter: PaymentFilter = {}, enabled = true) =>
  useQuery({ queryKey: ['payments', filter], queryFn: () => paymentService.list(filter), enabled });

export const usePaymentMethods = (includeInactive = false) =>
  useQuery({
    queryKey: ['paymentMethods', includeInactive],
    queryFn: () => paymentService.methods(includeInactive),
    staleTime: 5 * 60_000,
  });
