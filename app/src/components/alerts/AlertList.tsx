import { Link } from 'react-router';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { CarAlert, RentalAlert } from '@/types/models';
import { formatDate, formatMoney } from '@/lib/format';

function rentalAlertText(a: RentalAlert, t: (k: string, o?: Record<string, unknown>) => string) {
  switch (a.alert_type) {
    case 'payment_overdue':
      return t('Payment overdue {{n}} days', { n: a.days ?? 0 });
    case 'payment_due_soon':
      return a.days === 0 ? t('Payment due today') : t('Payment due in {{n}} days', { n: a.days ?? 0 });
    case 'payment_pending':
      return Number(a.pending) > 0 ? t('Payment pending after return') : t('Deposit not settled');
    case 'return_overdue':
      return t('Car return overdue {{n}} days', { n: a.days ?? 0 });
    case 'overpaid':
      return t('Overpaid — refund needed');
  }
}

export function AlertList({ rentalAlerts, carAlerts, limit }: { rentalAlerts: RentalAlert[]; carAlerts: CarAlert[]; limit?: number }) {
  const { t } = useTranslation();
  const rows = [
    ...rentalAlerts.map((a) => ({
      key: `${a.rental_id}-${a.alert_type}`,
      red: a.severity === 'red',
      title: rentalAlertText(a, t),
      detail: `${a.driver_name} · ${a.car_number} · ${a.rental_number}`,
      amount:
        a.alert_type === 'payment_pending' && Number(a.pending) <= 0
          ? `${t('Deposit')} ${formatMoney(a.deposit_balance)}`
          : a.amount != null
            ? formatMoney(a.amount)
            : a.ref_date
              ? formatDate(a.ref_date)
              : '',
      to: `/rentals/${a.rental_id}${['payment_overdue', 'payment_due_soon', 'payment_pending'].includes(a.alert_type) ? '?pay=1' : ''}`,
      icon: a.severity === 'red' ? AlertOctagon : AlertTriangle,
      action: ['payment_overdue', 'payment_due_soon', 'payment_pending'].includes(a.alert_type) ? t('Pay') : t('Open'),
    })),
    ...carAlerts.map((a) => ({
      key: `${a.car_id}-ins`,
      red: a.severity === 'red',
      title:
        a.alert_type === 'insurance_expired'
          ? t('Insurance expired')
          : t('Insurance expires in {{n}} days', { n: a.days_left }),
      detail: `${a.car_number} · ${a.model}`,
      amount: formatDate(a.insurance_expiry),
      to: `/cars/${a.car_id}`,
      icon: ShieldAlert,
      action: t('Open'),
    })),
  ].sort((a, b) => Number(b.red) - Number(a.red));

  const shown = limit ? rows.slice(0, limit) : rows;
  if (!rows.length) {
    return <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">{t('All clear — no alerts')} ✓</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
      {shown.map((r) => (
        <li key={r.key}>
          <Link to={r.to} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
            <r.icon className={clsx('size-5 shrink-0', r.red ? 'text-red-600' : 'text-amber-500')} />
            <div className="min-w-0 flex-1">
              <div className={clsx('text-sm font-semibold', r.red ? 'text-red-700' : 'text-amber-800')}>{r.title}</div>
              <div className="truncate text-xs text-slate-500">{r.detail}</div>
            </div>
            <div className="num text-end text-sm font-semibold text-slate-800">{r.amount}</div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-navy-800">{r.action}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
