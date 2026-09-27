import clsx from 'clsx';
import { Link } from 'react-router';
import { Pencil, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PaymentListItem } from '@/types/models';
import { paymentTypeLabel } from '@/lib/labels';
import { formatDate, formatMoney } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

const sign: Record<string, 1 | -1 | 0> = {
  advance: 1,
  rent: 1,
  deposit_used: 1,
  refund: -1,
  deposit_taken: 0,
  deposit_returned: 0,
};

export function PaymentList({
  payments,
  onEdit,
  onVoid,
  showRental,
}: {
  payments: PaymentListItem[];
  onEdit?: (p: PaymentListItem) => void;
  onVoid?: (p: PaymentListItem) => void;
  showRental?: boolean;
}) {
  const { t } = useTranslation();
  if (!payments.length) return <p className="py-3 text-sm text-slate-500">{t('No payments yet')}</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {payments.map((p) => {
        const s = sign[p.type];
        return (
          <li key={p.id} className={clsx('flex items-center gap-3 py-3', p.is_voided && 'opacity-60')}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={clsx('text-sm font-semibold text-slate-900', p.is_voided && 'line-through')}>
                  {t(paymentTypeLabel[p.type])}
                </span>
                {p.is_voided && <Badge tone="gray">{t('Voided')}</Badge>}
                {p.is_edited && !p.is_voided && <Badge tone="gold">{t('Edited')}</Badge>}
              </div>
              <div className="truncate text-xs text-slate-500">
                {formatDate(p.payment_date)}
                {p.method_name && ` · ${p.method_name}`}
                {p.reference && ` · ${p.reference}`}
                {showRental && (
                  <>
                    {' · '}
                    <Link to={`/rentals/${p.rental_id}`} className="font-medium text-navy-700 hover:underline">
                      {p.rental_number} {p.car_number} · {p.driver_name}
                    </Link>
                  </>
                )}
              </div>
              {p.notes && <div className="truncate text-xs text-slate-400">{p.notes}</div>}
              {p.is_voided && p.void_reason && <div className="text-xs text-red-600">{p.void_reason}</div>}
            </div>
            <div
              className={clsx(
                'num text-end text-sm font-bold',
                p.is_voided ? 'text-slate-400 line-through' : s === 1 ? 'text-green-700' : s === -1 ? 'text-red-600' : 'text-navy-700',
              )}
            >
              {s === -1 ? '− ' : ''}
              {formatMoney(p.amount)}
            </div>
            {!p.is_voided && (onEdit || onVoid) && (
              <div className="flex">
                {onEdit && (
                  <button onClick={() => onEdit(p)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy-800" aria-label={t('Edit')}>
                    <Pencil className="size-4" />
                  </button>
                )}
                {onVoid && (
                  <button onClick={() => onVoid(p)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={t('Void')}>
                    <Ban className="size-4" />
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
