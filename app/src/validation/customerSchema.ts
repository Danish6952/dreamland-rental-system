import { z } from 'zod';
import { mobile, optionalText, personName } from './common';

export const customerSchema = z.object({
  full_name: personName,
  mobile,
  license_number: z.string().trim().min(3, 'At least 3 characters').max(30, 'Too long'),
  cnic: optionalText(20),
  notes: optionalText(1000),
});

export type CustomerFormInput = z.input<typeof customerSchema>;
