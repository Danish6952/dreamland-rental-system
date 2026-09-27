import { z } from 'zod';
import { normalizeMobile, todayPKT } from '@/lib/format';

const blankToUndefined = (v: unknown) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v);

/** Required money: "", NaN -> error; >= 0 (rule V-12) */
export const money = (max = 10_000_000) =>
  z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ required_error: 'Required', invalid_type_error: 'Enter an amount' })
      .min(0, 'Cannot be negative')
      .max(max, 'Amount is too large'),
  );

/** Optional money: blank -> 0 */
export const moneyOrZero = (max = 10_000_000) =>
  z.preprocess(
    (v) => blankToUndefined(v) ?? 0,
    z.coerce.number({ invalid_type_error: 'Enter an amount' }).min(0, 'Cannot be negative').max(max, 'Amount is too large'),
  );

/** Optional positive money: blank -> null */
export const optionalPositiveMoney = z.preprocess(
  (v) => blankToUndefined(v) ?? null,
  z.coerce.number().positive('Must be more than 0').max(100_000_000).nullable(),
);

/** Optional whole number (KM): blank -> null */
export const optionalKm = z.preprocess(
  (v) => blankToUndefined(v) ?? null,
  z.coerce.number().int('Whole number only').min(0, 'Cannot be negative').max(5_000_000).nullable(),
);

/** Pakistani mobile, normalized to 03XXXXXXXXX (rule V-5) */
export const mobile = z
  .string({ required_error: 'Required' })
  .trim()
  .min(1, 'Required')
  .transform((v, ctx) => {
    const n = normalizeMobile(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a mobile number like 0300-1234567' });
      return z.NEVER;
    }
    return n;
  });

export const optionalMobile = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = normalizeMobile(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a mobile number like 0300-1234567' });
      return z.NEVER;
    }
    return n;
  });

export const personName = z.string().trim().min(2, 'At least 2 characters').max(80, 'Too long');

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, 'Too long')
    .optional()
    .transform((v) => (v ? v : null));

export const dateString = z.string({ required_error: 'Required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date');

export const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Pick a date');

export const notFutureDate = dateString.refine((v) => v <= todayPKT(), 'Cannot be in the future');

/** Reason for edits / voids (rule V-16) */
export const reason = z.string().trim().min(5, 'Please give a reason (at least 5 characters)').max(300);

export const rentPeriod = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export const fuelLevel = z
  .enum(['empty', 'quarter', 'half', 'three_quarter', 'full', ''])
  .optional()
  .transform((v) => (v ? v : null));
