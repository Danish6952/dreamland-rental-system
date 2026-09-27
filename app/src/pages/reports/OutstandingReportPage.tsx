import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { useRentals } from '@/hooks/useRentals';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, QueryState } from '@/components/ui/States';
import { RentalCard } from '@/components/rentals/RentalCard';
import { formatMoney } from '@/lib/format';
import { rentalStatusLabel } from '@/lib/labels';
import { downloadCsv } from '@/lib/csv';

/** REP-05 — every rental with pending ≠ 0 or deposit held */
export default function OutstandingReportPage() {
  const { t } = useTranslation();
  const q = useRentals({ status: 'active' });
  const rows = (q.data ?? [])
    .filter((r) => Number(r.pending) !== 0 || Number(r.deposit_balance) > 0)
    .sort((a, b) => Number(b.is_payment_overdue) - Number(a.is_payment_overdue) || Number(b.pending) - Number(a.pending));
  const pending = rows.reduce((s, r) => s + Math.max(Number(r.pending), 0), 0);
  const overdue = rows.reduce((s, r) => s + (r.is_payment_overdue ? Number(r.due_amount) : 0), 0);
  const deposits = rows.reduce((s, r) => s + Number(r.deposit_balance), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        back="/reports"
        title="Outstanding balances"
        actions={
          <Button
            size="sm"
            variant="secondary"
            icon={<Download className="size-4" />}
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(
                'outstanding_balances',
                ['Rental', 'Status', 'Car', 'Driver', 'Mobile', 'Bill', 'Paid', 'Pending', 'Deposit held', 'Next due', 'Overdue'],
                rows.map((r) => [
                  r.rental_number,
                  rentalStatusLabel[r.status],
                  r.car_number,
                  r.driver_name,
                  r.driver_mobile,
                  Number(r.total_bill),
                  Number(r.total_paid),
                  Number(r.pending),
                  Number(r.deposit_balance),
                  r.payment_due_date,
                  r.is_payment_overdue ? 'yes' : '',
                ]),
              )
            }
          >
            CSV
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'Pending', v: pending, c: 'text-red-600' },
          { l: 'Overdue', v: overdue, c: 'text-red-700' },
          { l: 'Deposits held', v: deposits, c: 'text-navy-700' },
        ].map((x) => (
          <div key={x.l} className="card p-3">
            <div className="text-[11px] font-semibold uppercase text-slate-500">{t(x.l)}</div>
            <div className={`num text-base font-bold sm:text-lg ${x.c}`}>{formatMoney(x.v)}</div>
          </div>
        ))}
      </div>
      <QueryState query={q}>
        {() =>
          rows.length ? (
            <div className="space-y-2">
              {rows.map((r) => (
                <RentalCard key={r.id} r={r} />
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing outstanding" />
          )
        }
      </QueryState>
    </div>
  );
}
