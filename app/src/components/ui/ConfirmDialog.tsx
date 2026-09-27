import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { TextAreaField } from './Field';

/**
 * Confirmation for irreversible / money-moving actions.
 * requireReason: user must type a reason (≥ 5 chars, rule V-16).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  requireReason,
  reasonLabel = 'Reason',
  optionalReason,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  requireReason?: boolean;
  optionalReason?: boolean;
  reasonLabel?: string;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const invalid = requireReason && reason.trim().length < 5;

  const close = () => {
    setReason('');
    setTouched(false);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={close}>
            {t('Cancel')}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            block
            loading={loading}
            onClick={() => {
              setTouched(true);
              if (!invalid) onConfirm(reason.trim());
            }}
          >
            {t(confirmLabel)}
          </Button>
        </div>
      }
    >
      {message && <div className="mb-4 text-[15px] text-slate-600">{message}</div>}
      {(requireReason || optionalReason) && (
        <TextAreaField
          label={reasonLabel}
          optional={optionalReason}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={touched && invalid ? 'Please give a reason (at least 5 characters)' : undefined}
          autoFocus
        />
      )}
    </Sheet>
  );
}
