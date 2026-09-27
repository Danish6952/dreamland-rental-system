import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePaymentMethods } from '@/hooks/usePayments';
import { useAction } from '@/hooks/useAction';
import { paymentService } from '@/services/paymentService';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/States';

/** Owner only (PAY-03). Methods are never deleted, only deactivated. */
export default function PaymentMethodsPage() {
  const { t } = useTranslation();
  const methods = usePaymentMethods(true);
  const [name, setName] = useState('');
  const add = useAction((n: string) => paymentService.addMethod(n), { success: 'Payment method added', onSuccess: () => setName('') });
  const toggle = useAction(({ id, active }: { id: string; active: boolean }) => paymentService.setMethodActive(id, active), {
    success: 'Payment method updated',
  });

  return (
    <div className="space-y-4">
      <PageHeader back="/settings" title="Payment methods" />
      <QueryState query={methods}>
        {(list) => (
          <ul className="card divide-y divide-slate-100 overflow-hidden">
            {list.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 font-medium">{m.name}</span>
                {!m.is_active && <Badge tone="gray">{t('Inactive')}</Badge>}
                <Button size="sm" variant="secondary" onClick={() => toggle.mutate({ id: m.id, active: !m.is_active })}>
                  {t(m.is_active ? 'Deactivate' : 'Activate')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <Section title="Add method">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) add.mutate(name.trim());
          }}
        >
          <TextField label="Name" placeholder={t('e.g. Cheque')} value={name} onChange={(e) => setName(e.target.value)} wrapperClassName="flex-1" />
          <Button type="submit" loading={add.isPending} disabled={name.trim().length < 2}>
            {t('Add')}
          </Button>
        </form>
      </Section>
    </div>
  );
}
