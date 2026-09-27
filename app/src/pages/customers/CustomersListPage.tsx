import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCustomerBalances } from '@/hooks/useCustomers';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { Chips } from '@/components/ui/Chips';
import { EmptyState, QueryState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { formatMoney, formatPhone } from '@/lib/format';

export default function CustomersListPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'archived'>('all');
  const list = useCustomerBalances(filter === 'archived');

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return (list.data ?? []).filter((c) => {
      if (filter === 'pending' && Number(c.total_pending) <= 0 && Number(c.deposit_held) <= 0) return false;
      if (filter === 'active' && c.active_rentals_count === 0) return false;
      if (filter === 'archived' && !c.archived_at) return false;
      if (!term) return true;
      return c.full_name.toLowerCase().includes(term) || (digits.length >= 3 && c.mobile.includes(digits));
    });
  }, [list.data, q, filter]);

  return (
    <div className="space-y-4">
      <PageHeader title="Customers" subtitle={t('Drivers are added automatically at Car Out')} />
      <SearchBox value={q} onChange={setQ} placeholder="Search name or mobile" />
      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Owes money' },
          { value: 'active', label: 'Has car out' },
          { value: 'archived', label: 'Archived' },
        ]}
      />
      <QueryState query={list}>
        {() =>
          shown.length ? (
            <ul className="card divide-y divide-slate-100 overflow-hidden">
              {shown.map((c) => (
                <li key={c.customer_id}>
                  <Link to={`/customers/${c.customer_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{c.full_name}</span>
                        {c.active_rentals_count > 0 && <Badge tone="blue">{t('Car out')}</Badge>}
                        {Number(c.total_overdue) > 0 && <Badge tone="red">{t('Overdue')}</Badge>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatPhone(c.mobile)} · {t('{{n}} rentals', { n: c.rentals_count })}
                      </div>
                    </div>
                    {Number(c.total_pending) > 0 && <div className="num text-sm font-bold text-red-600">{formatMoney(c.total_pending)}</div>}
                    <ChevronRight className="size-4 text-slate-300 rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No customers found" />
          )
        }
      </QueryState>
    </div>
  );
}
