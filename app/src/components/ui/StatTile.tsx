import clsx from 'clsx';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

export function StatTile({
  label,
  value,
  to,
  accent,
  icon,
}: {
  label: string;
  value: ReactNode;
  to?: string;
  accent?: 'green' | 'blue' | 'amber';
  icon?: ReactNode;
}) {
  const { t } = useTranslation();
  const bar = { green: 'bg-green-500', blue: 'bg-blue-500', amber: 'bg-amber-500' }[accent ?? 'green'];
  const body = (
    <div className="card relative overflow-hidden p-3.5 transition hover:ring-slate-300">
      <span className={clsx('absolute inset-x-0 top-0 h-1', bar)} />
      <div className="flex items-center justify-between text-slate-400">{icon}</div>
      <div className="num mt-1 text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs font-medium text-slate-500">{t(label)}</div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
