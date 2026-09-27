import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { CarStatus, RentalStatus } from '@/types/models';
import { carStatusLabel, rentalStatusLabel } from '@/lib/labels';

export type Tone = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'gold';

const tones: Record<Tone, string> = {
  green: 'bg-green-50 text-green-700 ring-green-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  gold: 'bg-gold-50 text-gold-600 ring-gold-500/30',
};
const dots: Record<Tone, string> = {
  green: 'bg-green-600',
  blue: 'bg-blue-600',
  amber: 'bg-amber-500',
  red: 'bg-red-600',
  gray: 'bg-slate-400',
  gold: 'bg-gold-500',
};

export function Badge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      <span className={clsx('size-1.5 rounded-full', dots[tone])} aria-hidden />
      {children}
    </span>
  );
}

export const carStatusTone: Record<CarStatus, Tone> = {
  available: 'green',
  on_rent: 'blue',
  maintenance: 'amber',
  sold: 'gray',
};

export const rentalStatusTone: Record<RentalStatus, Tone> = {
  out: 'blue',
  returned: 'amber',
  closed: 'green',
  void: 'gray',
};

export function CarStatusBadge({ status, archived }: { status: CarStatus; archived?: boolean }) {
  const { t } = useTranslation();
  if (archived && status !== 'sold') return <Badge tone="gray">{t('Archived')}</Badge>;
  return <Badge tone={carStatusTone[status]}>{t(carStatusLabel[status])}</Badge>;
}

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  const { t } = useTranslation();
  return <Badge tone={rentalStatusTone[status]}>{t(rentalStatusLabel[status])}</Badge>;
}
