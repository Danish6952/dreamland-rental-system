import { z } from 'zod';
import { money, notFutureDate, optionalMobile, optionalText, personName } from './common';

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Rule V-17 — confirmation by typing the car number */
export function makeSellSchema(carNumber: string) {
  return z.object({
    sale_date: notFutureDate,
    sale_price: money(1_000_000_000),
    buyer_name: personName,
    buyer_mobile: optionalMobile,
    buyer_cnic: optionalText(20),
    notes: optionalText(1000),
    confirm: z.string().refine((v) => norm(v) === norm(carNumber), `Type ${carNumber} to confirm`),
  });
}

export type SellFormInput = z.input<ReturnType<typeof makeSellSchema>>;
