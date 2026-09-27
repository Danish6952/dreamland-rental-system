import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { usePayments, usePaymentMethods } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { useAction } from '@/hooks/useAction';
import { paymentService } from '@/services/paymentService';
import type { PaymentListItem, PaymentType } from '@/types/models';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { QueryState } from '@/components/ui/States';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PaymentList } from '@/components/payments/PaymentList';
import { EditPaymentSheet } from '@/components/payments/EditPaymentSheet';
import { paymentTypeLabel } from '@/lib/labels';
import { formatMoney, startOfMonth, todayPKT } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';

/** All payments / Payment history report (REP-04) */
export default function PaymentsListPage() {
  const { t } = useTranslation();
  const { isOwner } = useAuth();
  const [params, setParams] = useSearchParams();
  const from = params.get('from') ?? startOfMonth(todayPKT());
  const to = params.get('to') ?? todayPKT();
  const type = (params.get('type') ?? '') as PaymentType | '';
  const methodId = params.get('method') ?? '';
  const includeVoided = params.get('voided') === '1';
  const payments = usePayments({ from, to, type, methodId: methodId || undefined, includeVoided });
  const methods = usePaymentMethods(true);
  const [editing, setEditing] = useState<PaymentListItem | null>(null);
  const [voiding, setVoiding] = useState<PaymentListItem | null>(null);
  const voidAction = useAction(({ id, reason }: { id: string; reason: string }) => paymentService.void(id, reason), {
    success: 'Payment voided',
    onSuccess: () => setVoiding(null),
  });

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };

  const totals = useMemo(() => {
    const byType = new Map<PaymentType, number>();
    for (const p of payments.data ?? []) if (!p.is_voided) byType.set(p.type, (byType.get(p.type) ?? 0) + Number(p.amount));
    const income = (byType.get('advance') ?? 0) + (byType.get('rent') ?? 0) + (byType.get('deposit_used') ?? 0) - (byType.get('refund') ?? 0);
    return { byType, income };
  }, [payments.data]);

  const exportCsv = () =>
    downloadCsv(
      `payments_${from}_${to}`,
      ['Date', 'Type', 'Amount', 'Method', 'Reference', 'Rental', 'Car', 'Driver', 'Voided', 'Note'],
      (payments.data ?? []).map((p) => [
        p.payment_date,
        paymentTypeLabel[p.type],
        Number(p.amount),
        p.method_name,
        p.reference,
        p.rental_number,
        p.car_number,
        p.driver_name,
        p.is_voided ? 'yes' : '',
        p.notes,
      ]),
    );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        actions={
          <Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv} disabled={!payments.data?.length}>
            CSV
          </Button>
        }
      />
      <Section>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <TextField label="From" type="date" value={from} max={to} onChange={(e) => set('from', e.target.value)} />
          <TextField label="To" type="date" value={to} min={from} max={todayPKT()} onChange={(e) => set('to', e.target.value)} />
          <SelectField label="Type" value={type} onChange={(e) => set('type', e.target.value)}>
            <option value="">{t('All types')}</option>
            {Object.entries(paymentTypeLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {t(v)}
              </option>
            ))}
          </SelectField>
          <SelectField label="Method" value={methodId} onChange={(e) => set('method', e.target.value)}>
            <option value="">{t('All methods')}</option>
            {methods.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectField>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={includeVoided} onChange={(e) => set('voided', e.target.checked ? '1' : '')} className="size-4 rounded" />
          {t('Show voided payments')}
        </label>
      </Section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-3">
          <div className="text-xs font-semibold uppercase text-slate-500">{t('Income')}</div>
          <div className="num text-lg font-bold text-green-700">{formatMoney(totals.income)}</div>
        </div>
        {(['deposit_taken', 'deposit_returned', 'refund'] as PaymentType[]).map((k) => (
          <div key={k} className="card p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">{t(paymentTypeLabel[k])}</div>
            <div className="num text-lg font-bold">{formatMoney(totals.byType.get(k) ?? 0)}</div>
          </div>
        ))}
      </div>

      <Section>
        <QueryState query={payments}>
          {(list) => <PaymentList payments={list} showRental onEdit={setEditing} onVoid={isOwner ? setVoiding : undefined} />}
        </QueryState>
      </Section>

      <EditPaymentSheet payment={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!voiding}
        onClose={() => setVoiding(null)}
        title="Void payment"
        requireReason
        danger
        confirmLabel="Void payment"
        loading={voidAction.isPending}
        onConfirm={(reason) => voiding && voidAction.mutate({ id: voiding.id, reason })}
      />
    </div>
  );
}
