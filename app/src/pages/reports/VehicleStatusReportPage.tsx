import { useTranslation } from 'react-i18next';
import { useCars } from '@/hooks/useCars';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/States';
import { CarCard } from '@/components/cars/CarCard';
import { carStatusLabel } from '@/lib/labels';
import { daysBetween, toPKTDate, todayPKT } from '@/lib/format';
import type { CarStatus } from '@/types/models';

/** REP-08 current vehicle status + REP-09 vehicles currently unavailable */
export default function VehicleStatusReportPage() {
  const { t } = useTranslation();
  const cars = useCars('active');
  const order: CarStatus[] = ['on_rent', 'maintenance', 'available'];
  return (
    <div className="space-y-4">
      <PageHeader back="/reports" title="Vehicle status" />
      <QueryState query={cars}>
        {(list) => (
          <>
            <div className="grid grid-cols-3 gap-2">
              {order.map((s) => (
                <div key={s} className="card p-3 text-center">
                  <div className="num text-2xl font-bold">{list.filter((c) => c.status === s).length}</div>
                  <div className="text-xs text-slate-500">{t(carStatusLabel[s])}</div>
                </div>
              ))}
            </div>
            {order.map((s) => {
              const group = list.filter((c) => c.status === s);
              if (!group.length) return null;
              return (
                <Section
                  key={s}
                  title={s === 'available' ? carStatusLabel[s] : `${t('Unavailable')} — ${t(carStatusLabel[s])}`}
                >
                  <div className="space-y-2">
                    {group.map((c) => (
                      <div key={c.id}>
                        <CarCard car={c} />
                        {s !== 'available' && (
                          <p className="mt-1 ps-4 text-xs text-slate-500">
                            {t('Unavailable for {{n}} days', { n: daysBetween(toPKTDate(c.status_changed_at), todayPKT()) })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              );
            })}
          </>
        )}
      </QueryState>
    </div>
  );
}
