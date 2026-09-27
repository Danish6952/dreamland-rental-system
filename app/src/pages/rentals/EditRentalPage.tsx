import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { useRental } from '@/hooks/useRentals';
import { useAction } from '@/hooks/useAction';
import { rentalService } from '@/services/rentalService';
import { rentalEditSchema, type RentalEditFormInput } from '@/validation/rentalEditSchema';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoneyField, TextAreaField, TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ErrorState, ListSkeleton } from '@/components/ui/States';
import { FUEL_LEVELS, fuelLabel, rentPeriodUnit } from '@/lib/labels';
import { toPKTDate } from '@/lib/format';

/** Extend a rental or correct its charges (rule R-12). Reason required; audited. */
export default function EditRentalPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const rental = useRental(id);
  const form = useForm<RentalEditFormInput, unknown, z.output<typeof rentalEditSchema>>({ resolver: zodResolver(rentalEditSchema) });
  const { register, handleSubmit, control, reset, formState } = form;
  const err = formState.errors;

  useEffect(() => {
    const r = rental.data;
    if (!r) return;
    reset({
      expected_return_date: r.expected_return_date,
      agreed_rate: Number(r.agreed_rate),
      rent_amount: Number(r.rent_amount),
      fuel_charge: Number(r.fuel_charge),
      damage_charge: Number(r.damage_charge),
      damage_notes: r.damage_notes ?? '',
      extra_km_charge: Number(r.extra_km_charge),
      other_charge: Number(r.other_charge),
      other_charge_note: r.other_charge_note ?? '',
      start_km: r.start_km ?? '',
      end_km: r.end_km ?? '',
      fuel_out: r.fuel_out ?? '',
      fuel_in: r.fuel_in ?? '',
      guarantor_name: r.guarantor_name,
      guarantor_mobile: r.guarantor_mobile,
      notes: r.notes ?? '',
      reason: '',
    } as RentalEditFormInput);
  }, [rental.data, reset]);

  const save = useAction(
    (v: z.output<typeof rentalEditSchema>) => {
      const returned = rental.data!.status !== 'out';
      return rentalService.update(id!, {
        ...v,
        end_km: returned ? v.end_km : null,
        fuel_in: returned ? v.fuel_in : null,
        damage_notes: v.damage_notes ?? '',
        other_charge_note: v.other_charge_note ?? '',
        notes: v.notes ?? '',
      });
    },
    { success: 'Rental updated', onSuccess: () => navigate(`/rentals/${id}`, { replace: true }) },
  );

  if (rental.isLoading) return <ListSkeleton rows={3} />;
  if (!rental.data) return <ErrorState error={rental.error} />;
  const r = rental.data;
  if (r.status === 'void') return <PageHeader back title="A void rental cannot be changed" />;
  const returned = r.status !== 'out';

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
      <PageHeader back={`/rentals/${id}`} title={returned ? 'Correct rental' : 'Extend / edit rental'} subtitle={`${r.rental_number} · ${r.car_number} · ${r.driver_name}`} />

      <Section title="Terms">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Expected return date"
            type="date"
            min={toPKTDate(r.out_at)}
            {...register('expected_return_date')}
            error={err.expected_return_date?.message}
          />
          <MoneyField label={`${t('Agreed rate')} / ${t(rentPeriodUnit[r.rental_type])}`} {...register('agreed_rate')} error={err.agreed_rate?.message} />
          <MoneyField label="Total rent amount" {...register('rent_amount')} error={err.rent_amount?.message} wrapperClassName="sm:col-span-2" />
        </div>
      </Section>

      <Section title="Charges">
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField label="Fuel / mileage charge" {...register('fuel_charge')} error={err.fuel_charge?.message} />
          <MoneyField label="Extra KM charge" {...register('extra_km_charge')} error={err.extra_km_charge?.message} />
          <MoneyField label="Damage charge" {...register('damage_charge')} error={err.damage_charge?.message} />
          <TextField label="Damage notes" optional {...register('damage_notes')} />
          <MoneyField label="Other charge" {...register('other_charge')} error={err.other_charge?.message} />
          <TextField label="Other charge is for" optional {...register('other_charge_note')} error={err.other_charge_note?.message} />
        </div>
      </Section>

      <Section title="KM & fuel">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Start KM" optional type="number" inputMode="numeric" {...register('start_km')} error={err.start_km?.message} />
          {returned && <TextField label="End KM" optional type="number" inputMode="numeric" {...register('end_km')} error={err.end_km?.message} />}
          <Controller
            control={control}
            name="fuel_out"
            render={({ field }) => (
              <SegmentedControl label="Fuel out" optional columns={5} value={field.value ?? ''} onChange={field.onChange} options={FUEL_LEVELS.map((f) => ({ value: f, label: fuelLabel[f] }))} />
            )}
          />
          {returned && (
            <Controller
              control={control}
              name="fuel_in"
              render={({ field }) => (
                <SegmentedControl label="Fuel in" optional columns={5} value={field.value ?? ''} onChange={field.onChange} options={FUEL_LEVELS.map((f) => ({ value: f, label: fuelLabel[f] }))} />
              )}
            />
          )}
        </div>
      </Section>

      <Section title="Guarantor & notes">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Guarantor name" {...register('guarantor_name')} error={err.guarantor_name?.message} />
          <TextField label="Guarantor mobile" type="tel" {...register('guarantor_mobile')} error={err.guarantor_mobile?.message} />
          <TextAreaField label="Notes" optional wrapperClassName="sm:col-span-2" {...register('notes')} />
        </div>
      </Section>

      <Section>
        <TextAreaField label="Reason for change" placeholder={t('e.g. Rental extended by one month')} {...register('reason')} error={err.reason?.message} />
      </Section>

      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <Button type="submit" block size="lg" loading={save.isPending}>
          {t('Save changes')}
        </Button>
      </div>
    </form>
  );
}
