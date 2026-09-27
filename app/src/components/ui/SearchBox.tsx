import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Debounced search input */
export function SearchBox({
  value,
  onChange,
  placeholder = 'Search',
  delay = 250,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  delay?: number;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (local === value) return;
    const id = setTimeout(() => onChange(local), delay);
    return () => clearTimeout(id);
  }, [local, value, onChange, delay]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={t(placeholder)}
        className="input ps-10 pe-10"
        autoFocus={autoFocus}
        aria-label={t(placeholder)}
      />
      {local && (
        <button
          onClick={() => {
            setLocal('');
            onChange('');
          }}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-600"
          aria-label={t('Clear')}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
