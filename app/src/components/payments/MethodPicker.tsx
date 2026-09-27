import { usePaymentMethods } from '@/hooks/usePayments';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

/** Payment method chips (Cash / Bank Transfer / Mobile Wallet / …) */
export function MethodPicker({
  value,
  onChange,
  error,
  label = 'Method',
  includeId,
}: {
  value: string | undefined | null;
  onChange: (v: string) => void;
  error?: string;
  label?: string;
  /** keep showing an inactive method that is already selected (editing old payments) */
  includeId?: string | null;
}) {
  const { data: methods = [] } = usePaymentMethods(true);
  const shown = methods.filter((m) => m.is_active || m.id === includeId);
  return (
    <SegmentedControl
      label={label}
      value={value ?? ''}
      onChange={(v) => onChange(v)}
      error={error}
      columns={shown.length >= 3 ? 3 : 2}
      options={shown.map((m) => ({ value: m.id, label: m.name.replace(/\s*\(.*\)$/, '') }))}
    />
  );
}
