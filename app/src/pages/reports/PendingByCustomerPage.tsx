import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { useCustomerBalances } from '@/hooks/useCustomers';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, QueryState } from '@/components/ui/States';
import { formatMoney, formatPhone } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';

/** REP-03 */
export default function PendingByCustomerPage() {
  const { t } = useTranslation();
  const q = useCustomerBalances(true);
  const rows = (q.data ?? [])
    .filter((c) => Number(c.total_pending) > 0 || Number(c.deposit_held) > 0)
    .sort((a, b) => Number(b.total_pending) - Number(a.total_pending));
  const total = rows.reduce((s, c) => s + Number(c.total_pending), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        back="/reports"
        title="Pending by customer"
        subtitle={`${t('Total pending')}: ${formatMoney(total)}`}
        actions={
          <Button
            size="sm"
            variant="secondary"
            icon={<Download className="size-4" />}
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(
                'pending_by_customer',
                ['Customer', 'Mobile', 'Pending', 'Overdue', 'Deposit held', 'Cars out'],
                rows.map((c) => [c.full_name, c.mobile, Number(c.total_pending), Number(c.total_overdue), Number(c.deposit_held), c.active_rentals_count]),
              )
            }
          >
            CSV
          </Button>
        }
      />
      <QueryState query={q}>
        {() =>
          rows.length ? (
            <ul className="card divide-y divide-slate-100 overflow-hidden">
              {rows.map((c) => (
                <li key={c.customer_id}>
                  <Link to={`/customers/${c.customer_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{c.full_name}</div>
                      <div className="text-xs text-slate-500">
                        {formatPhone(c.mobile)}
                        {Number(c.deposit_held) > 0 && ` · ${t('deposit held')} ${formatMoney(c.deposit_held)}`}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="num font-bold text-red-600">{formatMoney(c.total_pending)}</div>
                      {Number(c.total_overdue) > 0 && (
                        <div className="num text-xs font-semibold text-red-500">
                          {formatMoney(c.total_overdue)} {t('overdue')}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nobody owes anything" message="All customers are fully settled." />
          )
        }
      </QueryState>
    </div>
  );
}
