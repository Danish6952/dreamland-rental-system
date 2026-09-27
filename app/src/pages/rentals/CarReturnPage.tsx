import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useRental } from '@/hooks/useRentals';
import { useAction } from '@/hooks/useAction';
import { rentalService } from '@/services/rentalService';
import { makeCarReturnSchema, type CarReturnFormInput, type CarReturnFormOutput } from '@/validation/carReturnSchema';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoneyField, TextAreaField, TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ErrorState, ListSkeleton } from '@/components/ui/States';
import { MethodPicker } from '@/components/payments/MethodPicker';
import { MoneySummary } from '@/components/rentals/MoneySummary';
import { FUEL_LEVELS, fuelLabel, rentPeriodUnit } from '@/lib/labels';
import { formatMoney, fromPKTLocalInput, toPKTDate, toPKTLocalInput, formatDateTime } from '@/lib/format';
import { periodCount, suggestedRent } from '@/lib/rentalCalc';
import type { RentalBalance } from '@/types/models';

/** Flow 3 — Car Return */
export default function CarReturnPage() {
  const { id } = useParams();
  const rental = useRental(id);
  if (rental.isLoading) return <ListSkeleton rows={3} />;
  if (!rental.data) return <ErrorState error={rental.error} />;
  if (rental.data.status !== 'out') {
    return <PageHeader back={`/rentals/${id}`} title="This car has already been returned" subtitle={rental.data.rental_number} />;
  }
  return <ReturnForm r={rental.data} />;
}

