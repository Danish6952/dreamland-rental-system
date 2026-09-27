import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BarChart3, ChevronRight, CircleDollarSign, History, LogOut, Settings, Users, Wallet, UserCog } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';

/** Mobile "More" menu (06 §3.1) */
export default function MorePage() {
  const { t } = useTranslation();
  const { profile, isOwner, signOut } = useAuth();
  const items = [
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/cars?status=sold', label: 'Sold cars', icon: CircleDollarSign },
    { to: '/settings', label: 'Settings & language', icon: Settings },
    ...(isOwner
      ? [
          { to: '/settings/users', label: 'Users', icon: UserCog },
          { to: '/settings/payment-methods', label: 'Payment methods', icon: Wallet },
        ]
      : []),
    { to: '/settings/audit-log', label: 'Audit log', icon: History },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="More" subtitle={`${profile?.full_name} · ${t(isOwner ? 'Owner' : 'Staff')}`} />
      <ul className="card divide-y divide-slate-100 overflow-hidden">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
              <i.icon className="size-5 text-navy-700" />
              <span className="flex-1 font-medium">{t(i.label)}</span>
              <ChevronRight className="size-4 text-slate-300 rtl:rotate-180" />
            </Link>
          </li>
        ))}
      </ul>
      <button onClick={() => void signOut()} className="card flex w-full items-center gap-3 px-4 py-3.5 text-red-600 hover:bg-red-50">
        <LogOut className="size-5" />
        <span className="font-medium">{t('Sign out')}</span>
      </button>
    </div>
  );
}
