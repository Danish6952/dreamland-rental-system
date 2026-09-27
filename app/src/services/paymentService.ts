import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { PaymentListItem, PaymentMethod, PaymentType } from '@/types/models';

export interface PaymentFilter {
  rentalId?: string;
  customerId?: string;
  carId?: string;
  from?: string;
  to?: string;
  type?: PaymentType | '';
  methodId?: string;
  includeVoided?: boolean;
}

export interface NewPayment {
  rental_id: string;
  type: PaymentType;
  amount: number;
  payment_date: string;
  method_id?: string | null;
  reference?: string | null;
  notes?: string | null;
  next_due_date?: string | null;
  next_due_amount?: number | null;
}

export interface PaymentEdit {
  amount: number;
  payment_date: string;
  method_id: string | null;
  reference?: string | null;
  notes?: string | null;
  reason: string;
}

export const paymentService = {
  async list(f: PaymentFilter = {}): Promise<PaymentListItem[]> {
    let q = supabase
      .from('payment_list')
      .select('*')
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (f.rentalId) q = q.eq('rental_id', f.rentalId);
    if (f.customerId) q = q.eq('customer_id', f.customerId);
    if (f.carId) q = q.eq('car_id', f.carId);
    if (f.from) q = q.gte('payment_date', f.from);
    if (f.to) q = q.lte('payment_date', f.to);
    if (f.type) q = q.eq('type', f.type);
    if (f.methodId) q = q.eq('method_id', f.methodId);
    if (!f.includeVoided) q = q.eq('is_voided', false);
    return unwrap(await q.limit(1000)) as PaymentListItem[];
  },
  async record(p: NewPayment): Promise<string> {
    return unwrap(
      await supabase.rpc('record_payment', {
        p_rental_id: p.rental_id,
        p_type: p.type,
        p_amount: p.amount,
        p_payment_date: p.payment_date,
        p_method_id: p.type === 'deposit_used' ? null : p.method_id || null,
        p_reference: p.reference || null,
        p_notes: p.notes || null,
        p_next_due_date: p.next_due_date || null,
        p_next_due_amount: p.next_due_date ? p.next_due_amount || null : null,
      }),
    ) as string;
  },
  async update(id: string, p: PaymentEdit) {
    unwrap(
      await supabase.rpc('update_payment', {
        p_payment_id: id,
        p_amount: p.amount,
        p_payment_date: p.payment_date,
        p_method_id: p.method_id,
        p_reference: p.reference || null,
        p_notes: p.notes || null,
        p_reason: p.reason,
      }),
    );
  },
  async void(id: string, reason: string) {
    unwrap(await supabase.rpc('void_payment', { p_payment_id: id, p_reason: reason }));
  },
  async methods(includeInactive = false): Promise<PaymentMethod[]> {
    let q = supabase.from('payment_methods').select('*').order('sort_order').order('name');
    if (!includeInactive) q = q.eq('is_active', true);
    return unwrap(await q) as PaymentMethod[];
  },
  async addMethod(name: string) {
    const code = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^(\d)/, 'm_$1')
      .slice(0, 30);
    unwrap(await supabase.from('payment_methods').insert({ code: code || `method_${Date.now()}`, name: name.trim() }));
  },
  async setMethodActive(id: string, isActive: boolean) {
    unwrap(await supabase.from('payment_methods').update({ is_active: isActive }).eq('id', id));
  },
};
