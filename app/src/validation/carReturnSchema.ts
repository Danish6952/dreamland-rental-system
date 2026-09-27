import { z } from 'zod';
import { fuelLevel, moneyOrZero, money, optionalKm, optionalText } from './common';

export interface ReturnContext {
  outAtIso: string;
  startKm: number | null;
  /** Paid so far (advance + rent + deposit used − refunds) */
  paidSoFar: number;
  /** Deposit currently held */
  depositHeld: number;
}

/** Built per rental so limits can use its current balances (rules D-4, D-5, P-4) */
export function makeCarReturnSchema(c: ReturnContext) {
  return z
    .object({
      returned_at_local: z.string().min(1, 'Required'),
      end_km: optionalKm,
      fuel_in: fuelLevel,
      rent_amount: money(100_000_000),
      fuel_charge: moneyOrZero(),
      damage_charge: moneyOrZero(),
      damage_notes: optionalText(1000),
      extra_km_charge: moneyOrZero(),
      other_charge: moneyOrZero(),
      other_charge_note: optionalText(300),
      next_car_status: z.enum(['available', 'maintenance']),
      car_status_reason: optionalText(200),
      deposit_used: moneyOrZero(100_000_000),
      payment_amount: moneyOrZero(100_000_000),
      payment_method_id: z.string().optional(),
      deposit_returned: moneyOrZero(100_000_000),
      deposit_return_method_id: z.string().optional(),
      notes: optionalText(1000),
    })
    .superRefine((v, ctx) => {
      const returned = new Date(`${v.returned_at_local}:00+05:00`).getTime();
      if (returned > Date.now() + 5 * 60_000) {
        ctx.addIssue({ code: 'custom', path: ['returned_at_local'], message: 'Cannot be in the future' });
      }
      if (returned < new Date(c.outAtIso).getTime()) {
        ctx.addIssue({ code: 'custom', path: ['returned_at_local'], message: 'Cannot be before the out time' });
      }
      if (v.end_km != null && c.startKm != null && v.end_km < c.startKm) {
        ctx.addIssue({ code: 'custom', path: ['end_km'], message: `Cannot be less than start KM (${c.startKm})` });
      }
      if (v.other_charge > 0 && !v.other_charge_note) {
        ctx.addIssue({ code: 'custom', path: ['other_charge_note'], message: 'Say what the other charge is for' });
      }
      const bill = v.rent_amount + v.fuel_charge + v.damage_charge + v.extra_km_charge + v.other_charge;
      const pendingBefore = bill - c.paidSoFar;
      if (v.deposit_used > c.depositHeld) {
        ctx.addIssue({ code: 'custom', path: ['deposit_used'], message: 'More than the deposit held' });
      }
      if (v.deposit_used > Math.max(pendingBefore, 0)) {
        ctx.addIssue({ code: 'custom', path: ['deposit_used'], message: 'More than the pending amount' });
      }
      if (v.payment_amount > Math.max(pendingBefore - v.deposit_used, 0)) {
        ctx.addIssue({ code: 'custom', path: ['payment_amount'], message: 'More than the pending amount' });
      }
      if (v.payment_amount > 0 && !v.payment_method_id) {
        ctx.addIssue({ code: 'custom', path: ['payment_method_id'], message: 'Choose a payment method' });
      }
      if (v.deposit_returned > c.depositHeld - v.deposit_used) {
        ctx.addIssue({ code: 'custom', path: ['deposit_returned'], message: 'More than the remaining deposit' });
      }
      if (v.deposit_returned > 0 && !v.deposit_return_method_id) {
        ctx.addIssue({ code: 'custom', path: ['deposit_return_method_id'], message: 'Choose how the deposit was returned' });
      }
    });
}

export type CarReturnFormInput = z.input<ReturnType<typeof makeCarReturnSchema>>;
export type CarReturnFormOutput = z.output<ReturnType<typeof makeCarReturnSchema>>;
