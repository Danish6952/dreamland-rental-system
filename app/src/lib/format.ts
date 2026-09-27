/**
 * Formatting helpers. Business time zone is Asia/Karachi (PKT, UTC+5, no DST).
 * Amounts use Pakistani (lakh) grouping: Rs 1,42,000 (decision Q14).
 */
export const TZ = 'Asia/Karachi';
const PKT_OFFSET = '+05:00';

const moneyFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  const s = moneyFmt.format(Math.abs(Math.round(n)));
  return n < 0 ? `− Rs ${s}` : `Rs ${s}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  return moneyFmt.format(Number(value ?? 0));
}

/** YYYY-MM-DD for "today" in Pakistan time */
export function todayPKT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  );
}

/** YYYY-MM-DD (PKT) of a timestamp */
export function toPKTDate(ts: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(ts),
  );
}

/** Value for <input type="datetime-local"> showing PKT wall time */
export function toPKTLocalInput(ts: string | Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/** <input type="datetime-local"> value (PKT wall time) -> ISO timestamp */
export function fromPKTLocalInput(value: string): string {
  return new Date(`${value}:00${PKT_OFFSET}`).toISOString();
}

/** "27 Sep 2026" — accepts a date (YYYY-MM-DD) or a timestamp */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00${PKT_OFFSET}`) : new Date(value);
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

/** "27 Sep 2026, 10:30 AM" */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

/** Add days to a YYYY-MM-DD date */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Add months to a YYYY-MM-DD date (clamps to month end, like PostgreSQL) */
export function addMonths(date: string, months: number): string {
  const [y, m, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Whole days from a to b (YYYY-MM-DD) */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Monday of the week containing date (YYYY-MM-DD) */
export function startOfWeek(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** Accepts 03XXXXXXXXX, +92 3XX…, 923…, 3XX… -> 03XXXXXXXXX, or null if invalid (rule V-5) */
export function normalizeMobile(input: string | null | undefined): string | null {
  let v = (input ?? '').replace(/\D/g, '');
  if (/^92\d{10}$/.test(v)) v = `0${v.slice(2)}`;
  else if (/^3\d{9}$/.test(v)) v = `0${v}`;
  return /^03\d{9}$/.test(v) ? v : null;
}

/** 03001234567 -> 0300-1234567 */
export function formatPhone(mobile: string | null | undefined): string {
  if (!mobile) return '—';
  return /^03\d{9}$/.test(mobile) ? `${mobile.slice(0, 4)}-${mobile.slice(4)}` : mobile;
}

/** WhatsApp click-to-chat link (international format, no +) */
export function whatsappLink(mobile: string, text?: string): string {
  const intl = `92${mobile.replace(/^0/, '')}`;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
