import { z } from 'zod';
import { todayPKT } from '@/lib/format';
import type { PaymentType } from '@/types/models';
import { dateString, optionalDate, optionalPositiveMoney, optionalText, reason } from './common';

export interface PaymentContext {
  pending: number;
  depositBalance: number;
  outDate: string;
}

/** Maximum allowed amount for a payment type (rules P-4, D-4, D-5) */
export function maxForType(type: PaymentType, c: PaymentContext): number | null {
  switch (type) {
    case 'advance':
    case 'rent':
      return Math.max(c.pending, 0);
    case 'deposit_used':
      return Math.max(Math.min(c.depositBalance, c.pending), 0);
    case 'deposit_returned':
      return Math.max(c.depositBalance, 0);
    case 'refund':
      return Math.max(-c.pending, 0);
    case 'deposit_taken':
      return null;
  }
}

const amount = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number({ required_error: 'Enter an amount', invalid_type_error: 'Enter an amount' }).positive('Must be more than 0'),
);

export function makePaymentSchema(c: PaymentContext) {
  return z
    .object({
      type: z.enum(['advance', 'rent', 'deposit_taken', 'deposit_used', 'deposit_returned', 'refund']),
      amount,
      payment_date: dateString,
      method_id: z.string().optional(),
      reference: optionalText(80),
      notes: optionalText(500),
      next_due_date: optionalDate,
      next_due_amount: optionalPositiveMoney,
    })
    .superRefine((v, ctx) => {
      const max = maxForType(v.type, c);
      if (max !== null && v.amount > max) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: max === 0 ? 'Nothing can be recorded for this type right now' : `Maximum Rs ${max.toLocaleString('en-IN')}`,
        });
      }
      if (v.payment_date > todayPKT()) ctx.addIssue({ code: 'custom', path: ['payment_date'], message: 'Cannot be in the future' });
      if (v.payment_date < c.outDate) ctx.addIssue({ code: 'custom', path: ['payment_date'], message: 'Before the rental started' });
      if (v.type !== 'deposit_used' && !v.method_id) {
        ctx.addIssue({ code: 'custom', path: ['method_id'], message: 'Choose a payment method' });
      }
    });
}

export type PaymentFormInput = z.input<ReturnType<typeof makePaymentSchema>>;
export type PaymentFormOutput = z.output<ReturnType<typeof makePaymentSchema>>;

export const editPaymentSchema = z
  .object({
    type: z.string(),
    amount,
    payment_date: dateString.refine((v) => v <= todayPKT(), 'Cannot be in the future'),
    method_id: z.string().optional(),
    reference: optionalText(80),
    notes: optionalText(500),
    reason,
  })
  .superRefine((v, ctx) => {
    if (v.type !== 'deposit_used' && !v.method_id) {
      ctx.addIssue({ code: 'custom', path: ['method_id'], message: 'Choose a payment method' });
    }
  });

export type EditPaymentFormInput = z.input<typeof editPaymentSchema>;

export const reasonSchema = z.object({ reason });
