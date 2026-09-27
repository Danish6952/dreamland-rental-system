import clsx from 'clsx';

/** Placeholder wordmark — replace with the real logo (public/logo-placeholder.svg) later */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <img src="/icon.svg" alt="" className="size-8 rounded-lg ring-1 ring-gold-500/30" />
      {!compact && (
        <div className="leading-none">
          <div className="text-[15px] font-bold tracking-[0.2em] text-gold-400">DREAMLAND</div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Rentals</div>
        </div>
      )}
    </div>
  );
}
