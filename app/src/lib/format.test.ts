import { describe, expect, it } from 'vitest';
import { addMonths, daysBetween, formatMoney, formatPhone, fromPKTLocalInput, normalizeMobile, startOfWeek, toPKTDate } from './format';

describe('formatMoney (lakh grouping, Q14)', () => {
  it('formats PKR', () => {
    expect(formatMoney(45000)).toBe('Rs 45,000');
    expect(formatMoney(142000)).toBe('Rs 1,42,000');
    expect(formatMoney('500000.00')).toBe('Rs 5,00,000');
    expect(formatMoney(-2000)).toBe('− Rs 2,000');
    expect(formatMoney(null)).toBe('Rs 0');
  });
});

describe('normalizeMobile (V-5)', () => {
  it.each([
    ['03001234567', '03001234567'],
    ['0300-1234567', '03001234567'],
    ['+92 300 1234567', '03001234567'],
    ['923001234567', '03001234567'],
    ['3001234567', '03001234567'],
  ])('accepts %s', (input, out) => expect(normalizeMobile(input)).toBe(out));
  it.each(['0300123', '0512345678', '', 'abc'])('rejects %s', (input) => expect(normalizeMobile(input)).toBeNull());
  it('formats for display', () => expect(formatPhone('03001234567')).toBe('0300-1234567'));
});

describe('dates in PKT', () => {
  it('converts local input to UTC and back', () => {
    expect(fromPKTLocalInput('2026-10-01T10:30')).toBe('2026-10-01T05:30:00.000Z');
    expect(toPKTDate('2026-09-30T20:00:00Z')).toBe('2026-10-01'); // 1 AM PKT next day
  });
  it('adds months clamping to month end', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-10-01', 1)).toBe('2026-11-01');
    expect(addMonths('2026-10-01', 12)).toBe('2027-10-01');
  });
  it('week starts Monday (Q8)', () => {
    expect(startOfWeek('2026-09-27')).toBe('2026-09-21'); // Sunday -> previous Monday
    expect(startOfWeek('2026-09-21')).toBe('2026-09-21');
  });
  it('counts days', () => expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30));
});
