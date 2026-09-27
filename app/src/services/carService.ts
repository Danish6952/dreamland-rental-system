import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { CarEarnings, CarInput, CarListItem, CarStatus, CarStatusHistory, SoldCar } from '@/types/models';

export type CarFilter = 'active' | CarStatus | 'archived';

export const carService = {
  async list(filter: CarFilter = 'active'): Promise<CarListItem[]> {
    let q = supabase.from('car_list').select('*').order('car_number');
    if (filter === 'active') q = q.is('archived_at', null);
    else if (filter === 'archived') q = q.not('archived_at', 'is', null).neq('status', 'sold');
    else if (filter === 'sold') q = q.eq('status', 'sold');
    else q = q.eq('status', filter).is('archived_at', null);
    return unwrap(await q) as CarListItem[];
  },
  async get(id: string): Promise<CarListItem> {
    return unwrap(await supabase.from('car_list').select('*').eq('id', id).single()) as CarListItem;
  },
  async earnings(id: string): Promise<CarEarnings> {
    return unwrap(await supabase.from('car_earnings').select('*').eq('car_id', id).single()) as CarEarnings;
  },
  async allEarnings(): Promise<CarEarnings[]> {
    return unwrap(await supabase.from('car_earnings').select('*').order('car_number')) as CarEarnings[];
  },
  async history(id: string): Promise<CarStatusHistory[]> {
    return unwrap(
      await supabase.from('car_status_history').select('*').eq('car_id', id).order('changed_at', { ascending: false }),
    ) as CarStatusHistory[];
  },
  async sale(id: string): Promise<SoldCar | null> {
    return unwrap(await supabase.from('sold_cars').select('*').eq('car_id', id).maybeSingle()) as SoldCar | null;
  },
  async create(input: CarInput): Promise<string> {
    const row = unwrap(await supabase.from('cars').insert(input).select('id').single()) as { id: string };
    return row.id;
  },
  async update(id: string, input: CarInput) {
    unwrap(await supabase.from('cars').update(input).eq('id', id));
  },
  async setMaintenance(id: string, toMaintenance: boolean, reason?: string) {
    unwrap(
      await supabase.rpc('set_car_maintenance', {
        p_car_id: id,
        p_to_maintenance: toMaintenance,
        p_reason: reason || null,
      }),
    );
  },
  async sell(
    id: string,
    sale: { sale_date: string; sale_price: number; buyer_name: string; buyer_mobile?: string; buyer_cnic?: string; notes?: string },
  ) {
    unwrap(
      await supabase.rpc('sell_car', {
        p_car_id: id,
        p_sale_date: sale.sale_date,
        p_sale_price: sale.sale_price,
        p_buyer_name: sale.buyer_name,
        p_buyer_mobile: sale.buyer_mobile || null,
        p_buyer_cnic: sale.buyer_cnic || null,
        p_notes: sale.notes || null,
      }),
    );
  },
  async archive(id: string, reason: string) {
    unwrap(await supabase.rpc('archive_car', { p_car_id: id, p_reason: reason }));
  },
  async restore(id: string) {
    unwrap(await supabase.rpc('restore_car', { p_car_id: id }));
  },
};
