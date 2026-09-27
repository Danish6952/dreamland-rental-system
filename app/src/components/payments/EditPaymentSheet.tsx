import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { PaymentListItem } from '@/types/models';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { MoneyField, TextAreaField, TextField } from '@/components/ui/Field';
import { MethodPicker } from './MethodPicker';
import { editPaymentSchema, type EditPaymentFormInput } from '@/validation/paymentSchema';
import { paymentTypeLabel } from '@/lib/labels';
import { todayPKT } from '@/lib/format';
import { paymentService } from '@/services/paymentService';
import { useAction } from '@/hooks/useAction';
import type { z } from 'zod';

/** Edit a payment — reason required, saved to the audit log (rule P-8) */
export function EditPaymentSheet({ payment, onClose }: { payment: PaymentListItem | null; onClose: () => void }) {
  const { t } = useTranslation();
  const form = useForm<EditPaymentFormInput, unknown, z.output<typeof editPaymentSchema>>({ resolver: zodResolver(editPaymentSchema) });
  const { register, handleSubmit, control, reset, formState } = form;

  useEffect(() => {
    if (payment) {
      reset({
        type: payment.type,
        amount: Number(payment.amount),
        payment_date: payment.payment_date,
        method_id: payment.method_id ?? undefined,
        reference: payment.reference ?? '',
        notes: payment.notes ?? '',
        reason: '',
      });
    }
  }, [payment, reset]);

  const save = useAction(
    (v: z.output<typeof editPaymentSchema>) =>
      paymentService.update(payment!.id, {
        amount: v.amount,
        payment_date: v.payment_date,
        method_id: payment!.type === 'deposit_used' ? null : (v.method_id ?? null),
        reference: v.reference,
        notes: v.notes,
        reason: v.reason,
      }),
    { success: 'Payment updated', onSuccess: onClose },
  );

  return (
    <Sheet
      open={!!payment}
      onClose={onClose}
      title="Edit payment"
      footer={
        <Button block size="lg" loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>
          {t('Save changes')}
        </Button>
      }
    >
      {payment && (
        <form className="space-y-4" onSubmit={handleSubmit((v) => save.mutate(v))}>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {t(paymentTypeLabel[payment.type])} · {payment.rental_number} · {payment.driver_name}
          </div>
          <MoneyField label="Amount" {...register('amount')} error={formState.errors.amount?.message} />
          <TextField label="Date" type="date" max={todayPKT()} {...register('payment_date')} error={formState.errors.payment_date?.message} />
          {payment.type !== 'deposit_used' && (
            <Controller
              control={control}
              name="method_id"
              render={({ field }) => (
                <MethodPicker value={field.value} onChange={field.onChange} includeId={payment.method_id} error={formState.errors.method_id?.message} />
              )}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Reference" optional {...register('reference')} />
            <TextField label="Note" optional {...register('notes')} />
          </div>
          <TextAreaField
            label="Reason for change"
            placeholder={t('e.g. Wrong amount entered')}
            {...register('reason')}
            error={formState.errors.reason?.message}
          />
        </form>
      )}
    </Sheet>
  );
}
