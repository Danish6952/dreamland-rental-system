import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, MessageCircle, Pencil, Phone } from 'lucide-react';
import type { z } from 'zod';
import { useCustomer, useCustomerBalance } from '@/hooks/useCustomers';
import { useRentals } from '@/hooks/useRentals';
import { useAuth } from '@/hooks/useAuth';
import { useAction } from '@/hooks/useAction';
import { customerService } from '@/services/customerService';
import { customerSchema, type CustomerFormInput } from '@/validation/customerSchema';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { InfoRow, Section } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { ErrorState, ListSkeleton } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { MoneySummary } from '@/components/rentals/MoneySummary';
import { RentalCard } from '@/components/rentals/RentalCard';
import { formatPhone, whatsappLink } from '@/lib/format';

export default function CustomerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { isOwner } = useAuth();
  const customer = useCustomer(id);
  const balance = useCustomerBalance(id);
  const rentals = useRentals({ customerId: id });
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const archive = useAction((reason: string) => customerService.archive(id!, reason), {
    success: 'Customer archived',
    onSuccess: () => setArchiveOpen(false),
  });
  const restore = useAction(() => customerService.restore(id!), { success: 'Customer restored' });

  if (customer.isLoading) return <ListSkeleton rows={3} />;
  if (!customer.data) return <ErrorState error={customer.error} />;
  const c = customer.data;
  const b = balance.data;

  return (
    <div className="space-y-4">
      <PageHeader
        back="/customers"
        title={c.full_name}
        subtitle={formatPhone(c.mobile)}
        actions={
          <>
            {c.archived_at && <Badge tone="gray">{t('Archived')}</Badge>}
            <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditOpen(true)}>
              {t('Edit')}
            </Button>
          </>
        }
      />
      <div className="flex gap-2">
        <a href={`tel:${c.mobile}`} className="card flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold text-navy-800">
          <Phone className="size-4" /> {t('Call')}
        </a>
        <a href={whatsappLink(c.mobile)} target="_blank" rel="noreferrer" className="card flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold text-green-700">
          <MessageCircle className="size-4" /> WhatsApp
        </a>
      </div>

      {b && <MoneySummary bill={Number(b.total_billed)} paid={Number(b.total_paid)} pending={Number(b.total_pending)} deposit={Number(b.deposit_held)} />}

      <Section title="Details">
        <dl>
          <InfoRow label="License number">{c.license_number}</InfoRow>
          <InfoRow label="CNIC">{c.cnic || '—'}</InfoRow>
          <InfoRow label="Rentals">{b?.rentals_count ?? '—'}</InfoRow>
          {c.notes && <InfoRow label="Notes">{c.notes}</InfoRow>}
        </dl>
      </Section>

      <Section title="Rental history">
        {rentals.isLoading ? (
          <ListSkeleton rows={2} />
        ) : rentals.data?.length ? (
          <div className="space-y-2">
            {rentals.data.map((r) => (
              <RentalCard key={r.id} r={r} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">—</p>
        )}
      </Section>

      {isOwner &&
        (c.archived_at ? (
          <Button variant="ghost" icon={<ArchiveRestore className="size-4" />} loading={restore.isPending} onClick={() => restore.mutate(undefined)}>
            {t('Restore customer')}
          </Button>
        ) : (
          <Button variant="ghost" icon={<Archive className="size-4" />} onClick={() => setArchiveOpen(true)}>
            {t('Archive customer')}
          </Button>
        ))}

      <EditCustomerSheet open={editOpen} onClose={() => setEditOpen(false)} customerId={c.id} initial={c} />
      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title="Archive customer"
        message={t('Hidden from search at Car Out. History is kept.')}
        optionalReason
        confirmLabel="Archive"
        loading={archive.isPending}
        onConfirm={(r) => archive.mutate(r)}
      />
    </div>
  );
}

function EditCustomerSheet({
  open,
  onClose,
  customerId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  initial: { full_name: string; mobile: string; license_number: string; cnic: string | null; notes: string | null };
}) {
  const { t } = useTranslation();
  const form = useForm<CustomerFormInput, unknown, z.output<typeof customerSchema>>({ resolver: zodResolver(customerSchema) });
  const err = form.formState.errors;
  useEffect(() => {
    if (open) form.reset({ ...initial, cnic: initial.cnic ?? '', notes: initial.notes ?? '' });
  }, [open, initial, form]);
  const save = useAction((v: z.output<typeof customerSchema>) => customerService.update(customerId, v), {
    success: 'Customer updated',
    onSuccess: onClose,
  });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit customer"
      footer={
        <Button block size="lg" loading={save.isPending} onClick={form.handleSubmit((v) => save.mutate(v))}>
          {t('Save changes')}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">{t('Past rentals keep the details they had at Car Out.')}</p>
        <TextField label="Full name" {...form.register('full_name')} error={err.full_name?.message} />
        <TextField label="Mobile" type="tel" {...form.register('mobile')} error={err.mobile?.message} />
        <TextField label="License number" {...form.register('license_number')} error={err.license_number?.message} />
        <TextField label="CNIC" optional {...form.register('cnic')} />
        <TextAreaField label="Notes" optional {...form.register('notes')} />
      </div>
    </Sheet>
  );
}
