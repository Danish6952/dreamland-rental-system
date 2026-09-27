import { z } from 'zod';
import { dateString, fuelLevel, money, moneyOrZero, optionalKm, optionalText, personName, mobile, reason } from './common';

export const rentalEditSchema = z
  .object({
    expected_return_date: dateString,
    agreed_rate: money(),
    rent_amount: money(100_000_000),
    fuel_charge: moneyOrZero(),
    damage_charge: moneyOrZero(),
    damage_notes: optionalText(1000),
    extra_km_charge: moneyOrZero(),
    other_charge: moneyOrZero(),
    other_charge_note: optionalText(300),
    start_km: optionalKm,
    end_km: optionalKm,
    fuel_out: fuelLevel,
    fuel_in: fuelLevel,
    guarantor_name: personName,
    guarantor_mobile: mobile,
    notes: optionalText(1000),
    reason,
  })
  .superRefine((v, ctx) => {
    if (v.other_charge > 0 && !v.other_charge_note) {
      ctx.addIssue({ code: 'custom', path: ['other_charge_note'], message: 'Say what the other charge is for' });
    }
    if (v.start_km != null && v.end_km != null && v.end_km < v.start_km) {
      ctx.addIssue({ code: 'custom', path: ['end_km'], message: 'Cannot be less than start KM' });
    }
  });

export type RentalEditFormInput = z.input<typeof rentalEditSchema>;
