import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import type { z } from 'zod';
import { useCar, useCarEarnings } from '@/hooks/useCars';
import { useAction } from '@/hooks/useAction';
import { carService } from '@/services/carService';
import { makeSellSchema, type SellFormInput } from '@/validation/sellSchema';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoneyField, TextAreaField, TextField } from '@/components/ui/Field';
import { ErrorState, ListSkeleton } from '@/components/ui/States';
import { formatMoney, todayPKT } from '@/lib/format';

/** Flow 5 — Owner only (route + database). Sold is final. */
export default function SellCarPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const car = useCar(id);
  const earnings = useCarEarnings(id);
  const schema = useMemo(() => makeSellSchema(car.data?.car_number ?? ''), [car.data?.car_number]);
  const form = useForm<SellFormInput, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { sale_date: todayPKT() },
  });
  const err = form.formState.errors;

  const sell = useAction(
    (v: z.output<typeof schema>) =>
      carService.sell(id!, {
        sale_date: v.sale_date,
        sale_price: v.sale_price,
        buyer_name: v.buyer_name,
        buyer_mobile: v.buyer_mobile ?? undefined,
        buyer_cnic: v.buyer_cnic ?? undefined,
        notes: v.notes ?? undefined,
      }),
    { success: 'Car marked as sold', onSuccess: () => navigate(`/cars/${id}`, { replace: true }) },
  );

  if (car.isLoading) return <ListSkeleton rows={2} />;
  if (!car.data) return <ErrorState error={car.error} />;
  const c = car.data;
  const pending = Number(earnings.data?.total_pending ?? 0);

  if (c.status === 'on_rent' || c.status === 'sold') {
    return (
      <div>
        <PageHeader back title="Mark as sold" subtitle={c.car_number} />
        <Section>
          <p className="text-sm text-slate-700">
            {c.status === 'sold' ? t('This car is already sold.') : t('This car is On Rent. Return the car first.')}
          </p>
        </Section>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit((v) => sell.mutate(v))} className="space-y-4">
      <PageHeader back title="Mark as sold" subtitle={`${c.car_number} · ${c.model}`} />
      {pending > 0 && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <p>
            {t('Rentals of this car still have {{amount}} pending. Those balances stay open and can still be collected after the sale.', {
              amount: formatMoney(pending),
            })}
          </p>
        </div>
      )}
      <Section title="Sale details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Sale date" type="date" max={todayPKT()} {...form.register('sale_date')} error={err.sale_date?.message} />
          <MoneyField label="Sale price" {...form.register('sale_price')} error={err.sale_price?.message} />
          <TextField label="Buyer name" {...form.register('buyer_name')} error={err.buyer_name?.message} />
          <TextField label="Buyer mobile" optional type="tel" inputMode="tel" {...form.register('buyer_mobile')} error={err.buyer_mobile?.message} />
          <TextField label="Buyer CNIC" optional {...form.register('buyer_cnic')} />
          <TextAreaField label="Notes" optional wrapperClassName="sm:col-span-2" {...form.register('notes')} />
        </div>
      </Section>
      <Section>
        <p className="mb-3 text-sm text-slate-600">
          {t('Selling is permanent. The car will be archived with its full history. Type the car number to confirm.')}
        </p>
        <TextField label={`${t('Type')} ${c.car_number}`} autoCapitalize="characters" {...form.register('confirm')} error={err.confirm?.message} />
      </Section>
      <Button type="submit" variant="danger" block size="lg" loading={sell.isPending}>
        {t('Mark {{car}} as sold', { car: c.car_number })}
      </Button>
    </form>
  );
}
