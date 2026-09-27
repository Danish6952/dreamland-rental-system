import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useCar } from '@/hooks/useCars';
import { useAction } from '@/hooks/useAction';
import { carService } from '@/services/carService';
import { carSchema, type CarFormInput, type CarFormOutput } from '@/validation/carSchema';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoneyField, TextAreaField, TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ListSkeleton } from '@/components/ui/States';
import { RENT_PERIODS, rentPeriodLabel } from '@/lib/labels';

/** Add car (Flow 1) / edit car details. Status is never edited here (rule C-3/C-4). */
export default function CarFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const car = useCar(id);
  const editing = !!id;

  const form = useForm<CarFormInput, unknown, CarFormOutput>({
    resolver: zodResolver(carSchema),
    defaultValues: { standard_rent_period: 'monthly' },
  });
  const { register, handleSubmit, control, reset, formState } = form;
  const err = formState.errors;

  useEffect(() => {
    if (car.data) {
      const c = car.data;
      reset({
        car_number: c.car_number,
        make: c.make ?? '',
        model: c.model,
        year: c.year ?? '',
        color: c.color ?? '',
        registered_to: c.registered_to ?? '',
        standard_rent: Number(c.standard_rent),
        standard_rent_period: c.standard_rent_period,
        insurance_expiry: c.insurance_expiry ?? '',
        notes: c.notes ?? '',
      } as CarFormInput);
    }
  }, [car.data, reset]);

  const save = useAction(
    async (v: CarFormOutput) => {
      const input = { ...v, standard_rent: v.standard_rent };
      if (editing) {
        await carService.update(id!, input);
        return id!;
      }
      return carService.create(input);
    },
    { success: editing ? 'Car updated' : 'Car added', onSuccess: (newId) => navigate(`/cars/${newId}`, { replace: true }) },
  );

  if (editing && car.isLoading) return <ListSkeleton rows={2} />;
  if (editing && car.data?.status === 'sold') {
    return <PageHeader back title="Sold cars cannot be edited" />;
  }

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
      <PageHeader back title={editing ? 'Edit car' : 'Add car'} subtitle={editing ? car.data?.car_number : undefined} />
      <Section title="Car details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Car number"
            placeholder="ABC-123"
            autoCapitalize="characters"
            {...register('car_number')}
            error={err.car_number?.message}
          />
          <TextField label="Make" optional placeholder="Toyota" {...register('make')} error={err.make?.message} />
          <TextField label="Model" placeholder="Corolla GLi" {...register('model')} error={err.model?.message} />
          <TextField label="Year" optional type="number" inputMode="numeric" {...register('year')} error={err.year?.message} />
          <TextField label="Color" optional {...register('color')} error={err.color?.message} />
          <TextField label="Registered to" optional {...register('registered_to')} error={err.registered_to?.message} />
        </div>
      </Section>
      <Section title="Standard rent">
        <div className="space-y-4">
          <Controller
            control={control}
            name="standard_rent_period"
            render={({ field }) => (
              <SegmentedControl
                label="Period"
                value={field.value}
                onChange={(v) => v && field.onChange(v)}
                options={RENT_PERIODS.map((p) => ({ value: p, label: rentPeriodLabel[p] }))}
              />
            )}
          />
          <MoneyField
            label="Standard rent"
            hint={t('Default price. The agreed rent is set on each rental.')}
            {...register('standard_rent')}
            error={err.standard_rent?.message}
          />
        </div>
      </Section>
      <Section title="Other">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Insurance expiry" optional type="date" {...register('insurance_expiry')} error={err.insurance_expiry?.message} />
          <TextAreaField label="Notes" optional wrapperClassName="sm:col-span-2" {...register('notes')} />
        </div>
      </Section>
      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <Button type="submit" block size="lg" loading={save.isPending}>
          {t(editing ? 'Save changes' : 'Add car')}
        </Button>
      </div>
    </form>
  );
}
