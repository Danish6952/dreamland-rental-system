import clsx from 'clsx';
import { formatMoney } from '@/lib/format';

/** Minimal accessible bar chart (no chart library needed at this scale) */
export function BarChart({
  data,
  selected,
  onSelect,
}: {
  data: { key: string; label: string; value: number }[];
  selected?: string;
  onSelect?: (key: string) => void;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-44 items-end gap-1.5" role="list">
      {data.map((d) => {
        const h = Math.max(2, Math.round((Math.max(d.value, 0) / max) * 100));
        const active = selected === d.key;
        return (
          <button
            key={d.key}
            type="button"
            role="listitem"
            onClick={() => onSelect?.(d.key)}
            className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            aria-label={`${d.label}: ${formatMoney(d.value)}`}
            title={`${d.label}: ${formatMoney(d.value)}`}
          >
            <div
              className={clsx(
                'w-full rounded-t-md transition',
                active ? 'bg-gold-500' : 'bg-navy-700/80 group-hover:bg-navy-600',
              )}
              style={{ height: `${h}%` }}
            />
            <span className={clsx('w-full truncate text-center text-[10px]', active ? 'font-bold text-navy-900' : 'text-slate-500')}>{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}
