import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface Option<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Large tap-friendly option buttons (rental type, payment type, fuel, method) */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  columns,
  optional,
}: {
  label?: string;
  options: Option<T>[];
  value: T | '' | null | undefined;
  onChange: (v: T | '') => void;
  error?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  optional?: boolean;
}) {
  const { t } = useTranslation();
  const cols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-3 sm:grid-cols-6' }[
    columns ?? (Math.min(options.length, 4) as 2 | 3 | 4)
  ];
  return (
    <fieldset className="space-y-1.5">
      {label && (
        <legend className="mb-1.5 flex w-full items-baseline justify-between text-sm font-medium text-slate-700">
          <span>{t(label)}</span>
          {optional && <span className="text-xs font-normal text-slate-400">{t('Optional')}</span>}
        </legend>
      )}
      <div className={clsx('grid gap-2', cols)} role="radiogroup">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={o.disabled}
              onClick={() => onChange(optional && active ? '' : o.value)}
              className={clsx(
                'min-h-11 rounded-xl px-2 text-sm font-medium ring-1 ring-inset transition disabled:opacity-40',
                active
                  ? 'bg-navy-900 text-white ring-navy-900'
                  : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50',
              )}
            >
              {t(o.label)}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-600">{t(error)}</p>}
    </fieldset>
  );
}
