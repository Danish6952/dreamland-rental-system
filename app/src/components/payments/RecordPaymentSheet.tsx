import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { PaymentType, RentalBalance } from '@/types/models';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { MoneyField, TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MethodPicker } from './MethodPicker';
import { makePaymentSchema, maxForType, type PaymentFormInput, type PaymentFormOutput } from '@/validation/paymentSchema';
import { paymentTypeLabel } from '@/lib/labels';
import { formatMoney, todayPKT, toPKTDate } from '@/lib/format';
import { nextDueDate } from '@/lib/rentalCalc';
import { paymentService } from '@/services/paymentService';
import { useAction } from '@/hooks/useAction';

function allowedTypes(r: RentalBalance): PaymentType[] {
  const pending = Number(r.pending);
  const dep = Number(r.deposit_balance);
  const list: PaymentType[] = [];
  if (pending > 0) list.push('rent');
  if (pending > 0 && r.status === 'out') list.push('advance');
  if (dep > 0 && pending > 0) list.push('deposit_used');
  if (dep > 0) list.push('deposit_returned');
  if (pending < 0) list.push('refund');
  list.push('deposit_taken');
  return list;
}

export function RecordPaymentSheet({ rental, open, onClose }: { rental: RentalBalance; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const pending = Number(rental.pending);
  const depositBalance = Number(rental.deposit_balance);
  const ctx = useMemo(
    () => ({ pending, depositBalance, outDate: toPKTDate(rental.out_at) }),
    [pending, depositBalance, rental.out_at],
  );
  const types = allowedTypes(rental);
  const schema = useMemo(() => makePaymentSchema(ctx), [ctx]);

  const defaults = (): PaymentFormInput => ({
    type: types[0],
    amount: '' as unknown as number,
    payment_date: todayPKT(),
    method_id: undefined,
    reference: '',
    notes: '',
    next_due_date: '',
    next_due_amount: (rental.payment_due_amount ?? '') as unknown as number,
  });

  const form = useForm<PaymentFormInput, unknown, PaymentFormOutput>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const { register, handleSubmit, control, setValue, reset, formState } = form;
  const type = useWatch({ control, name: 'type' });
  const amount = Number(useWatch({ control, name: 'amount' })) || 0;

  useEffect(() => {
    if (open) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rental.id]);

  const max = maxForType(type, ctx);
  const askNextDue = rental.status === 'out' && (type === 'rent' || type === 'advance') && pending - amount > 0;

  useEffect(() => {
    if (askNextDue && !form.getValues('next_due_date')) {
      const base = rental.payment_due_date && rental.payment_due_date >= toPKTDate(rental.out_at) ? rental.payment_due_date : todayPKT();
      const next = nextDueDate(rental.rental_type, base);
      setValue('next_due_date', next < rental.expected_return_date ? next : rental.expected_return_date);
    }
  }, [askNextDue, rental, setValue, form]);

  // Preview after this payment
  const after = (() => {
    const a = amount;
    switch (type) {
      case 'advance':
      case 'rent':
        return { pending: pending - a, deposit: depositBalance };
      case 'deposit_used':
        return { pending: pending - a, deposit: depositBalance - a };
      case 'deposit_returned':
        return { pending, deposit: depositBalance - a };
      case 'deposit_taken':
        return { pending, deposit: depositBalance + a };
      case 'refund':
        return { pending: pending + a, deposit: depositBalance };
    }
  })();

  const save = useAction(
    (v: PaymentFormOutput) =>
      paymentService.record({
        rental_id: rental.id,
        type: v.type,
        amount: v.amount,
        payment_date: v.payment_date,
        method_id: v.method_id,
        reference: v.reference,
        notes: v.notes,
        next_due_date: askNextDue ? v.next_due_date : null,
        next_due_amount: askNextDue ? v.next_due_amount : null,
      }),
    { success: 'Payment saved', onSuccess: onClose },
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Record payment"
      footer={
        <Button block size="lg" loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>
          {t('Save payment')}
        </Button>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {rental.rental_number} · {rental.car_number} · {rental.driver_name}
        </div>

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <SegmentedControl
              label="Type"
              columns={3}
              value={field.value}
              onChange={(v) => v && field.onChange(v)}
              options={types.map((p) => ({ value: p, label: paymentTypeLabel[p] }))}
            />
          )}
        />

        <div>
          <MoneyField
            label="Amount"
            autoFocus
            {...register('amount')}
            error={formState.errors.amount?.message}
            hint={max !== null ? `${t('Maximum')} ${formatMoney(max)}` : undefined}
          />
          {max !== null && max > 0 && (
            <button
              type="button"
              className="mt-1.5 text-sm font-semibold text-navy-700 underline-offset-2 hover:underline"
              onClick={() => setValue('amount', max, { shouldValidate: true })}
            >
              {t('Fill {{amount}}', { amount: formatMoney(max) })}
            </button>
          )}
        </div>

        <TextField label="Date" type="date" max={todayPKT()} {...register('payment_date')} error={formState.errors.payment_date?.message} />

        {type !== 'deposit_used' && (
          <Controller
            control={control}
            name="method_id"
            render={({ field }) => <MethodPicker value={field.value} onChange={field.onChange} error={formState.errors.method_id?.message} />}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Reference" optional placeholder={t('Transaction ID')} {...register('reference')} />
          <TextField label="Note" optional {...register('notes')} />
        </div>

        {askNextDue && (
          <div className="space-y-3 rounded-xl bg-gold-50 p-3 ring-1 ring-gold-500/30">
            <p className="text-sm font-semibold text-navy-900">{t('Next payment due?')}</p>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Due date" type="date" {...register('next_due_date')} error={formState.errors.next_due_date?.message} />
              <MoneyField label="Due amount" optional {...register('next_due_amount')} error={formState.errors.next_due_amount?.message} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-navy-950 p-3 text-white">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{t('Pending after')}</div>
            <div className={`num text-lg font-bold ${after.pending > 0 ? 'text-red-300' : 'text-green-300'}`}>{formatMoney(after.pending)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{t('Deposit after')}</div>
            <div className="num text-lg font-bold text-gold-400">{formatMoney(after.deposit)}</div>
          </div>
        </div>
      </form>
    </Sheet>
  );
}
