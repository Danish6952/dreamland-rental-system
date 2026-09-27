import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuditLog, useUserNames } from '@/hooks/useAdmin';
import { PageHeader } from '@/components/ui/PageHeader';
import { Chips } from '@/components/ui/Chips';
import { QueryState, EmptyState } from '@/components/ui/States';
import { Badge, type Tone } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/format';
import type { AuditLogEntry } from '@/types/models';

const IGNORED = new Set(['updated_at', 'updated_by', 'created_at', 'created_by', 'car_number_normalized', 'total_bill', 'status_changed_at']);

function changedFields(e: AuditLogEntry): string[] {
  if (!e.old_data || !e.new_data) return [];
  return Object.keys(e.new_data).filter((k) => !IGNORED.has(k) && JSON.stringify(e.old_data![k]) !== JSON.stringify(e.new_data![k]));
}

function linkFor(e: AuditLogEntry): string | null {
  const d = e.new_data ?? {};
  if (e.table_name === 'rentals') return `/rentals/${e.record_id}`;
  if (e.table_name === 'payments' && typeof d.rental_id === 'string') return `/rentals/${d.rental_id}`;
  if (e.table_name === 'cars') return `/cars/${e.record_id}`;
  if (e.table_name === 'sold_cars' && typeof d.car_id === 'string') return `/cars/${d.car_id}`;
  if (e.table_name === 'customers') return `/customers/${e.record_id}`;
  return null;
}

const actionTone: Record<string, Tone> = { insert: 'green', update: 'amber', void: 'red', sell: 'gray', archive: 'gray', return: 'blue', restore: 'blue' };

/** NFR-05 — read-only for everyone; nobody can edit it */
export default function AuditLogPage() {
  const { t } = useTranslation();
  const [table, setTable] = useState('');
  const log = useAuditLog({ table: table || undefined, limit: 300 });
  const names = useUserNames();

  const fmt = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

  return (
    <div className="space-y-4">
      <PageHeader back="/settings" title="Audit log" subtitle={t('Every change, who made it and why')} />
      <Chips
        value={table}
        onChange={setTable}
        options={[
          { value: '', label: 'All' },
          { value: 'payments', label: 'Payments' },
          { value: 'rentals', label: 'Rentals' },
          { value: 'cars', label: 'Cars' },
          { value: 'customers', label: 'Customers' },
          { value: 'sold_cars', label: 'Sales' },
        ]}
      />
      <QueryState query={log}>
        {(list) =>
          list.length ? (
            <ul className="card divide-y divide-slate-100 overflow-hidden">
              {list.map((e) => {
                const fields = changedFields(e);
                const to = linkFor(e);
                return (
                  <li key={e.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge tone={actionTone[e.action] ?? 'gray'}>{t(e.action)}</Badge>
                      <span className="font-medium">{t(e.table_name.replace('_', ' '))}</span>
                      {to && (
                        <Link to={to} className="text-navy-700 hover:underline">
                          {String(e.new_data?.rental_number ?? e.new_data?.car_number ?? e.new_data?.full_name ?? t('open'))}
                        </Link>
                      )}
                      <span className="ms-auto text-xs text-slate-400">{formatDateTime(e.changed_at)}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {e.changed_by ? names.get(e.changed_by) ?? t('User') : t('System')}
                      {e.reason && <span className="text-slate-700"> — “{e.reason}”</span>}
                    </div>
                    {fields.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-xs">
                        {fields.slice(0, 8).map((f) => (
                          <li key={f} className="text-slate-600">
                            <span className="font-medium">{f}</span>: <span className="text-red-600 line-through">{fmt(e.old_data?.[f])}</span> →{' '}
                            <span className="text-green-700">{fmt(e.new_data?.[f])}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No changes recorded yet" />
          )
        }
      </QueryState>
    </div>
  );
}
