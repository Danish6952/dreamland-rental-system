import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CarListItem } from '@/types/models';
import { CarStatusBadge } from '@/components/ui/Badge';
import { formatDate, formatMoney } from '@/lib/format';
import { rentPeriodUnit } from '@/lib/labels';

export function CarCard({ car, to }: { car: CarListItem; to?: string }) {
  const { t } = useTranslation();
  let line: string;
  if (car.status === 'on_rent') {
    line = `${car.active_driver_name ?? ''} · ${t('back')} ${formatDate(car.active_expected_return_date)}`;
  } else if (car.status === 'maintenance') {
    line = `${t('Since')} ${formatDate(car.status_changed_at)}${car.last_status_reason ? ` · ${car.last_status_reason}` : ''}`;
  } else if (car.status === 'sold') {
    line = `${t('Sold')} ${formatDate(car.status_changed_at)}`;
  } else {
    line = `${formatMoney(car.standard_rent)} / ${t(rentPeriodUnit[car.standard_rent_period])}`;
  }
  return (
    <Link to={to ?? `/cars/${car.id}`} className="card flex items-center gap-3 p-4 transition hover:ring-slate-300">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold tracking-wide text-slate-900">{car.car_number}</span>
          <CarStatusBadge status={car.status} archived={!!car.archived_at} />
        </div>
        <div className="mt-0.5 truncate text-sm text-slate-600">
          {[car.make, car.model, car.year, car.color].filter(Boolean).join(' · ')}
        </div>
        <div className="mt-0.5 truncate text-xs text-slate-500">{line}</div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-slate-300 rtl:rotate-180" />
    </Link>
  );
}
