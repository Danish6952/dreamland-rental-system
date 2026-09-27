import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Ban, CalendarClock, MessageCircle, Pencil, Phone, Plus, Undo2 } from 'lucide-react';
import { useRental, useRentalHistory } from '@/hooks/useRentals';
import { usePayments } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { useAction } from '@/hooks/useAction';
import { useUserNames } from '@/hooks/useAdmin';
import { paymentService } from '@/services/paymentService';
import { rentalService } from '@/services/rentalService';
import type { PaymentListItem, RentalBalance } from '@/types/models';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge, RentalStatusBadge } from '@/components/ui/Badge';
import { InfoRow, Section } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Sheet } from '@/components/ui/Sheet';
import { MoneyField, TextField } from '@/components/ui/Field';
import { ErrorState, ListSkeleton } from '@/components/ui/States';
import { MoneySummary } from '@/components/rentals/MoneySummary';
import { PaymentList } from '@/components/payments/PaymentList';
import { RecordPaymentSheet } from '@/components/payments/RecordPaymentSheet';
import { EditPaymentSheet } from '@/components/payments/EditPaymentSheet';
import { fuelLabel, rentPeriodLabel, rentPeriodUnit } from '@/lib/labels';
import { formatDate, formatDateTime, formatMoney, formatPhone, whatsappLink } from '@/lib/format';

