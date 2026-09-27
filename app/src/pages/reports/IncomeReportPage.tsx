import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { useIncome } from '@/hooks/useReports';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chips } from '@/components/ui/Chips';
import { BarChart } from '@/components/ui/BarChart';
import { QueryState } from '@/components/ui/States';
import { addDays, addMonths, formatDate, formatMoney, startOfMonth, startOfWeek, todayPKT } from '@/lib/format';
import { paymentTypeLabel } from '@/lib/labels';
import { downloadCsv } from '@/lib/csv';
import type { IncomeRow } from '@/types/models';

/** REP-01 weekly income / REP-02 monthly income (cash basis, rule P-7) */
export default function IncomeReportPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') as 'week' | 'month') || 'week';
  const today = todayPKT();

  const periods = useMemo(() => {
    const list: { key: string; from: string; to: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      if (mode === 'week') {
        const from = addDays(startOfWeek(today), -7 * i);
        list.push({ key: from, from, to: addDays(from, 6), label: formatDate(from).slice(0, 6) });
      } else {
        const from = addMonths(startOfMonth(today), -i);
        const to = addDays(addMonths(from, 1), -1);
        list.push({
          key: from,
          from,
          to,
          label: new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(new Date(`${from}T00:00:00Z`)),
        });
      }
    }
    return list;
  }, [mode, today]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = periods.find((p) => p.key === selectedKey) ?? periods[periods.length - 1];
  const income = useIncome(periods[0].from, today);

  const byPeriod = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of income.data ?? []) {
      const p = periods.find((x) => r.payment_date >= x.from && r.payment_date <= x.to);
      if (p) m.set(p.key, (m.get(p.key) ?? 0) + Number(r.amount));
    }
    return m;
  }, [income.data, periods]);

  const rows = (income.data ?? []).filter((r) => r.payment_date >= selected.from && r.payment_date <= selected.to);
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const group = (key: (r: IncomeRow) => string) => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + Number(r.amount)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const byMethod = group((r) => (r.type === 'deposit_used' ? t('Deposit used') : (r.method_name ?? '—')));
  const byCar = group((r) => r.car_number);

  const exportCsv = () =>
    downloadCsv(
      `income_${selected.from}_${selected.to}`,
      ['Date', 'Type', 'Amount', 'Method', 'Rental', 'Car', 'Driver'],
      rows.map((r) => [r.payment_date, paymentTypeLabel[r.type], Number(r.amount), r.method_name, r.rental_number, r.car_number, r.driver_name]),
    );

  return (
    <div className="space-y-4">
      <PageHeader
        back="/reports"
        title={mode === 'week' ? 'Weekly income' : 'Monthly income'}
        actions={
          <Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv} disabled={!rows.length}>
            CSV
          </Button>
        }
      />
      <Chips
        value={mode}
        onChange={(v) => {
          setSelectedKey(null);
          setParams({ mode: v }, { replace: true });
        }}
        options={[
          { value: 'week', label: 'Weekly' },
          { value: 'month', label: 'Monthly' },
        ]}
      />
      <QueryState query={income}>
        {() => (
          <>
            <Section title={mode === 'week' ? 'Last 12 weeks' : 'Last 12 months'}>
              <BarChart
                data={periods.map((p) => ({ key: p.key, label: p.label, value: byPeriod.get(p.key) ?? 0 }))}
                selected={selected.key}
                onSelect={setSelectedKey}
              />
            </Section>
            <div className="card flex items-center justify-between bg-navy-950 p-4 text-white">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  {formatDate(selected.from)} – {formatDate(selected.to)}
                </div>
                <div className="num text-2xl font-bold text-gold-400">{formatMoney(total)}</div>
              </div>
              <div className="text-end text-sm text-slate-300">{t('{{n}} payments', { n: rows.length })}</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="By method">
                <Breakdown rows={byMethod} />
              </Section>
              <Section title="By car">
                <Breakdown rows={byCar} />
              </Section>
            </div>
            <Section title="Payments">
              {rows.length ? (
                <ul className="divide-y divide-slate-100 text-sm">
                  {rows
                    .slice()
                    .reverse()
                    .map((r) => (
                      <li key={r.payment_id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <Link to={`/rentals/${r.rental_id}`} className="font-medium text-navy-800 hover:underline">
                            {r.car_number} · {r.driver_name}
                          </Link>
                          <div className="text-xs text-slate-500">
                            {formatDate(r.payment_date)} · {t(paymentTypeLabel[r.type])} {r.method_name && `· ${r.method_name}`}
                          </div>
                        </div>
                        <span className={`num font-semibold ${Number(r.amount) < 0 ? 'text-red-600' : ''}`}>{formatMoney(r.amount)}</span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">{t('No income in this period')}</p>
              )}
            </Section>
          </>
        )}
      </QueryState>
    </div>
  );
}

function Breakdown({ rows }: { rows: [string, number][] }) {
  const total = rows.reduce((s, [, v]) => s + v, 0) || 1;
  if (!rows.length) return <p className="text-sm text-slate-500">—</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map(([k, v]) => (
        <li key={k}>
          <div className="flex justify-between text-sm">
            <span className="font-medium">{k}</span>
            <span className="num">{formatMoney(v)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-gold-500" style={{ width: `${Math.max(2, (v / total) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
