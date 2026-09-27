import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

/** Horizontally scrolling filter chips */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'min-h-9 shrink-0 rounded-full px-3.5 text-sm font-medium ring-1 ring-inset transition',
            value === o.value ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50',
          )}
        >
          {t(o.label)}
          {o.count !== undefined && <span className="ms-1.5 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
