import { z } from 'zod';
import {
  dateString,
  fuelLevel,
  mobile,
  money,
  moneyOrZero,
  optionalDate,
  optionalKm,
  optionalPositiveMoney,
  optionalText,
  personName,
  rentPeriod,
} from './common';

export const carOutSchema = z
  .object({
    // Step 1 — car
    car_id: z.string().uuid('Choose a car'),
    // Step 2 — driver
    customer_id: z.string().uuid().nullable().optional(),
    driver_name: personName,
    driver_mobile: mobile,
    driver_license: z.string().trim().min(3, 'At least 3 characters').max(30, 'Too long'),
    // Step 3 — guarantor (required, rule R-9)
    guarantor_name: personName,
    guarantor_mobile: mobile,
    // Step 4 — terms
    rental_type: rentPeriod,
    agreed_rate: money(),
    out_at_local: z.string().min(1, 'Required'),
    expected_return_date: dateString,
    rent_amount: money(100_000_000),
    payment_due_date: optionalDate,
    payment_due_amount: optionalPositiveMoney,
    // Step 5 — extras & money (all optional, rule V-18)
    start_km: optionalKm,
    fuel_out: fuelLevel,
    notes: optionalText(1000),
    advance_amount: moneyOrZero(100_000_000),
    advance_method_id: z.string().optional(),
    deposit_amount: moneyOrZero(100_000_000),
    deposit_method_id: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const outDate = v.out_at_local.slice(0, 10);
    if (v.expected_return_date < outDate) {
      ctx.addIssue({ code: 'custom', path: ['expected_return_date'], message: 'Must be on or after the out date' });
    }
    if (v.out_at_local && new Date(`${v.out_at_local}:00+05:00`).getTime() > Date.now() + 5 * 60_000) {
      ctx.addIssue({ code: 'custom', path: ['out_at_local'], message: 'Cannot be in the future' });
    }
    if (v.payment_due_date && v.payment_due_date < outDate) {
      ctx.addIssue({ code: 'custom', path: ['payment_due_date'], message: 'Must be on or after the out date' });
    }
    if (v.advance_amount > 0 && !v.advance_method_id) {
      ctx.addIssue({ code: 'custom', path: ['advance_method_id'], message: 'Choose how the advance was paid' });
    }
    if (v.deposit_amount > 0 && !v.deposit_method_id) {
      ctx.addIssue({ code: 'custom', path: ['deposit_method_id'], message: 'Choose how the deposit was paid' });
    }
    if (v.advance_amount > v.rent_amount) {
      ctx.addIssue({ code: 'custom', path: ['advance_amount'], message: 'Advance cannot be more than the agreed rent' });
    }
  });

export type CarOutFormInput = z.input<typeof carOutSchema>;
export type CarOutFormOutput = z.output<typeof carOutSchema>;

/** Fields validated on each wizard step */
export const carOutSteps: { title: string; fields: (keyof CarOutFormInput)[] }[] = [
  { title: 'Car', fields: ['car_id'] },
  { title: 'Driver', fields: ['driver_name', 'driver_mobile', 'driver_license'] },
  { title: 'Guarantor', fields: ['guarantor_name', 'guarantor_mobile'] },
  {
    title: 'Rent terms',
    fields: ['rental_type', 'agreed_rate', 'out_at_local', 'expected_return_date', 'rent_amount', 'payment_due_date', 'payment_due_amount'],
  },
  {
    title: 'Extras & money',
    fields: ['start_km', 'fuel_out', 'notes', 'advance_amount', 'advance_method_id', 'deposit_amount', 'deposit_method_id'],
  },
  { title: 'Review', fields: [] },
];