export default function RentalDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { isOwner } = useAuth();
  const rental = useRental(id);
  const payments = usePayments({ rentalId: id, includeVoided: true }, !!id);
  const history = useRentalHistory(id, payments.data?.map((p) => p.id));
  const names = useUserNames();
  const [payOpen, setPayOpen] = useState(params.get('pay') === '1');
  const [editing, setEditing] = useState<PaymentListItem | null>(null);
  const [voiding, setVoiding] = useState<PaymentListItem | null>(null);
  const [voidRental, setVoidRental] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);

  const voidPayment = useAction(({ p, reason }: { p: PaymentListItem; reason: string }) => paymentService.void(p.id, reason), {
    success: 'Payment voided',
    onSuccess: () => setVoiding(null),
  });
  const voidRentalAction = useAction((reason: string) => rentalService.void(id!, reason), {
    success: 'Rental voided',
    onSuccess: () => setVoidRental(false),
  });

  if (rental.isLoading) return <ListSkeleton rows={3} />;
  if (!rental.data) return <ErrorState error={rental.error} onRetry={() => rental.refetch()} />;
  const r = rental.data;
  const pending = Number(r.pending);
  const active = r.status === 'out' || r.status === 'returned';
  const closePay = () => {
    setPayOpen(false);
    if (params.get('pay')) {
      params.delete('pay');
      setParams(params, { replace: true });
    }
  };
  const reminder = `Assalam o Alaikum ${r.driver_name}, ${
    pending > 0 ? `your pending rent for ${r.car_number} is ${formatMoney(r.due_amount || pending)}` : `regarding ${r.car_number}`
  }${r.payment_due_date && pending > 0 ? `, due ${formatDate(r.payment_due_date)}` : ''}. — Dreamland`;

  return (
    <div className="space-y-4">
      <PageHeader
        back="/rentals"
        title={r.rental_number}
        subtitle={
          <Link to={`/cars/${r.car_id}`} className="hover:underline">
            {r.car_number} · {r.car_model}
          </Link>
        }
        actions={<RentalStatusBadge status={r.status} />}
      />

      {r.status === 'void' && (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
          <strong>{t('Void')}:</strong> {r.void_reason}
        </div>
      )}

      {/* Alerts for this rental */}
      <div className="flex flex-wrap gap-2">
        {r.is_payment_overdue && <Badge tone="red">{t('Payment overdue {{n}} days', { n: r.days_payment_overdue })}</Badge>}
        {r.is_payment_due_soon && <Badge tone="amber">{t('Payment due {{date}}', { date: formatDate(r.payment_due_date) })}</Badge>}
        {r.is_return_overdue && <Badge tone="red">{t('Car return overdue {{n}} days', { n: r.days_return_overdue })}</Badge>}
        {r.is_overpaid && <Badge tone="red">{t('Overpaid — record a refund')}</Badge>}
      </div>

      {/* Actions */}
      {active && (
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {r.status === 'out' && (
            <ButtonLink to={`/rentals/${r.id}/return`} icon={<Undo2 className="size-4" />}>
              {t('Return car')}
            </ButtonLink>
          )}
          <Button variant="navy" icon={<Plus className="size-4" />} onClick={() => setPayOpen(true)}>
            {t('Add payment')}
          </Button>
          <ButtonLink to={`/rentals/${r.id}/edit`} variant="secondary" icon={<Pencil className="size-4" />}>
            {t(r.status === 'out' ? 'Extend / edit' : 'Edit charges')}
          </ButtonLink>
        </div>
      )}
      {r.status === 'closed' && (
        <ButtonLink to={`/rentals/${r.id}/edit`} variant="secondary" size="sm" icon={<Pencil className="size-4" />}>
          {t('Correct charges')}
        </ButtonLink>
      )}

      {r.status !== 'void' && (
        <MoneySummary bill={Number(r.total_bill)} paid={Number(r.total_paid)} pending={pending} deposit={Number(r.deposit_balance)} />
      )}

      {active && (
        <Section
          title="Next payment due"
          action={
            <Button size="sm" variant="ghost" icon={<CalendarClock className="size-4" />} onClick={() => setDueOpen(true)}>
              {t('Change')}
            </Button>
          }
        >
          <p className="text-sm text-slate-700">
            {r.payment_due_date ? (
              <>
                <strong>{formatDate(r.payment_due_date)}</strong>
                {pending > 0 && ` · ${formatMoney(r.due_amount)}`}
              </>
            ) : (
              t('Not set')
            )}
          </p>
        </Section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Driver & guarantor">
          <dl>
            <InfoRow label="Driver">
              <Link to={`/customers/${r.customer_id}`} className="text-navy-700 hover:underline">
                {r.driver_name}
              </Link>
            </InfoRow>
            <InfoRow label="License">{r.driver_license}</InfoRow>
            <InfoRow label="Driver mobile">
              <ContactLinks mobile={r.driver_mobile} message={reminder} />
            </InfoRow>
            <InfoRow label="Guarantor">{r.guarantor_name}</InfoRow>
            <InfoRow label="Guarantor mobile">
              <ContactLinks mobile={r.guarantor_mobile} />
            </InfoRow>
          </dl>
        </Section>

        <Section title="Terms">
          <dl>
            <InfoRow label="Rental type">{t(rentPeriodLabel[r.rental_type])}</InfoRow>
            <InfoRow label="Agreed rate">
              {formatMoney(r.agreed_rate)} / {t(rentPeriodUnit[r.rental_type])}
              {r.standard_rent_snapshot != null && Number(r.standard_rent_snapshot) !== Number(r.agreed_rate) && (
                <div className="text-xs font-normal text-slate-500">
                  {t('Standard')}: {formatMoney(r.standard_rent_snapshot)}
                </div>
              )}
            </InfoRow>
            <InfoRow label="Out">{formatDateTime(r.out_at)}</InfoRow>
            <InfoRow label="Expected back">{formatDate(r.expected_return_date)}</InfoRow>
            {r.returned_at && <InfoRow label="Returned">{formatDateTime(r.returned_at)}</InfoRow>}
            {r.closed_at && <InfoRow label="Closed">{formatDateTime(r.closed_at)}</InfoRow>}
          </dl>
        </Section>

        <Section title="Bill">
          <dl>
            <InfoRow label="Rent">{formatMoney(r.rent_amount)}</InfoRow>
            <InfoRow label="Fuel / mileage">{formatMoney(r.fuel_charge)}</InfoRow>
            <InfoRow label="Damage">
              {formatMoney(r.damage_charge)}
              {r.damage_notes && <div className="text-xs font-normal text-slate-500">{r.damage_notes}</div>}
            </InfoRow>
            <InfoRow label="Extra KM">{formatMoney(r.extra_km_charge)}</InfoRow>
            <InfoRow label="Other">
              {formatMoney(r.other_charge)}
              {r.other_charge_note && <div className="text-xs font-normal text-slate-500">{r.other_charge_note}</div>}
            </InfoRow>
            <InfoRow label="Total bill">
              <span className="text-base font-bold">{formatMoney(r.total_bill)}</span>
            </InfoRow>
          </dl>
        </Section>

        <Section title="KM & fuel">
          <dl>
            <InfoRow label="Start KM">{r.start_km ?? '—'}</InfoRow>
            <InfoRow label="End KM">{r.end_km ?? '—'}</InfoRow>
            {r.start_km != null && r.end_km != null && <InfoRow label="Driven">{(r.end_km - r.start_km).toLocaleString('en-IN')} km</InfoRow>}
            <InfoRow label="Fuel out">{r.fuel_out ? t(fuelLabel[r.fuel_out]) : '—'}</InfoRow>
            <InfoRow label="Fuel in">{r.fuel_in ? t(fuelLabel[r.fuel_in]) : '—'}</InfoRow>
          </dl>
          {r.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{r.notes}</p>}
        </Section>
      </div>

      <Section
        title="Payments"
        action={
          active && (
            <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => setPayOpen(true)}>
              {t('Add')}
            </Button>
          )
        }
      >
        {payments.isLoading ? (
          <ListSkeleton rows={2} />
        ) : (
          <PaymentList
            payments={payments.data ?? []}
            onEdit={r.status !== 'void' ? setEditing : undefined}
            onVoid={isOwner && r.status !== 'void' ? setVoiding : undefined}
          />
        )}
      </Section>

      <Section title="History">
        {history.data?.length ? (
          <ul className="space-y-2 text-sm">
            {history.data.map((h) => (
              <li key={h.id} className="flex gap-2">
                <span className="w-32 shrink-0 text-xs text-slate-400">{formatDateTime(h.changed_at)}</span>
                <span className="text-slate-700">
                  <strong className="font-medium">{h.changed_by ? names.get(h.changed_by) ?? t('User') : t('System')}</strong>{' '}
                  {describeAudit(h.table_name, h.action, t)}
                  {h.reason && <span className="text-slate-500"> — “{h.reason}”</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">—</p>
        )}
      </Section>

      {isOwner && r.status !== 'void' && (
        <Button variant="ghost" className="text-red-600" icon={<Ban className="size-4" />} onClick={() => setVoidRental(true)}>
          {t('Void this rental (entered by mistake)')}
        </Button>
      )}

      {active && <RecordPaymentSheet rental={r} open={payOpen} onClose={closePay} />}
      <EditPaymentSheet payment={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!voiding}
        onClose={() => setVoiding(null)}
        title="Void payment"
        message={voiding ? t('The payment of {{amount}} stays visible but no longer counts in any total.', { amount: formatMoney(voiding.amount) }) : ''}
        requireReason
        danger
        confirmLabel="Void payment"
        loading={voidPayment.isPending}
        onConfirm={(reason) => voiding && voidPayment.mutate({ p: voiding, reason })}
      />
      <ConfirmDialog
        open={voidRental}
        onClose={() => setVoidRental(false)}
        title="Void rental"
        message={t('Use this only for a rental entered by mistake. All its payments must be voided first. If the car is out, it becomes Available.')}
        requireReason
        danger
        confirmLabel="Void rental"
        loading={voidRentalAction.isPending}
        onConfirm={(reason) => voidRentalAction.mutate(reason)}
      />
      <NextDueSheet rental={r} open={dueOpen} onClose={() => setDueOpen(false)} />
    </div>
  );
}

function ContactLinks({ mobile, message }: { mobile: string; message?: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-2">
      <span>{formatPhone(mobile)}</span>
      <a href={`tel:${mobile}`} className="rounded-lg bg-slate-100 p-1.5 text-navy-800 hover:bg-slate-200" aria-label={t('Call')}>
        <Phone className="size-3.5" />
      </a>
      <a
        href={whatsappLink(mobile, message)}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg bg-green-50 p-1.5 text-green-700 hover:bg-green-100"
        aria-label={t('WhatsApp')}
      >
        <MessageCircle className="size-3.5" />
      </a>
    </span>
  );
}

function describeAudit(table: string, action: string, t: (k: string) => string) {
  const what = table === 'payments' ? t('payment') : t('rental');
  const verb: Record<string, string> = {
    insert: t('created'),
    update: t('changed'),
    void: t('voided'),
    return: t('returned the car'),
  };
  if (action === 'return') return verb.return;
  return `${verb[action] ?? action} ${what}`;
}

function NextDueSheet({ rental, open, onClose }: { rental: RentalBalance; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(rental.payment_due_date ?? '');
  const [amount, setAmount] = useState(rental.payment_due_amount != null ? String(Number(rental.payment_due_amount)) : '');
  const save = useAction(() => rentalService.setNextDue(rental.id, date || null, amount ? Number(amount) : null), {
    success: 'Next payment due updated',
    onSuccess: onClose,
  });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Next payment due"
      footer={
        <Button block size="lg" loading={save.isPending} onClick={() => save.mutate(undefined)}>
          {t('Save')}
        </Button>
      }
    >
      <div className="space-y-4">
        <TextField label="Due date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <MoneyField label="Due amount" optional hint={t('Empty = whole pending amount')} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
    </Sheet>
  );
}
