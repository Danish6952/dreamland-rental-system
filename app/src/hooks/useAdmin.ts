import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';

export const useUsers = () => useQuery({ queryKey: ['users'], queryFn: () => adminService.users() });

export const useAuditLog = (f: Parameters<typeof adminService.auditLog>[0] = {}) =>
  useQuery({ queryKey: ['audit', f], queryFn: () => adminService.auditLog(f) });

/** id -> name map for "who did it" labels */
export function useUserNames() {
  const { data } = useUsers();
  const map = new Map<string, string>();
  data?.forEach((u) => map.set(u.id, u.full_name));
  return map;
}
