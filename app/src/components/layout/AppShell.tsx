import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import clsx from 'clsx';
import { Bell, CarFront, LogOut, Plus, Undo2, Wallet, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAlertCount } from '@/hooks/useAlerts';
import { Logo } from './Logo';
import { bottomNav, sidebarNav } from './nav';

function AlertBell({ dark }: { dark?: boolean }) {
  const { t } = useTranslation();
  const count = useAlertCount();
  return (
    <Link
      to="/alerts"
      className={clsx('relative rounded-lg p-2', dark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')}
      aria-label={t('Alerts')}
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-navy-950">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

/** Mobile floating action button → Car Out / Payment / Return */
function QuickActions() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const actions = [
    { to: '/car-out', label: 'Car Out', icon: CarFront },
    { to: '/rentals?status=out&pick=return', label: 'Car Return', icon: Undo2 },
    { to: '/rentals?status=active&pick=payment', label: 'Record Payment', icon: Wallet },
  ];
  return (
    <div className="fixed end-4 z-40 lg:hidden" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}>
      {open && <div className="fixed inset-0 bg-navy-950/40" onClick={() => setOpen(false)} />}
      <div className="relative flex flex-col items-end gap-2">
        {open &&
          actions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-full bg-white py-2.5 pe-4 ps-3 text-sm font-semibold text-navy-900 shadow-lg ring-1 ring-slate-200"
            >
              <a.icon className="size-4 text-gold-600" />
              {t(a.label)}
            </Link>
          ))}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex size-14 items-center justify-center rounded-full bg-gold-500 text-navy-950 shadow-xl shadow-gold-600/30 ring-4 ring-white"
          aria-label={t(open ? 'Close' : 'Quick actions')}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Plus className="size-7" />}
        </button>
      </div>
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const { pathname } = useLocation();
  const hideFab = /^\/(car-out|rentals\/[^/]+\/(return|edit)|cars\/[^/]+\/sell)/.test(pathname);

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-navy-950 px-4 py-5 lg:flex">
        <Logo className="px-2" />
        <Link
          to="/car-out"
          className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold-500 font-semibold text-navy-950 hover:bg-gold-400"
        >
          <CarFront className="size-4" /> {t('Car Out')}
        </Link>
        <nav className="mt-6 flex-1 space-y-1">
          {sidebarNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-white/10 text-gold-400' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <item.icon className="size-[18px]" />
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{profile?.full_name}</div>
              <div className="text-xs capitalize text-slate-400">{t(profile?.role === 'owner' ? 'Owner' : 'Staff')}</div>
            </div>
            <div className="flex items-center">
              <AlertBell dark />
              <button onClick={() => void signOut()} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label={t('Sign out')}>
                <LogOut className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 bg-navy-950 safe-top lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link to="/">
              <Logo />
            </Link>
            <AlertBell dark />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {!hideFab && <QuickActions />}

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom lg:hidden">
        <div className="grid h-16 grid-cols-5">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 text-[11px] font-medium',
                  isActive ? 'text-navy-900' : 'text-slate-400',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={clsx('size-[22px]', isActive && 'text-gold-600')} strokeWidth={isActive ? 2.4 : 2} />
                  {t(item.label)}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
