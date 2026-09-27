import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCars } from '@/hooks/useCars';
import type { CarFilter } from '@/services/carService';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Chips } from '@/components/ui/Chips';
import { SearchBox } from '@/components/ui/SearchBox';
import { EmptyState, QueryState } from '@/components/ui/States';
import { CarCard } from '@/components/cars/CarCard';

const filters: { value: CarFilter; label: string }[] = [
  { value: 'active', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'on_rent', label: 'On Rent' },
  { value: 'maintenance', label: 'At Maintenance' },
  { value: 'sold', label: 'Sold' },
  { value: 'archived', label: 'Archived' },
];

export default function CarsListPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as CarFilter) || 'active';
  const q = params.get('q') ?? '';
  const cars = useCars(status);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && !(key === 'status' && value === 'active')) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (!term) return cars.data ?? [];
    return (cars.data ?? []).filter((c) =>
      [c.car_number, c.make, c.model, c.color].filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9 ]/g, '').includes(term),
    );
  }, [cars.data, q]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cars"
        actions={
          <ButtonLink to="/cars/new" size="sm" icon={<Plus className="size-4" />}>
            {t('Add car')}
          </ButtonLink>
        }
      />
      <SearchBox value={q} onChange={(v) => set('q', v)} placeholder="Search car number or model" />
      <Chips options={filters} value={status} onChange={(v) => set('status', v)} />
      <QueryState query={cars}>
        {() =>
          shown.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {shown.map((c) => (
                <CarCard key={c.id} car={c} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={q ? 'No cars match your search' : 'No cars here yet'}
              action={
                status === 'active' && !q ? (
                  <ButtonLink to="/cars/new" icon={<Plus className="size-4" />}>
                    {t('Add your first car')}
                  </ButtonLink>
                ) : undefined
              }
            />
          )
        }
      </QueryState>
    </div>
  );
}
