import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { Customer, CustomerBalance } from '@/types/models';

export const customerService = {
  /** Search by name or mobile (for Car Out) */
  async search(term: string): Promise<Customer[]> {
    const t = term.trim();
    let q = supabase.from('customers').select('*').is('archived_at', null).order('full_name').limit(10);
    if (t) {
      const digits = t.replace(/\D/g, '').replace(/^92/, '0');
      const safe = t.replace(/[%,()]/g, '');
      q = digits.length >= 3 ? q.or(`full_name.ilike.%${safe}%,mobile.ilike.%${digits}%`) : q.ilike('full_name', `%${safe}%`);
    }
    return unwrap(await q) as Customer[];
  },
  async listBalances(includeArchived = false): Promise<CustomerBalance[]> {
    let q = supabase.from('customer_balances').select('*').order('full_name');
    if (!includeArchived) q = q.is('archived_at', null);
    return unwrap(await q) as CustomerBalance[];
  },
  async get(id: string): Promise<Customer> {
    return unwrap(await supabase.from('customers').select('*').eq('id', id).single()) as Customer;
  },
  async balance(id: string): Promise<CustomerBalance> {
    return unwrap(await supabase.from('customer_balances').select('*').eq('customer_id', id).single()) as CustomerBalance;
  },
  async update(id: string, patch: Pick<Customer, 'full_name' | 'mobile' | 'license_number' | 'cnic' | 'notes'>) {
    unwrap(await supabase.from('customers').update(patch).eq('id', id));
  },
  async archive(id: string, reason?: string) {
    unwrap(await supabase.rpc('archive_customer', { p_customer_id: id, p_reason: reason || null }));
  },
  async restore(id: string) {
    unwrap(await supabase.rpc('restore_customer', { p_customer_id: id }));
  },
};
