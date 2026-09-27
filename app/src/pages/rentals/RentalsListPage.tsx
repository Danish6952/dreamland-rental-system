import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CarFront } from 'lucide-react';
import { useRentals } from '@/hooks/useRentals';
import type { RentalFilter } from '@/services/rentalService';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Chips } from '@/components/ui/Chips';
import { SearchBox } from '@/components/ui/SearchBox';
import { EmptyState, QueryState } from '@/components/ui/States';
import { RentalCard } from '@/components/rentals/RentalCard';

type StatusFilter = NonNullable<RentalFilter['status']>;

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'out', label: 'Out' },
  { value: 'returned', label: 'Returned' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
  { value: 'void', label: 'Void' },
];

/**
 * Rentals list. `?pick=return` / `?pick=payment` turns it into a picker
 * for the dashboard quick actions.
 */
export default function RentalsListPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as StatusFilter) || 'active';
  const search = params.get('q') ?? '';
  const pick = params.get('pick') as 'return' | 'payment' | null;
  const rentals = useRentals({ status, search });

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const title = pick === 'return' ? 'Which car is being returned?' : pick === 'payment' ? 'Record payment for…' : 'Rentals';
  const linkFor = (id: string) => (pick === 'return' ? `/rentals/${id}/return` : pick === 'payment' ? `/rentals/${id}?pay=1` : undefined);

  return (
    <div className="space-y-4">
      <PageHeader
        back={pick ? true : undefined}
        title={title}
        actions={
          !pick && (
            <ButtonLink to="/car-out" size="sm" icon={<CarFront className="size-4" />}>
              {t('Car Out')}
            </ButtonLink>
          )
        }
      />
      <SearchBox value={search} onChange={(v) => set('q', v)} placeholder="Search driver, car, or DR number" autoFocus={!!pick} />
      {!pick && <Chips options={filters} value={status} onChange={(v) => set('status', v)} />}
      <QueryState query={rentals}>
        {(list) =>
          list.length ? (
            <div className="space-y-2">
              {list.map((r) => (
                <RentalCard key={r.id} r={r} to={linkFor(r.id)} />
              ))}
            </div>
          ) : (
            <EmptyState title={pick === 'return' ? 'No cars are out right now' : 'No rentals found'} />
          )
        }
      </QueryState>
    </div>
  );
}
