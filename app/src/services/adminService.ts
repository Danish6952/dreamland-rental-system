import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { AuditLogEntry, Profile, UserRole } from '@/types/models';

export const adminService = {
  async users(): Promise<Profile[]> {
    return unwrap(await supabase.from('profiles').select('*').order('created_at')) as Profile[];
  },
  async setUserAccess(userId: string, role: UserRole, isActive: boolean) {
    unwrap(await supabase.rpc('set_user_access', { p_user_id: userId, p_role: role, p_is_active: isActive }));
  },
  async auditLog(f: { table?: string; userId?: string; from?: string; to?: string; limit?: number } = {}): Promise<AuditLogEntry[]> {
    let q = supabase.from('audit_log').select('*').order('changed_at', { ascending: false });
    if (f.table) q = q.eq('table_name', f.table);
    if (f.userId) q = q.eq('changed_by', f.userId);
    if (f.from) q = q.gte('changed_at', `${f.from}T00:00:00+05:00`);
    if (f.to) q = q.lte('changed_at', `${f.to}T23:59:59+05:00`);
    return unwrap(await q.limit(f.limit ?? 200)) as AuditLogEntry[];
  },
};
