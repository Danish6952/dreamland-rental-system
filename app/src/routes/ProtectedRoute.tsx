import { Navigate, Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy-950">
      <div className="animate-pulse">
        <Logo />
      </div>
    </div>
  );
}

/** Requires a session AND an active profile (AUTH-04) */
export function ProtectedRoute() {
  const { t } = useTranslation();
  const { session, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (!profile) return <FullScreenLoader />;
  if (!profile.is_active) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-navy-950 p-6">
        <div className="card max-w-sm p-6 text-center">
          <ShieldOff className="mx-auto mb-3 size-8 text-red-500" />
          <h1 className="text-lg font-semibold">{t('Account disabled')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('Your account has been disabled. Please contact the owner.')}</p>
          <Button className="mt-5" block variant="navy" onClick={() => void signOut()}>
            {t('Sign out')}
          </Button>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
