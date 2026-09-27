import { describe, expect, it } from 'vitest';
import { computeMoney, defaultDueDate, nextDueDate, periodCount, suggestedRent } from './rentalCalc';

describe('period count & suggested rent (B-3, B-4) — 08 §1.3', () => {
  it('daily 3 days × 5,000 = 15,000', () => expect(suggestedRent(5000, 'daily', '2026-10-01', '2026-10-04')).toBe(15000));
  it('same-day daily counts 1 day', () => expect(periodCount('daily', '2026-10-01', '2026-10-01')).toBe(1));
  it('weekly 10 days -> 2 weeks', () => expect(periodCount('weekly', '2026-10-01', '2026-10-11')).toBe(2));
  it('monthly 45 days -> 2 months', () => expect(periodCount('monthly', '2026-10-01', '2026-11-15')).toBe(2));
  it('monthly 30 days -> 1 month', () => expect(periodCount('monthly', '2026-10-01', '2026-10-31')).toBe(1));
  it('yearly 400 days -> 2 years', () => expect(periodCount('yearly', '2026-01-01', '2027-02-05')).toBe(2));
});

describe('next payment due (P-9)', () => {
  it('daily/weekly default to expected return', () => {
    expect(defaultDueDate('daily', '2026-10-01', '2026-10-05')).toBe('2026-10-05');
    expect(defaultDueDate('weekly', '2026-10-01', '2026-10-15')).toBe('2026-10-15');
  });
  it('monthly/yearly default to one month after out, capped at return', () => {
    expect(defaultDueDate('yearly', '2026-10-01', '2027-10-01')).toBe('2026-11-01');
    expect(defaultDueDate('monthly', '2026-10-01', '2026-10-20')).toBe('2026-10-20');
  });
  it('prefills one step ahead', () => {
    expect(nextDueDate('yearly', '2026-11-01')).toBe('2026-12-01');
    expect(nextDueDate('weekly', '2026-11-01')).toBe('2026-11-08');
  });
});

describe('computeMoney — worked example 05 §5', () => {
  it('matches every step', () => {
    const out = computeMoney({ rent: 45000, advance: 10000, depositTaken: 20000 });
    expect(out).toEqual({ totalBill: 45000, totalPaid: 10000, pending: 35000, depositBalance: 20000 });

    const end = computeMoney({
      rent: 45000,
      fuel: 2000,
      damage: 5000,
      advance: 10000,
      rentPaid: 15000 + 20000 + 2000,
      depositUsed: 5000,
      depositTaken: 20000,
      depositReturned: 15000,
    });
    expect(end).toEqual({ totalBill: 52000, totalPaid: 52000, pending: 0, depositBalance: 0 });
  });
});
