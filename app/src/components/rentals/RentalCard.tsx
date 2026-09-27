import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RentalBalance } from '@/types/models';
import { RentalStatusBadge, Badge } from '@/components/ui/Badge';
import { formatDate, formatMoney } from '@/lib/format';
import { rentPeriodLabel } from '@/lib/labels';

export function RentalCard({ r, to }: { r: RentalBalance; to?: string }) {
  const { t } = useTranslation();
  const pending = Number(r.pending);
  const deposit = Number(r.deposit_balance);
  return (
    <Link to={to ?? `/rentals/${r.id}`} className="card flex items-center gap-3 p-4 transition hover:ring-slate-300">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{r.car_number}</span>
          <span className="truncate text-sm text-slate-500">{r.car_model}</span>
          <RentalStatusBadge status={r.status} />
          {r.is_payment_overdue && <Badge tone="red">{t('Overdue {{n}}d', { n: r.days_payment_overdue })}</Badge>}
          {r.is_return_overdue && <Badge tone="red">{t('Return late')}</Badge>}
        </div>
        <div className="mt-1 truncate text-sm text-slate-600">
          {r.driver_name} · {r.rental_number} · {t(rentPeriodLabel[r.rental_type])}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {formatDate(r.out_at)} → {r.returned_at ? formatDate(r.returned_at) : `${t('due back')} ${formatDate(r.expected_return_date)}`}
        </div>
      </div>
      <div className="text-end">
        {r.status !== 'void' && (
          <>
            <div className={`num text-sm font-bold ${pending > 0 ? 'text-red-600' : pending < 0 ? 'text-amber-700' : 'text-green-700'}`}>
              {pending === 0 ? t('Paid') : formatMoney(Math.abs(pending))}
            </div>
            <div className="text-[11px] text-slate-500">
              {pending > 0 ? t('pending') : pending < 0 ? t('overpaid') : ''}
              {deposit > 0 && ` · ${t('dep.')} ${formatMoney(deposit)}`}
            </div>
          </>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-slate-300 rtl:rotate-180" />
    </Link>
  );
}
