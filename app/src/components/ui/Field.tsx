import clsx from 'clsx';
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
}

/** Label + control + hint/error. Labels are always visible (06 §6). */
export function Field({ label, error, hint, optional, children, className }: FieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-slate-700">
        <span>{t(label)}</span>
        {optional && <span className="text-xs font-normal text-slate-400">{t('Optional')}</span>}
      </label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} className="text-sm text-red-600">
          {t(error)}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Base = { label: string; error?: string; hint?: ReactNode; optional?: boolean; wrapperClassName?: string };

export function TextField({
  label,
  error,
  hint,
  optional,
  wrapperClassName,
  className,
  ref,
  ...rest
}: Base & InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      {(id, describedBy) => (
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx('input', className)}
          {...rest}
        />
      )}
    </Field>
  );
}

/** Money input: numeric keypad, "Rs" prefix */
export function MoneyField({
  label,
  error,
  hint,
  optional,
  wrapperClassName,
  ref,
  ...rest
}: Base & InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      {(id, describedBy) => (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-sm font-medium text-slate-400">
            Rs
          </span>
          <input
            id={id}
            ref={ref}
            type="number"
            inputMode="numeric"
            min={0}
            step="1"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="input num ps-10"
            {...rest}
          />
        </div>
      )}
    </Field>
  );
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  wrapperClassName,
  className,
  children,
  ref,
  ...rest
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      {(id, describedBy) => (
        <select
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx('input appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pe-9', className)}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          }}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  optional,
  wrapperClassName,
  className,
  ref,
  ...rest
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      {(id, describedBy) => (
        <textarea
          id={id}
          ref={ref}
          rows={3}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx('input min-h-20', className)}
          {...rest}
        />
      )}
    </Field>
  );
}
