import type { RentPeriod } from '@/types/models';
import { addDays, addMonths, daysBetween } from './format';

/**
 * Number of rent periods between two dates (rule B-4).
 * daily = calendar days (min 1); weekly = ceil(days/7); monthly = ceil(days/30); yearly = ceil(days/365)
 */
export function periodCount(type: RentPeriod, fromDate: string, toDate: string): number {
  const days = Math.max(1, daysBetween(fromDate, toDate));
  switch (type) {
    case 'daily':
      return days;
    case 'weekly':
      return Math.ceil(days / 7);
    case 'monthly':
      return Math.ceil(days / 30);
    case 'yearly':
      return Math.ceil(days / 365);
  }
}

/** Suggested agreed total rent = rate × periods (rule B-3). Never applied automatically. */
export function suggestedRent(rate: number, type: RentPeriod, fromDate: string, toDate: string): number {
  return Math.round((rate || 0) * periodCount(type, fromDate, toDate));
}

/** Default first payment due date at Car Out (rule P-9) */
export function defaultDueDate(type: RentPeriod, outDate: string, expectedReturn: string): string {
  if (type === 'daily' || type === 'weekly') return expectedReturn;
  const oneMonth = addMonths(outDate, 1);
  return oneMonth < expectedReturn ? oneMonth : expectedReturn;
}

/** Prefill for "next payment due" after a payment: one step ahead */
export function nextDueDate(type: RentPeriod, from: string): string {
  if (type === 'daily') return addDays(from, 1);
  if (type === 'weekly') return addDays(from, 7);
  return addMonths(from, 1);
}

export interface MoneyState {
  totalBill: number;
  totalPaid: number;
  pending: number;
  depositBalance: number;
}

/** Same formulas as the database view rental_balances (rules P-2, P-3, D-2) */
export function computeMoney(input: {
  rent: number;
  fuel?: number;
  damage?: number;
  extraKm?: number;
  other?: number;
  advance?: number;
  rentPaid?: number;
  depositUsed?: number;
  refunded?: number;
  depositTaken?: number;
  depositReturned?: number;
}): MoneyState {
  const n = (v?: number) => Number(v) || 0;
  const totalBill = n(input.rent) + n(input.fuel) + n(input.damage) + n(input.extraKm) + n(input.other);
  const totalPaid = n(input.advance) + n(input.rentPaid) + n(input.depositUsed) - n(input.refunded);
  return {
    totalBill,
    totalPaid,
    pending: totalBill - totalPaid,
    depositBalance: n(input.depositTaken) - n(input.depositReturned) - n(input.depositUsed),
  };
}
