import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string | true;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex items-start gap-3">
      {back && (
        <button
          onClick={() => (back === true ? navigate(-1) : navigate(back))}
          className="-ms-2 mt-0.5 rounded-lg p-2 text-slate-600 hover:bg-slate-200/60"
          aria-label={t('Back')}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {typeof title === 'string' ? t(title) : title}
        </h1>
        {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
