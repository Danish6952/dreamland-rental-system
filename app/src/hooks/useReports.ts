import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/reportService';

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => reportService.dashboard(), refetchInterval: 60_000 });

export const useIncome = (from: string, to: string) =>
  useQuery({ queryKey: ['income', from, to], queryFn: () => reportService.income(from, to) });
