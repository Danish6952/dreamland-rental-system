import { describe, expect, it } from 'vitest';
import { carSchema } from './carSchema';
import { makeCarReturnSchema } from './carReturnSchema';
import { makePaymentSchema, maxForType } from './paymentSchema';
import { makeSellSchema } from './sellSchema';
import { todayPKT } from '@/lib/format';

describe('carSchema', () => {
  it('requires number, model, rent; uppercases number', () => {
    const r = carSchema.safeParse({ car_number: 'abc-123', model: 'Corolla', standard_rent: '50000', standard_rent_period: 'monthly' });
    expect(r.success).toBe(true);
    expect(r.success && r.data.car_number).toBe('ABC-123');
    expect(r.success && r.data.year).toBeNull();
  });
  it('rejects negative rent and bad year', () => {
    expect(carSchema.safeParse({ car_number: 'A1', model: 'X', standard_rent: -1, standard_rent_period: 'daily' }).success).toBe(false);
    expect(carSchema.safeParse({ car_number: 'A1', model: 'X', standard_rent: 1, standard_rent_period: 'daily', year: 1970 }).success).toBe(false);
  });
});

describe('payment limits (P-4, D-4, D-5)', () => {
  const ctx = { pending: 2000, depositBalance: 15000, outDate: '2026-01-01' };
  it('computes max per type', () => {
    expect(maxForType('rent', ctx)).toBe(2000);
    expect(maxForType('deposit_used', ctx)).toBe(2000);
    expect(maxForType('deposit_returned', ctx)).toBe(15000);
    expect(maxForType('refund', ctx)).toBe(0);
    expect(maxForType('deposit_taken', ctx)).toBeNull();
  });
  it('blocks overpayment and missing method', () => {
    const s = makePaymentSchema(ctx);
    const base = { type: 'rent', payment_date: todayPKT(), method_id: 'm' } as const;
    expect(s.safeParse({ ...base, amount: '2000' }).success).toBe(true);
    expect(s.safeParse({ ...base, amount: '2001' }).success).toBe(false);
    expect(s.safeParse({ ...base, amount: '0' }).success).toBe(false);
    expect(s.safeParse({ ...base, amount: '100', method_id: undefined }).success).toBe(false);
    expect(s.safeParse({ type: 'deposit_used', amount: '100', payment_date: todayPKT() }).success).toBe(true);
  });
});

describe('car return (V-10, V-11, V-15)', () => {
  const s = makeCarReturnSchema({ outAtIso: '2026-01-01T05:00:00Z', startKm: 1000, paidSoFar: 25000, depositHeld: 20000 });
  const ok = { returned_at_local: '2026-02-01T10:00', rent_amount: 45000, next_car_status: 'available' };
  it('accepts a return with no optional fields', () => expect(s.safeParse(ok).success).toBe(true));
  it('rejects end km below start km', () => expect(s.safeParse({ ...ok, end_km: 999 }).success).toBe(false));
  it('requires a note for other charge', () => expect(s.safeParse({ ...ok, other_charge: 500 }).success).toBe(false));
  it('caps deposit use at pending and held', () => {
    expect(s.safeParse({ ...ok, deposit_used: 20000 }).success).toBe(true); // pending 20,000
    expect(s.safeParse({ ...ok, deposit_used: 20001 }).success).toBe(false);
  });
  it('caps payment at pending after deposit use', () => {
    expect(s.safeParse({ ...ok, deposit_used: 5000, payment_amount: 15000, payment_method_id: 'm' }).success).toBe(true);
    expect(s.safeParse({ ...ok, deposit_used: 5000, payment_amount: 15001, payment_method_id: 'm' }).success).toBe(false);
  });
});

describe('sell confirmation (V-17)', () => {
  it('requires typing the car number (ignoring case/spaces)', () => {
    const s = makeSellSchema('ABC-123');
    const base = { sale_date: todayPKT(), sale_price: 1, buyer_name: 'Buyer Name' };
    expect(s.safeParse({ ...base, confirm: 'abc 123' }).success).toBe(true);
    expect(s.safeParse({ ...base, confirm: 'ABC-124' }).success).toBe(false);
  });
});
