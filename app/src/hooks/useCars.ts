import { useQuery } from '@tanstack/react-query';
import { carService, type CarFilter } from '@/services/carService';

export const useCars = (filter: CarFilter = 'active') =>
  useQuery({ queryKey: ['cars', filter], queryFn: () => carService.list(filter) });

export const useCar = (id: string | undefined) =>
  useQuery({ queryKey: ['car', id], queryFn: () => carService.get(id!), enabled: !!id });

export const useCarEarnings = (id: string | undefined) =>
  useQuery({ queryKey: ['car', id, 'earnings'], queryFn: () => carService.earnings(id!), enabled: !!id });

export const useAllCarEarnings = () => useQuery({ queryKey: ['carEarnings'], queryFn: () => carService.allEarnings() });

export const useCarHistory = (id: string | undefined) =>
  useQuery({ queryKey: ['car', id, 'history'], queryFn: () => carService.history(id!), enabled: !!id });

export const useCarSale = (id: string | undefined, enabled = true) =>
  useQuery({ queryKey: ['car', id, 'sale'], queryFn: () => carService.sale(id!), enabled: !!id && enabled });
