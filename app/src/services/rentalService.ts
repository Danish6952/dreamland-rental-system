import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { AuditLogEntry, FuelLevel, RentPeriod, RentalBalance, RentalStatus, CarStatus } from '@/types/models';

export interface RentalFilter {
  status?: RentalStatus | 'active' | 'all';
  carId?: string;
  customerId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface CarOutInput {
  car_id: string;
  customer_id?: string | null;
  driver_name: string;
  driver_mobile: string;
  driver_license: string;
  guarantor_name: string;
  guarantor_mobile: string;
  rental_type: RentPeriod;
  agreed_rate: number;
  rent_amount: number;
  out_at: string;
  expected_return_date: string;
  payment_due_date?: string | null;
  payment_due_amount?: number | null;
  start_km?: number | null;
  fuel_out?: FuelLevel | null;
  notes?: string | null;
  advance_amount?: number | null;
  advance_method_id?: string | null;
  deposit_amount?: number | null;
  deposit_method_id?: string | null;
}

export interface CarReturnInput {
  rental_id: string;
  returned_at: string;
  end_km?: number | null;
  fuel_in?: FuelLevel | null;
  rent_amount: number;
  fuel_charge: number;
  damage_charge: number;
  damage_notes?: string | null;
  extra_km_charge: number;
  other_charge: number;
  other_charge_note?: string | null;
  next_car_status: Extract<CarStatus, 'available' | 'maintenance'>;
  car_status_reason?: string | null;
  deposit_used: number;
  payment_amount: number;
  payment_method_id?: string | null;
  deposit_returned: number;
  deposit_return_method_id?: string | null;
  notes?: string | null;
}

export interface RentalUpdateInput {
  reason: string;
  expected_return_date?: string | null;
  agreed_rate?: number | null;
  rent_amount?: number | null;
  fuel_charge?: number | null;
  damage_charge?: number | null;
  damage_notes?: string | null;
  extra_km_charge?: number | null;
  other_charge?: number | null;
  other_charge_note?: string | null;
  start_km?: number | null;
  end_km?: number | null;
  fuel_out?: FuelLevel | null;
  fuel_in?: FuelLevel | null;
  returned_at?: string | null;
  guarantor_name?: string | null;
  guarantor_mobile?: string | null;
  notes?: string | null;
}

const orNull = <T,>(v: T | undefined | '' | null) => (v === undefined || v === '' ? null : v);

export const rentalService = {
  async list(filter: RentalFilter = {}): Promise<RentalBalance[]> {
    let q = supabase.from('rental_balances').select('*').order('out_at', { ascending: false });
    const s = filter.status ?? 'all';
    if (s === 'active') q = q.in('status', ['out', 'returned']);
    else if (s !== 'all') q = q.eq('status', s);
    if (filter.carId) q = q.eq('car_id', filter.carId);
    if (filter.customerId) q = q.eq('customer_id', filter.customerId);
    if (filter.from) q = q.gte('out_at', `${filter.from}T00:00:00+05:00`);
    if (filter.to) q = q.lte('out_at', `${filter.to}T23:59:59+05:00`);
    if (filter.search?.trim()) {
      const t = filter.search.trim().replace(/[%,()]/g, '');
      q = q.or(`rental_number.ilike.%${t}%,driver_name.ilike.%${t}%,car_number.ilike.%${t}%,driver_mobile.ilike.%${t}%`);
    }
    return unwrap(await q.limit(500)) as RentalBalance[];
  },
  async get(id: string): Promise<RentalBalance> {
    return unwrap(await supabase.from('rental_balances').select('*').eq('id', id).single()) as RentalBalance;
  },
  async carOut(i: CarOutInput): Promise<string> {
    return unwrap(
      await supabase.rpc('car_out', {
        p_car_id: i.car_id,
        p_customer_id: orNull(i.customer_id),
        p_driver_name: i.driver_name,
        p_driver_mobile: i.driver_mobile,
        p_driver_license: i.driver_license,
        p_guarantor_name: i.guarantor_name,
        p_guarantor_mobile: i.guarantor_mobile,
        p_rental_type: i.rental_type,
        p_agreed_rate: i.agreed_rate,
        p_rent_amount: i.rent_amount,
        p_out_at: i.out_at,
        p_expected_return_date: i.expected_return_date,
        p_payment_due_date: orNull(i.payment_due_date),
        p_payment_due_amount: orNull(i.payment_due_amount),
        p_start_km: orNull(i.start_km),
        p_fuel_out: orNull(i.fuel_out),
        p_notes: orNull(i.notes),
        p_advance_amount: i.advance_amount || 0,
        p_advance_method_id: orNull(i.advance_method_id),
        p_deposit_amount: i.deposit_amount || 0,
        p_deposit_method_id: orNull(i.deposit_method_id),
      }),
    ) as string;
  },
  async carReturn(i: CarReturnInput): Promise<RentalStatus> {
    return unwrap(
      await supabase.rpc('car_return', {
        p_rental_id: i.rental_id,
        p_returned_at: i.returned_at,
        p_end_km: orNull(i.end_km),
        p_fuel_in: orNull(i.fuel_in),
        p_rent_amount: i.rent_amount,
        p_fuel_charge: i.fuel_charge || 0,
        p_damage_charge: i.damage_charge || 0,
        p_damage_notes: orNull(i.damage_notes),
        p_extra_km_charge: i.extra_km_charge || 0,
        p_other_charge: i.other_charge || 0,
        p_other_charge_note: orNull(i.other_charge_note),
        p_next_car_status: i.next_car_status,
        p_car_status_reason: orNull(i.car_status_reason),
        p_deposit_used: i.deposit_used || 0,
        p_payment_amount: i.payment_amount || 0,
        p_payment_method_id: orNull(i.payment_method_id),
        p_deposit_returned: i.deposit_returned || 0,
        p_deposit_return_method_id: orNull(i.deposit_return_method_id),
        p_notes: orNull(i.notes),
      }),
    ) as RentalStatus;
  },
  async update(id: string, i: RentalUpdateInput) {
    unwrap(
      await supabase.rpc('update_rental', {
        p_rental_id: id,
        p_reason: i.reason,
        p_expected_return_date: orNull(i.expected_return_date),
        p_agreed_rate: orNull(i.agreed_rate),
        p_rent_amount: orNull(i.rent_amount),
        p_fuel_charge: orNull(i.fuel_charge),
        p_damage_charge: orNull(i.damage_charge),
        p_damage_notes: i.damage_notes ?? null,
        p_extra_km_charge: orNull(i.extra_km_charge),
        p_other_charge: orNull(i.other_charge),
        p_other_charge_note: i.other_charge_note ?? null,
        p_start_km: orNull(i.start_km),
        p_end_km: orNull(i.end_km),
        p_fuel_out: orNull(i.fuel_out),
        p_fuel_in: orNull(i.fuel_in),
        p_returned_at: orNull(i.returned_at),
        p_guarantor_name: orNull(i.guarantor_name),
        p_guarantor_mobile: orNull(i.guarantor_mobile),
        p_notes: i.notes ?? null,
      }),
    );
  },
  async setNextDue(id: string, dueDate: string | null, dueAmount: number | null) {
    unwrap(
      await supabase.rpc('set_next_payment_due', { p_rental_id: id, p_due_date: dueDate, p_due_amount: dueAmount }),
    );
  },
  async void(id: string, reason: string) {
    unwrap(await supabase.rpc('void_rental', { p_rental_id: id, p_reason: reason }));
  },
  /** Audit trail for the rental and its payments */
  async history(id: string, paymentIds: string[]): Promise<AuditLogEntry[]> {
    const ids = [id, ...paymentIds];
    return unwrap(
      await supabase
        .from('audit_log')
        .select('*')
        .in('record_id', ids)
        .order('changed_at', { ascending: false })
        .limit(200),
    ) as AuditLogEntry[];
  },
};
