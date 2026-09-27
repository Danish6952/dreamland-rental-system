import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="-mx-4 mb-4 overflow-x-auto border-b border-slate-200 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" role="tablist">
      <div className="flex gap-5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={value === tab.value}
            onClick={() => onChange(tab.value)}
            className={clsx(
              '-mb-px shrink-0 border-b-2 pb-2.5 pt-1 text-sm font-semibold transition',
              value === tab.value ? 'border-gold-500 text-navy-900' : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
