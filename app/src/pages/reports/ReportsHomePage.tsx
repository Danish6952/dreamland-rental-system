import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BarChart3, CalendarDays, Car, ChevronRight, ClipboardList, History, TriangleAlert, Users, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

const reports = [
  { to: '/reports/income?mode=week', title: 'Weekly income', desc: 'Money received per week (Mon–Sun)', icon: CalendarDays },
  { to: '/reports/income?mode=month', title: 'Monthly income', desc: 'Money received per month', icon: BarChart3 },
  { to: '/reports/pending-by-customer', title: 'Pending by customer', desc: 'Who owes how much', icon: Users },
  { to: '/reports/outstanding', title: 'Outstanding balances', desc: 'Every rental with money or deposit open', icon: TriangleAlert },
  { to: '/payments', title: 'Payment history', desc: 'All payments with filters and CSV', icon: Wallet },
  { to: '/reports/car-earnings', title: 'Earnings per car', desc: 'Received per car for any period', icon: Car },
  { to: '/cars', title: 'Rental history per car', desc: 'Open a car → Rentals tab', icon: History },
  { to: '/reports/vehicle-status', title: 'Vehicle status', desc: 'Current status and unavailable cars', icon: ClipboardList },
];

export default function ReportsHomePage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle={t('Income is counted when money is received (deposits are not income until used).')} />
      <div className="grid gap-2 sm:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.title} to={r.to} className="card flex items-center gap-3 p-4 hover:ring-slate-300">
            <div className="rounded-xl bg-navy-950 p-2.5 text-gold-400">
              <r.icon className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{t(r.title)}</div>
              <div className="text-xs text-slate-500">{t(r.desc)}</div>
            </div>
            <ChevronRight className="size-4 text-slate-300 rtl:rotate-180" />
          </Link>
        ))}
      </div>
    </div>
  );
}
