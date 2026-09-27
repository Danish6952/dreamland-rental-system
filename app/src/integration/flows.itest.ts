/**
 * End-to-end check of the service layer against a real GoTrue + PostgREST +
 * PostgreSQL (the local stack). Exercises the same code the screens use.
 *   ./supabase/local/stack.sh up && npm run test:integration
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { carService } from '@/services/carService';
import { customerService } from '@/services/customerService';
import { rentalService } from '@/services/rentalService';
import { paymentService } from '@/services/paymentService';
import { reportService } from '@/services/reportService';
import { alertService } from '@/services/alertService';
import { adminService } from '@/services/adminService';
import { addDays, todayPKT } from '@/lib/format';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const URL_ = env.VITE_SUPABASE_URL;
const stamp = Date.now();
const OWNER = { email: `owner${stamp}@dreamland.test`, password: 'Owner-pass-123' };
const STAFF = { email: `brother${stamp}@dreamland.test`, password: 'Staff-pass-123' };

async function adminCreateUser(u: { email: string; password: string }, name: string) {
  const res = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: env.LOCAL_SERVICE_KEY, authorization: `Bearer ${env.LOCAL_SERVICE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...u, email_confirm: true, user_metadata: { full_name: name } }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).id as string;
}
const supabaseUserId = () => currentUserId;
let currentUserId = '';
const as = async (u: typeof OWNER) => {
  await authService.signOut();
  await authService.signIn(u.email, u.password);
  currentUserId = (await supabase.auth.getUser()).data.user!.id;
};

let methods: Record<string, string>;
let carId: string;
let car2Id: string;
let rentalId: string;
let staffId: string;

const CUSTOMER = `Customer B${stamp}`;
const CUSTOMER_MOBILE = `0300${String(stamp).slice(-7)}`;

beforeAll(async () => {
  const ownerId = await adminCreateUser(OWNER, 'Owner');
  staffId = await adminCreateUser(STAFF, 'Brother');
  // Only the very first user of a fresh database becomes owner automatically
  // (tested in supabase/tests). Re-runs reuse the stack, so promote explicitly.
  execSync(`docker exec dl-db psql -U postgres -qc "update public.profiles set role='owner' where id='${ownerId}'"`);
});

describe('auth & roles', () => {
  it('owner and staff roles', async () => {
    await as(OWNER);
    const users = await adminService.users();
    expect(users.find((u) => u.id === supabaseUserId())?.role).toBe('owner');
    expect(users.find((u) => u.id === staffId)?.role).toBe('staff');
  });
  it('rejects a wrong password with a friendly message', async () => {
    await authService.signOut();
    await expect(authService.signIn(OWNER.email, 'wrong')).rejects.toThrow('Wrong email or password');
  });
  it('public sign-up is disabled', async () => {
    const { error } = await supabase.auth.signUp({ email: `x${stamp}@t.test`, password: 'Abcdef-123' });
    expect(error).toBeTruthy();
  });
  it('anonymous callers see no data', async () => {
    await authService.signOut();
    await expect(carService.list()).rejects.toThrow();
  });
});

describe('cars (staff)', () => {
  it('adds cars and blocks duplicates', async () => {
    await as(STAFF);
    methods = Object.fromEntries((await paymentService.methods()).map((m) => [m.code, m.id]));
    carId = await carService.create({
      car_number: `ABC-${stamp % 1000}`,
      make: 'Toyota',
      model: 'Corolla GLi',
      year: 2020,
      color: 'White',
      registered_to: null,
      standard_rent: 50000,
      standard_rent_period: 'monthly',
      insurance_expiry: addDays(todayPKT(), 10),
      notes: null,
    });
    car2Id = await carService.create({
      car_number: `LEA ${stamp % 1000}`,
      make: 'Honda',
      model: 'City',
      year: null,
      color: null,
      registered_to: null,
      standard_rent: 4000,
      standard_rent_period: 'daily',
      insurance_expiry: null,
      notes: null,
    });
    await expect(
      carService.create({ car_number: `abc ${stamp % 1000}`, model: 'X', standard_rent: 1, standard_rent_period: 'daily' } as never),
    ).rejects.toThrow('A car with this number already exists');
    const list = await carService.list('available');
    expect(list.map((c) => c.id)).toEqual(expect.arrayContaining([carId, car2Id]));
    const alerts = await alertService.carAlerts();
    expect(alerts.find((a) => a.car_id === carId)?.alert_type).toBe('insurance_expiring');
  });
  it('maintenance on/off with history', async () => {
    await carService.setMaintenance(car2Id, true, 'AC repair');
    expect((await carService.get(car2Id)).status).toBe('maintenance');
    await carService.setMaintenance(car2Id, false);
    const h = await carService.history(car2Id);
    expect(h.some((x) => x.reason === 'AC repair')).toBe(true);
  });
});

describe('worked example (05 §5) through the service layer', () => {
  it('car out', async () => {
    rentalId = await rentalService.carOut({
      car_id: carId,
      driver_name: CUSTOMER,
      driver_mobile: CUSTOMER_MOBILE,
      driver_license: 'LHR-12345',
      guarantor_name: 'Guarantor B',
      guarantor_mobile: '+92 312 7654321',
      rental_type: 'monthly',
      agreed_rate: 45000,
      rent_amount: 45000,
      out_at: new Date(Date.now() - 20 * 86400_000).toISOString(),
      expected_return_date: addDays(todayPKT(), 10),
      advance_amount: 10000,
      advance_method_id: methods.cash,
      deposit_amount: 20000,
      deposit_method_id: methods.bank_transfer,
    });
    const r = await rentalService.get(rentalId);
    expect([Number(r.total_bill), Number(r.total_paid), Number(r.pending), Number(r.deposit_balance)]).toEqual([45000, 10000, 35000, 20000]);
    expect(r.guarantor_mobile).toBe('03127654321');
    expect((await carService.get(carId)).status).toBe('on_rent');
  });
  it('second car out of the same car is refused', async () => {
    await expect(
      rentalService.carOut({
        car_id: carId, driver_name: 'X Y', driver_mobile: '03001112223', driver_license: 'L-1', guarantor_name: 'G H',
        guarantor_mobile: '03001112224', rental_type: 'daily', agreed_rate: 1, rent_amount: 1, out_at: new Date().toISOString(),
        expected_return_date: todayPKT(),
      }),
    ).rejects.toThrow(/no longer available/);
  });
  it('customer search finds by name and mobile', async () => {
    expect((await customerService.search(CUSTOMER)).length).toBe(1);
    expect((await customerService.search(CUSTOMER_MOBILE.slice(0, 4) + ' ' + CUSTOMER_MOBILE.slice(4))).length).toBe(1);
  });
  it('instalment + overpayment block', async () => {
    await paymentService.record({ rental_id: rentalId, type: 'rent', amount: 15000, payment_date: todayPKT(), method_id: methods.mobile_wallet });
    await expect(
      paymentService.record({ rental_id: rentalId, type: 'rent', amount: 999999, payment_date: todayPKT(), method_id: methods.cash }),
    ).rejects.toThrow(/Maximum allowed: Rs 20,000/);
  });
  it('return with charges and settlement', async () => {
    const status = await rentalService.carReturn({
      rental_id: rentalId,
      returned_at: new Date().toISOString(),
      rent_amount: 45000,
      fuel_charge: 2000,
      damage_charge: 5000,
      damage_notes: 'Bumper',
      extra_km_charge: 0,
      other_charge: 0,
      next_car_status: 'maintenance',
      car_status_reason: 'Bumper repair',
      deposit_used: 5000,
      payment_amount: 20000,
      payment_method_id: methods.cash,
      deposit_returned: 15000,
      deposit_return_method_id: methods.cash,
    });
    expect(status).toBe('returned');
    const r = await rentalService.get(rentalId);
    expect([Number(r.total_bill), Number(r.total_paid), Number(r.pending), Number(r.deposit_balance)]).toEqual([52000, 50000, 2000, 0]);
    expect((await carService.get(carId)).status).toBe('maintenance');
    const alerts = await alertService.rentalAlerts();
    expect(alerts.find((a) => a.rental_id === rentalId)?.alert_type).toBe('payment_pending');
  });
  it('final payment closes the rental', async () => {
    await paymentService.record({ rental_id: rentalId, type: 'rent', amount: 2000, payment_date: todayPKT(), method_id: methods.cash });
    expect((await rentalService.get(rentalId)).status).toBe('closed');
  });
  it('payment edit is audited and can reopen', async () => {
    const p = (await paymentService.list({ rentalId })).find((x) => Number(x.amount) === 2000 && x.type === 'rent')!;
    await expect(paymentService.update(p.id, { amount: 1500, payment_date: todayPKT(), method_id: methods.cash, reason: '' })).rejects.toThrow(/reason/);
    await paymentService.update(p.id, { amount: 1500, payment_date: todayPKT(), method_id: methods.cash, reason: 'Paid 1500 only' });
    expect((await rentalService.get(rentalId)).status).toBe('returned');
    const hist = await rentalService.history(rentalId, [p.id]);
    expect(hist.some((h) => h.reason === 'Paid 1500 only')).toBe(true);
    await paymentService.update(p.id, { amount: 2000, payment_date: todayPKT(), method_id: methods.cash, reason: 'Corrected back' });
    expect((await rentalService.get(rentalId)).status).toBe('closed');
    expect((await paymentService.list({ rentalId }))[0].created_by_name).toBe('Brother');
  });
  it('reports agree with each other', async () => {
    const income = await reportService.income(addDays(todayPKT(), -60), todayPKT());
    expect(income.filter((r) => r.rental_id === rentalId).reduce((s, r) => s + Number(r.amount), 0)).toBe(52000);
    const d = await reportService.dashboard();
    expect(d.maintenance_count).toBeGreaterThanOrEqual(1);
    const cust = await customerService.listBalances();
    expect(Number(cust.find((c) => c.full_name === CUSTOMER)?.total_paid)).toBe(52000);
    const earn = await carService.earnings(carId);
    expect(Number(earn.total_received)).toBe(52000);
    const search = await rentalService.list({ search: CUSTOMER });
    expect(search.map((r) => r.id)).toContain(rentalId);
    const audit = await adminService.auditLog({ table: 'payments' });
    expect(audit.length).toBeGreaterThan(0);
  });
});

describe('owner-only rules', () => {
  it('staff cannot void, sell or change users', async () => {
    const p = (await paymentService.list({ rentalId }))[0];
    await expect(paymentService.void(p.id, 'testing')).rejects.toThrow('Only the owner can do this');
    await expect(carService.sell(car2Id, { sale_date: todayPKT(), sale_price: 1, buyer_name: 'Buyer' })).rejects.toThrow('Only the owner can do this');
    await expect(adminService.setUserAccess(staffId, 'owner', true)).rejects.toThrow('Only the owner can do this');
    await expect(paymentService.addMethod('Cheque')).rejects.toThrow();
  });
  it('staff cannot write rentals/payments directly', async () => {
    const { error } = await supabase.from('payments').insert({ rental_id: rentalId, payment_date: todayPKT(), amount: 1, type: 'rent' });
    expect(error).toBeTruthy();
    const { error: e2 } = await supabase.from('cars').update({ status: 'available' }).eq('id', carId);
    expect(e2).toBeTruthy();
    const { error: e3, count } = await supabase.from('audit_log').delete({ count: 'exact' }).gt('id', 0);
    expect(e3 || count === 0).toBeTruthy();
  });
  it('owner sells a car; history kept', async () => {
    await as(OWNER);
    await paymentService.addMethod(`Cheque ${stamp}`);
    expect((await paymentService.methods()).some((m) => m.name === `Cheque ${stamp}`)).toBe(true);
    await carService.setMaintenance(carId, false);
    await carService.sell(carId, { sale_date: todayPKT(), sale_price: 3500000, buyer_name: 'Buyer Name', buyer_mobile: '03009998887' });
    const c = await carService.get(carId);
    expect(c.status).toBe('sold');
    expect((await carService.list('active')).some((x) => x.id === carId)).toBe(false);
    expect((await carService.list('sold')).some((x) => x.id === carId)).toBe(true);
    expect((await rentalService.list({ carId })).length).toBe(1);
    expect((await carService.sale(carId))?.buyer_mobile).toBe('03009998887');
  });
  it('disabled user sees nothing', async () => {
    await adminService.setUserAccess(staffId, 'staff', false);
    await as(STAFF);
    expect(await carService.list()).toEqual([]);
    const me = await authService.getProfile(staffId);
    expect(me?.is_active).toBe(false);
    await as(OWNER);
    await adminService.setUserAccess(staffId, 'staff', true);
  });
});
