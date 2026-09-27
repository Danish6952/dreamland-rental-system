import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { useAllCarEarnings } from '@/hooks/useCars';
import { useIncome } from '@/hooks/useReports';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { QueryState } from '@/components/ui/States';
import { CarStatusBadge } from '@/components/ui/Badge';
import { formatMoney, startOfMonth, todayPKT } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';

/** REP-06 — received per car in a period + lifetime totals */
export default function CarEarningsReportPage() {
  const { t } = useTranslation();
  const [from, setFrom] = useState(startOfMonth(todayPKT()));
  const [to, setTo] = useState(todayPKT());
  const cars = useAllCarEarnings();
  const income = useIncome(from, to);

  const rows = useMemo(() => {
    const period = new Map<string, number>();
    for (const r of income.data ?? []) period.set(r.car_id, (period.get(r.car_id) ?? 0) + Number(r.amount));
    return (cars.data ?? [])
      .map((c) => ({ ...c, period: period.get(c.car_id) ?? 0 }))
      .filter((c) => c.status !== 'sold' || c.period !== 0 || Number(c.total_pending) > 0)
      .sort((a, b) => b.period - a.period);
  }, [cars.data, income.data]);
  const total = rows.reduce((s, r) => s + r.period, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        back="/reports"
        title="Earnings per car"
        actions={
          <Button
            size="sm"
            variant="secondary"
            icon={<Download className="size-4" />}
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(
                `car_earnings_${from}_${to}`,
                ['Car', 'Model', 'Received in period', 'Lifetime billed', 'Lifetime received', 'Pending', 'Rentals'],
                rows.map((r) => [r.car_number, r.model, r.period, Number(r.total_billed), Number(r.total_received), Number(r.total_pending), r.rentals_count]),
              )
            }
          >
            CSV
          </Button>
        }
      />
      <Section>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <TextField label="To" type="date" value={to} min={from} max={todayPKT()} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {t('Received in period')}: <strong className="num">{formatMoney(total)}</strong>
        </p>
      </Section>
      <QueryState query={cars}>
        {() => (
          <ul className="card divide-y divide-slate-100 overflow-hidden">
            {rows.map((r) => (
              <li key={r.car_id}>
                <Link to={`/cars/${r.car_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{r.car_number}</span>
                      <CarStatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-slate-500">
                      {r.model} · {t('lifetime')} {formatMoney(r.total_received)} · {t('{{n}} rentals', { n: r.rentals_count })}
                      {Number(r.total_pending) > 0 && ` · ${formatMoney(r.total_pending)} ${t('pending')}`}
                    </div>
                  </div>
                  <div className="num text-end font-bold text-green-700">{formatMoney(r.period)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
