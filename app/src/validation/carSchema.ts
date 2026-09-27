import { z } from 'zod';
import { money, optionalDate, optionalText, rentPeriod } from './common';

const maxYear = new Date().getFullYear() + 1;

export const carSchema = z.object({
  car_number: z
    .string()
    .trim()
    .min(2, 'At least 2 characters')
    .max(20, 'At most 20 characters')
    .regex(/^[A-Za-z0-9 -]+$/, 'Letters, digits, spaces and dashes only')
    .transform((v) => v.toUpperCase()),
  make: optionalText(40),
  model: z.string().trim().min(1, 'Required').max(60, 'Too long'),
  year: z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z.coerce.number().int().min(1980, 'From 1980').max(maxYear, `Up to ${maxYear}`).nullable(),
  ),
  color: optionalText(30),
  registered_to: optionalText(80),
  standard_rent: money(),
  standard_rent_period: rentPeriod,
  insurance_expiry: optionalDate,
  notes: optionalText(1000),
});

export type CarFormInput = z.input<typeof carSchema>;
export type CarFormOutput = z.output<typeof carSchema>;
