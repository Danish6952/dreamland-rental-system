import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, CarFront, CircleDollarSign, Pencil, Wrench, CheckCircle2 } from 'lucide-react';
import { useCar, useCarEarnings, useCarHistory, useCarSale } from '@/hooks/useCars';
import { useRentals } from '@/hooks/useRentals';
import { useAuth } from '@/hooks/useAuth';
import { useAction } from '@/hooks/useAction';
import { useUserNames } from '@/hooks/useAdmin';
import { carService } from '@/services/carService';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CarStatusBadge } from '@/components/ui/Badge';
import { InfoRow, Section } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState, ListSkeleton } from '@/components/ui/States';
import { RentalCard } from '@/components/rentals/RentalCard';
import { carStatusLabel, rentPeriodUnit } from '@/lib/labels';
import { daysBetween, formatDate, formatDateTime, formatMoney, formatPhone, todayPKT } from '@/lib/format';

type Tab = 'overview' | 'rentals' | 'earnings' | 'history';

export default function CarDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [dialog, setDialog] = useState<'maint' | 'avail' | 'archive' | null>(null);
  const car = useCar(id);
  const earnings = useCarEarnings(id);
  const rentals = useRentals({ carId: id });
  const history = useCarHistory(tab === 'history' ? id : undefined);
  const sale = useCarSale(id, car.data?.status === 'sold');
  const names = useUserNames();

  const maint = useAction(({ on, reason }: { on: boolean; reason: string }) => carService.setMaintenance(id!, on, reason), {
    success: 'Car status updated',
    onSuccess: () => setDialog(null),
  });
  const archive = useAction((reason: string) => carService.archive(id!, reason), {
    success: 'Car archived',
    onSuccess: () => setDialog(null),
  });
  const restore = useAction(() => carService.restore(id!), { success: 'Car restored' });

  if (car.isLoading) return <ListSkeleton rows={3} />;
  if (car.error || !car.data) return <ErrorState error={car.error} onRetry={() => car.refetch()} />;
  const c = car.data;
  const e = earnings.data;
  const insuranceDays = c.insurance_expiry ? daysBetween(todayPKT(), c.insurance_expiry) : null;
  const archived = !!c.archived_at;

  return (
    <div className="space-y-4">
      <PageHeader
        back="/cars"
        title={<span className="tracking-wide">{c.car_number}</span>}
        subtitle={[c.make, c.model, c.year, c.color].filter(Boolean).join(' · ')}
        actions={<CarStatusBadge status={c.status} archived={archived} />}
      />

      {/* Actions */}
      {c.status !== 'sold' && (
        <div className="flex flex-wrap gap-2">
          {c.status === 'available' && !archived && (
            <ButtonLink to={`/car-out?car=${c.id}`} icon={<CarFront className="size-4" />}>
              {t('Car Out')}
            </ButtonLink>
          )}
          {c.status === 'on_rent' && c.active_rental_id && (
            <ButtonLink to={`/rentals/${c.active_rental_id}`} variant="navy">
              {t('Open rental')} {c.active_rental_number}
            </ButtonLink>
          )}
          {c.status === 'available' && !archived && (
            <Button variant="secondary" icon={<Wrench className="size-4" />} onClick={() => setDialog('maint')}>
              {t('Send to maintenance')}
            </Button>
          )}
          {c.status === 'maintenance' && (
            <Button variant="secondary" icon={<CheckCircle2 className="size-4" />} onClick={() => setDialog('avail')}>
              {t('Mark available')}
            </Button>
          )}
          <ButtonLink to={`/cars/${c.id}/edit`} variant="ghost" icon={<Pencil className="size-4" />}>
            {t('Edit')}
          </ButtonLink>
          {isOwner && c.status !== 'on_rent' && (
            <>
              <ButtonLink to={`/cars/${c.id}/sell`} variant="ghost" icon={<CircleDollarSign className="size-4" />}>
                {t('Mark as sold')}
              </ButtonLink>
              {archived ? (
                <Button variant="ghost" icon={<ArchiveRestore className="size-4" />} loading={restore.isPending} onClick={() => restore.mutate(undefined)}>
                  {t('Restore')}
                </Button>
              ) : (
                <Button variant="ghost" icon={<Archive className="size-4" />} onClick={() => setDialog('archive')}>
                  {t('Archive')}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'rentals', label: 'Rentals' },
          { value: 'earnings', label: 'Earnings' },
          { value: 'history', label: 'Status history' },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Details">
            <dl>
              <InfoRow label="Status">{t(carStatusLabel[c.status])}</InfoRow>
              <InfoRow label="Standard rent">
                {formatMoney(c.standard_rent)} / {t(rentPeriodUnit[c.standard_rent_period])}
              </InfoRow>
              <InfoRow label="Registered to">{c.registered_to || '—'}</InfoRow>
              <InfoRow label="Insurance expiry">
                <span className={insuranceDays !== null && insuranceDays < 0 ? 'text-red-600' : insuranceDays !== null && insuranceDays <= 30 ? 'text-amber-700' : ''}>
                  {formatDate(c.insurance_expiry)}
                  {insuranceDays !== null && insuranceDays <= 30 && ` (${insuranceDays < 0 ? t('expired') : t('{{n}} days', { n: insuranceDays })})`}
                </span>
              </InfoRow>
              <InfoRow label="Status since">{formatDate(c.status_changed_at)}</InfoRow>
              {c.notes && <InfoRow label="Notes">{c.notes}</InfoRow>}
            </dl>
          </Section>
          {c.status === 'on_rent' && (
            <Section title="Current rental">
              <dl>
                <InfoRow label="Driver">{c.active_driver_name}</InfoRow>
                <InfoRow label="Expected back">{formatDate(c.active_expected_return_date)}</InfoRow>
              </dl>
              <ButtonLink to={`/rentals/${c.active_rental_id}/return`} block className="mt-3">
                {t('Return car')}
              </ButtonLink>
            </Section>
          )}
          {sale.data && (
            <Section title="Sale">
              <dl>
                <InfoRow label="Sale date">{formatDate(sale.data.sale_date)}</InfoRow>
                <InfoRow label="Sale price">{formatMoney(sale.data.sale_price)}</InfoRow>
                <InfoRow label="Buyer">{sale.data.buyer_name}</InfoRow>
                {sale.data.buyer_mobile && <InfoRow label="Buyer mobile">{formatPhone(sale.data.buyer_mobile)}</InfoRow>}
                {sale.data.notes && <InfoRow label="Notes">{sale.data.notes}</InfoRow>}
              </dl>
            </Section>
          )}
          {e && (
            <Section title="Lifetime">
              <dl>
                <InfoRow label="Rentals">{e.rentals_count}</InfoRow>
                <InfoRow label="Received">{formatMoney(e.total_received)}</InfoRow>
                <InfoRow label="Pending">{formatMoney(e.total_pending)}</InfoRow>
              </dl>
            </Section>
          )}
        </div>
      )}

      {tab === 'rentals' &&
        (rentals.isLoading ? (
          <ListSkeleton />
        ) : rentals.data?.length ? (
          <div className="space-y-2">
            {rentals.data.map((r) => (
              <RentalCard key={r.id} r={r} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t('This car has not been rented yet')}</p>
        ))}

      {tab === 'earnings' && e && (
        <Section>
          <dl>
            <InfoRow label="Rentals">{e.rentals_count}</InfoRow>
            <InfoRow label="Total billed">{formatMoney(e.total_billed)}</InfoRow>
            <InfoRow label="Total received">{formatMoney(e.total_received)}</InfoRow>
            <InfoRow label="Still pending">{formatMoney(e.total_pending)}</InfoRow>
            <InfoRow label="Last rented">{formatDate(e.last_rented_at)}</InfoRow>
          </dl>
          <Link to={`/reports/car-earnings`} className="mt-3 inline-block text-sm font-medium text-navy-700 hover:underline">
            {t('Earnings for a date range')} →
          </Link>
        </Section>
      )}

      {tab === 'history' &&
        (history.isLoading ? (
          <ListSkeleton />
        ) : (
          <Section>
            <ol className="relative space-y-4 border-s border-slate-200 ps-5">
              {history.data?.map((h) => (
                <li key={h.id}>
                  <span className="absolute -start-1.5 mt-1.5 size-3 rounded-full bg-gold-500 ring-4 ring-white" />
                  <div className="text-sm font-semibold text-slate-900">
                    {h.from_status ? `${t(carStatusLabel[h.from_status])} → ` : ''}
                    {t(carStatusLabel[h.to_status])}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(h.changed_at)}
                    {h.changed_by && ` · ${names.get(h.changed_by) ?? ''}`}
                  </div>
                  {h.reason && (
                    <div className="text-sm text-slate-600">
                      {h.rental_id ? (
                        <Link to={`/rentals/${h.rental_id}`} className="text-navy-700 hover:underline">
                          {h.reason}
                        </Link>
                      ) : (
                        h.reason
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        ))}

      <ConfirmDialog
        open={dialog === 'maint'}
        onClose={() => setDialog(null)}
        title="Send to maintenance"
        message={t('{{car}} will not be available for Car Out until marked available.', { car: c.car_number })}
        optionalReason
        reasonLabel="What is being done?"
        confirmLabel="Send to maintenance"
        loading={maint.isPending}
        onConfirm={(reason) => maint.mutate({ on: true, reason })}
      />
      <ConfirmDialog
        open={dialog === 'avail'}
        onClose={() => setDialog(null)}
        title="Mark available"
        message={t('{{car}} is back and can be rented again.', { car: c.car_number })}
        optionalReason
        confirmLabel="Mark available"
        loading={maint.isPending}
        onConfirm={(reason) => maint.mutate({ on: false, reason })}
      />
      <ConfirmDialog
        open={dialog === 'archive'}
        onClose={() => setDialog(null)}
        title="Archive car"
        message={t('The car is hidden from active lists but keeps all its history. You can restore it later.')}
        requireReason
        danger
        confirmLabel="Archive"
        loading={archive.isPending}
        onConfirm={(reason) => archive.mutate(reason)}
      />
      {c.status === 'sold' && (
        <Button variant="ghost" onClick={() => navigate('/cars?status=sold')}>
          ← {t('Sold cars')}
        </Button>
      )}
    </div>
  );
}
