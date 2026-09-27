import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/lib/format';

/** Bill · Paid · Pending · Deposit — same order and colours everywhere (06 §1.2) */
export function MoneySummary({
  bill,
  paid,
  pending,
  deposit,
  compact,
  className,
}: {
  bill: number;
  paid: number;
  pending: number;
  deposit: number;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const boxes = [
    { label: 'Bill', value: bill, cls: 'text-slate-900' },
    { label: 'Paid', value: paid, cls: 'text-green-700' },
    {
      label: pending < 0 ? 'Overpaid' : 'Pending',
      value: Math.abs(pending),
      cls: pending > 0 ? 'text-red-600' : pending < 0 ? 'text-amber-700' : 'text-slate-400',
    },
    { label: 'Deposit held', value: deposit, cls: deposit > 0 ? 'text-navy-700' : 'text-slate-400' },
  ];
  return (
    <div className={clsx('grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-4', className)}>
      {boxes.map((b) => (
        <div key={b.label} className={clsx('bg-white', compact ? 'px-3 py-2' : 'px-4 py-3')}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t(b.label)}</div>
          <div className={clsx('num font-bold', compact ? 'text-base' : 'text-lg', b.cls)}>{formatMoney(b.value)}</div>
        </div>
      ))}
    </div>
  );
}
