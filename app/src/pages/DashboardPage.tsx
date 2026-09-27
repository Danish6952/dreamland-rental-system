import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CarFront, CheckCircle2, Undo2, Wallet, Wrench, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useReports';
import { useCarAlerts, useRentalAlerts } from '@/hooks/useAlerts';
import { useRentals } from '@/hooks/useRentals';
import { StatTile } from '@/components/ui/StatTile';
import { ButtonLink } from '@/components/ui/Button';
import { Skeleton, ErrorState } from '@/components/ui/States';
import { AlertList } from '@/components/alerts/AlertList';
import { RentalCard } from '@/components/rentals/RentalCard';
import { formatMoney } from '@/lib/format';

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const dash = useDashboard();
  const rentalAlerts = useRentalAlerts();
  const carAlerts = useCarAlerts();
  const out = useRentals({ status: 'out' });
  const d = dash.data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          {t(greeting())}
          {profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-slate-500">
          {new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
        </p>
      </div>

      {dash.error ? (
        <ErrorState error={dash.error} onRetry={() => dash.refetch()} />
      ) : (
        <>
          {/* Fleet status (DASH-01) */}
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Available" value={d ? d.available_count : <Skeleton className="h-7 w-8" />} to="/cars?status=available" accent="green" icon={<CheckCircle2 className="size-4" />} />
            <StatTile label="On Rent" value={d ? d.on_rent_count : <Skeleton className="h-7 w-8" />} to="/cars?status=on_rent" accent="blue" icon={<KeyRound className="size-4" />} />
            <StatTile label="At Maintenance" value={d ? d.maintenance_count : <Skeleton className="h-7 w-8" />} to="/cars?status=maintenance" accent="amber" icon={<Wrench className="size-4" />} />
          </div>

          {/* Money (DASH-03) */}
          <div className="overflow-hidden rounded-2xl bg-navy-950 text-white shadow-lg">
            <div className="grid grid-cols-2 divide-x divide-white/10 rtl:divide-x-reverse">
              <Link to="/reports/outstanding" className="p-4 hover:bg-white/5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('Outstanding')}</div>
                <div className="num mt-1 text-xl font-bold text-white sm:text-2xl">{d ? formatMoney(d.total_outstanding) : '…'}</div>
                {d && Number(d.total_overdue) > 0 && (
                  <div className="num mt-0.5 text-xs font-semibold text-red-300">
                    {formatMoney(d.total_overdue)} {t('overdue')}
                  </div>
                )}
              </Link>
              <Link to="/reports/outstanding" className="p-4 hover:bg-white/5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('Deposits held')}</div>
                <div className="num mt-1 text-xl font-bold text-gold-400 sm:text-2xl">{d ? formatMoney(d.deposits_held) : '…'}</div>
              </Link>
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 rtl:divide-x-reverse">
              <Link to="/reports/income?mode=week" className="p-4 hover:bg-white/5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('This week')}</div>
                <div className="num mt-1 text-lg font-bold">{d ? formatMoney(d.income_this_week) : '…'}</div>
              </Link>
              <Link to="/reports/income?mode=month" className="p-4 hover:bg-white/5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('This month')}</div>
                <div className="num mt-1 text-lg font-bold">{d ? formatMoney(d.income_this_month) : '…'}</div>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Quick actions (DASH-05) */}
      <div className="grid grid-cols-3 gap-2">
        <ButtonLink to="/car-out" size="lg" icon={<CarFront className="size-4" />} className="whitespace-nowrap px-2 text-sm">
          {t('Car Out')}
        </ButtonLink>
        <ButtonLink to="/rentals?status=active&pick=payment" variant="navy" size="lg" icon={<Wallet className="size-4" />} className="whitespace-nowrap px-2 text-sm">
          {t('Payment')}
        </ButtonLink>
        <ButtonLink to="/rentals?status=out&pick=return" variant="secondary" size="lg" icon={<Undo2 className="size-4" />} className="whitespace-nowrap px-2 text-sm">
          {t('Return')}
        </ButtonLink>
      </div>

      {/* Alerts (DASH-02) */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            {t('Alerts')} {rentalAlerts.data && carAlerts.data ? `(${rentalAlerts.data.length + carAlerts.data.length})` : ''}
          </h2>
          <Link to="/alerts" className="text-sm font-medium text-navy-700 hover:underline">
            {t('See all')}
          </Link>
        </div>
        {rentalAlerts.isLoading || carAlerts.isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : rentalAlerts.error ? (
          <ErrorState error={rentalAlerts.error} />
        ) : (
          <AlertList rentalAlerts={rentalAlerts.data ?? []} carAlerts={carAlerts.data ?? []} limit={5} />
        )}
      </section>

      {/* Cars out (DASH-04) */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            {t('Cars out')} {out.data ? `(${out.data.length})` : ''}
          </h2>
          <Link to="/rentals?status=out" className="text-sm font-medium text-navy-700 hover:underline">
            {t('See all')}
          </Link>
        </div>
        {out.isLoading ? (
          <Skeleton className="h-20 w-full rounded-2xl" />
        ) : out.data?.length ? (
          <div className="space-y-2">
            {out.data.slice(0, 6).map((r) => (
              <RentalCard key={r.id} r={r} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">{t('No cars are out right now')}</p>
        )}
      </section>
    </div>
  );
}
