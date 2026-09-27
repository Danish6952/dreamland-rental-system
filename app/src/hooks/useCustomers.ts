import { useQuery } from '@tanstack/react-query';
import { customerService } from '@/services/customerService';

export const useCustomerSearch = (term: string) =>
  useQuery({ queryKey: ['customers', 'search', term], queryFn: () => customerService.search(term) });

export const useCustomerBalances = (includeArchived = false) =>
  useQuery({ queryKey: ['customers', 'balances', includeArchived], queryFn: () => customerService.listBalances(includeArchived) });

export const useCustomer = (id: string | undefined) =>
  useQuery({ queryKey: ['customer', id], queryFn: () => customerService.get(id!), enabled: !!id });

export const useCustomerBalance = (id: string | undefined) =>
  useQuery({ queryKey: ['customer', id, 'balance'], queryFn: () => customerService.balance(id!), enabled: !!id });
