import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  text: string;
}
interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ToastItem[]>([]);
  const remove = useCallback((id: number) => setItems((l) => l.filter((i) => i.id !== id)), []);
  const push = useCallback(
    (kind: ToastItem['kind'], text: string) => {
      const id = nextId++;
      setItems((l) => [...l.slice(-2), { id, kind, text }]);
      setTimeout(() => remove(id), kind === 'error' ? 7000 : 3500);
    },
    [remove],
  );
  const api = useMemo(() => ({ success: (s: string) => push('success', s), error: (s: string) => push('error', s) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3 safe-top"
        aria-live="polite"
      >
        {items.map((i) => (
          <div
            key={i.id}
            role={i.kind === 'error' ? 'alert' : 'status'}
            className={clsx(
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1',
              i.kind === 'success' ? 'bg-navy-950 text-white ring-navy-800' : 'bg-red-600 text-white ring-red-700',
            )}
          >
            {i.kind === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-400" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            )}
            <span className="flex-1">{t(i.text)}</span>
            <button onClick={() => remove(i.id)} aria-label={t('Close')} className="-m-1 p-1 opacity-70 hover:opacity-100">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
