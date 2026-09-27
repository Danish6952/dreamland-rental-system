import type { CarStatus, FuelLevel, PaymentType, RentPeriod, RentalStatus } from '@/types/models';

/** English labels; pass through t() when rendering so they can be translated. */
export const carStatusLabel: Record<CarStatus, string> = {
  available: 'Available',
  on_rent: 'On Rent',
  maintenance: 'At Maintenance',
  sold: 'Sold',
};

export const rentalStatusLabel: Record<RentalStatus, string> = {
  out: 'Out',
  returned: 'Returned',
  closed: 'Closed',
  void: 'Void',
};

export const rentPeriodLabel: Record<RentPeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export const rentPeriodUnit: Record<RentPeriod, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
};

export const paymentTypeLabel: Record<PaymentType, string> = {
  advance: 'Advance',
  rent: 'Rent payment',
  deposit_taken: 'Deposit taken',
  deposit_used: 'Deposit used',
  deposit_returned: 'Deposit returned',
  refund: 'Refund',
};

export const fuelLabel: Record<FuelLevel, string> = {
  empty: 'Empty',
  quarter: '¼',
  half: '½',
  three_quarter: '¾',
  full: 'Full',
};

export const RENT_PERIODS: RentPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];
export const FUEL_LEVELS: FuelLevel[] = ['empty', 'quarter', 'half', 'three_quarter', 'full'];