function ReturnForm({ r }: { r: RentalBalance }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const paidSoFar = Number(r.total_paid);
  const depositHeld = Number(r.deposit_balance);
  const schema = useMemo(
    () => makeCarReturnSchema({ outAtIso: r.out_at, startKm: r.start_km, paidSoFar, depositHeld }),
    [r.out_at, r.start_km, paidSoFar, depositHeld],
  );
  const form = useForm<CarReturnFormInput, unknown, CarReturnFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      returned_at_local: toPKTLocalInput(),
      rent_amount: Number(r.rent_amount),
      next_car_status: 'available',
      fuel_in: '',
    },
  });
  const { register, control, handleSubmit, setValue, formState } = form;
  const err = formState.errors;
  const w = useWatch({ control });

  const n = (v: unknown) => Number(v) || 0;
  const bill = n(w.rent_amount) + n(w.fuel_charge) + n(w.damage_charge) + n(w.extra_km_charge) + n(w.other_charge);
  const pendingBefore = bill - paidSoFar;
  const paidAfter = paidSoFar + n(w.deposit_used) + n(w.payment_amount);
  const pendingAfter = bill - paidAfter;
  const depositAfter = depositHeld - n(w.deposit_used) - n(w.deposit_returned);

  const returnDate = (w.returned_at_local ?? '').slice(0, 10);
  const outDate = toPKTDate(r.out_at);
  const actualSuggestion = returnDate ? suggestedRent(Number(r.agreed_rate), r.rental_type, outDate, returnDate) : 0;
  const actualPeriods = returnDate ? periodCount(r.rental_type, outDate, returnDate) : 0;
  const km = w.end_km && r.start_km != null ? Number(w.end_km) - r.start_km : null;

  useEffect(() => {
    // keep deposit-return suggestion sensible when deposit use changes
    if (n(w.deposit_returned) > depositHeld - n(w.deposit_used)) setValue('deposit_returned', Math.max(depositHeld - n(w.deposit_used), 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.deposit_used]);

  const submit = useAction(
    (v: CarReturnFormOutput) =>
      rentalService.carReturn({
        rental_id: r.id,
        returned_at: fromPKTLocalInput(v.returned_at_local),
        end_km: v.end_km,
        fuel_in: v.fuel_in,
        rent_amount: v.rent_amount,
        fuel_charge: v.fuel_charge,
        damage_charge: v.damage_charge,
        damage_notes: v.damage_notes,
        extra_km_charge: v.extra_km_charge,
        other_charge: v.other_charge,
        other_charge_note: v.other_charge_note,
        next_car_status: v.next_car_status,
        car_status_reason: v.car_status_reason,
        deposit_used: v.deposit_used,
        payment_amount: v.payment_amount,
        payment_method_id: v.payment_amount > 0 ? v.payment_method_id : null,
        deposit_returned: v.deposit_returned,
        deposit_return_method_id: v.deposit_returned > 0 ? v.deposit_return_method_id : null,
        notes: v.notes,
      }),
    {
      success: (status) => (status === 'closed' ? t('Car returned — rental closed ✓') : t('Car returned — payment still pending')),
      onSuccess: () => navigate(`/rentals/${r.id}`, { replace: true }),
    },
  );

  const maxDepositUse = Math.max(Math.min(depositHeld, pendingBefore), 0);

  return (
    <form onSubmit={handleSubmit((v) => submit.mutate(v))} className="space-y-4">
      <PageHeader
        back={`/rentals/${r.id}`}
        title="Return car"
        subtitle={`${r.car_number} · ${r.driver_name} · ${t('out since')} ${formatDateTime(r.out_at)}`}
      />

      <Section title="Return details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Return date & time" type="datetime-local" {...register('returned_at_local')} error={err.returned_at_local?.message} />
          <TextField
            label="End KM"
            optional
            type="number"
            inputMode="numeric"
            {...register('end_km')}
            error={err.end_km?.message}
            hint={r.start_km != null ? (km != null && km >= 0 ? t('{{km}} km driven', { km: km.toLocaleString('en-IN') }) : `${t('Start KM')}: ${r.start_km}`) : undefined}
          />
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="fuel_in"
              render={({ field }) => (
                <SegmentedControl
                  label="Fuel level"
                  optional
                  columns={5}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={FUEL_LEVELS.map((f) => ({ value: f, label: fuelLabel[f] }))}
                />
              )}
            />
          </div>
        </div>
      </Section>

      <Section title="Rent">
        <MoneyField
          label="Final rent amount"
          {...register('rent_amount')}
          error={err.rent_amount?.message}
          hint={`${t('Agreed')}: ${formatMoney(r.rent_amount)} · ${t('For actual time')}: ${formatMoney(r.agreed_rate)} × ${actualPeriods} ${t(rentPeriodUnit[r.rental_type])} = ${formatMoney(actualSuggestion)}`}
        />
        {actualSuggestion !== n(w.rent_amount) && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setValue('rent_amount', actualSuggestion, { shouldValidate: true })}>
              {t('Use {{amount}}', { amount: formatMoney(actualSuggestion) })}
            </Button>
            {n(w.rent_amount) !== Number(r.rent_amount) && (
              <Button size="sm" variant="ghost" onClick={() => setValue('rent_amount', Number(r.rent_amount), { shouldValidate: true })}>
                {t('Keep agreed')}
              </Button>
            )}
          </div>
        )}
      </Section>

      <Section title="Charges">
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField label="Fuel / mileage charge" optional {...register('fuel_charge')} error={err.fuel_charge?.message} />
          <MoneyField label="Extra KM charge" optional {...register('extra_km_charge')} error={err.extra_km_charge?.message} />
          <MoneyField label="Damage charge" optional {...register('damage_charge')} error={err.damage_charge?.message} />
          <TextField label="Damage notes" optional {...register('damage_notes')} />
          <MoneyField label="Other charge" optional {...register('other_charge')} error={err.other_charge?.message} />
          <TextField label="Other charge is for" optional={!n(w.other_charge)} {...register('other_charge_note')} error={err.other_charge_note?.message} />
        </div>
      </Section>

      <div className="sticky top-14 z-20 -mx-4 bg-slate-50/95 px-4 py-2 backdrop-blur lg:top-0">
        <MoneySummary compact bill={bill} paid={paidAfter} pending={pendingAfter} deposit={depositAfter} />
      </div>

      <Section title="Settle now" action={<span className="text-xs text-slate-400">{t('Optional')}</span>}>
        <div className="space-y-4">
          {depositHeld > 0 && (
            <div>
              <MoneyField
                label="Use deposit toward bill"
                {...register('deposit_used')}
                error={err.deposit_used?.message}
                hint={`${t('Deposit held')}: ${formatMoney(depositHeld)}`}
              />
              {maxDepositUse > 0 && (
                <button type="button" className="mt-1 text-sm font-medium text-navy-700 hover:underline" onClick={() => setValue('deposit_used', maxDepositUse, { shouldValidate: true })}>
                  {t('Use {{amount}}', { amount: formatMoney(maxDepositUse) })}
                </button>
              )}
            </div>
          )}
          <div>
            <MoneyField label="Payment received now" {...register('payment_amount')} error={err.payment_amount?.message} />
            {pendingBefore - n(w.deposit_used) > 0 && (
              <button
                type="button"
                className="mt-1 text-sm font-medium text-navy-700 hover:underline"
                onClick={() => setValue('payment_amount', pendingBefore - n(w.deposit_used), { shouldValidate: true })}
              >
                {t('Fill {{amount}}', { amount: formatMoney(pendingBefore - n(w.deposit_used)) })}
              </button>
            )}
          </div>
          {n(w.payment_amount) > 0 && (
            <Controller
              control={control}
              name="payment_method_id"
              render={({ field }) => <MethodPicker value={field.value} onChange={field.onChange} error={err.payment_method_id?.message} />}
            />
          )}
          {depositHeld > 0 && (
            <div>
              <MoneyField label="Return deposit to customer" {...register('deposit_returned')} error={err.deposit_returned?.message} />
              {depositHeld - n(w.deposit_used) > 0 && (
                <button
                  type="button"
                  className="mt-1 text-sm font-medium text-navy-700 hover:underline"
                  onClick={() => setValue('deposit_returned', depositHeld - n(w.deposit_used), { shouldValidate: true })}
                >
                  {t('Return {{amount}}', { amount: formatMoney(depositHeld - n(w.deposit_used)) })}
                </button>
              )}
            </div>
          )}
          {n(w.deposit_returned) > 0 && (
            <Controller
              control={control}
              name="deposit_return_method_id"
              render={({ field }) => (
                <MethodPicker label="Deposit returned by" value={field.value} onChange={field.onChange} error={err.deposit_return_method_id?.message} />
              )}
            />
          )}
        </div>
      </Section>

      <Section title="Car after return">
        <div className="space-y-4">
          <Controller
            control={control}
            name="next_car_status"
            render={({ field }) => (
              <SegmentedControl
                value={field.value}
                onChange={(v) => v && field.onChange(v)}
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'maintenance', label: 'At Maintenance' },
                ]}
              />
            )}
          />
          {w.next_car_status === 'maintenance' && <TextField label="Maintenance reason" optional {...register('car_status_reason')} />}
          <TextAreaField label="Notes" optional {...register('notes')} />
        </div>
      </Section>

      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <Button type="submit" block size="lg" loading={submit.isPending}>
          {pendingAfter === 0 && depositAfter === 0 ? t('Confirm return & close') : t('Confirm return')}
        </Button>
      </div>
    </form>
  );
}
