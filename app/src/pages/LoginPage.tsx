import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Logo } from '@/components/layout/Logo';

export default function LoginPage() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!loading && session) return <Navigate to={from} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await authService.signIn(email, password);
        navigate(from, { replace: true });
      } else {
        await authService.sendPasswordReset(email);
        setInfo('If this email has an account, a reset link has been sent.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-navy-950 bg-[radial-gradient(ellipse_at_top,_#1e3a66_0%,_#0a1628_60%)] p-5">
      <Logo className="mb-8 scale-125" />
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6 shadow-2xl">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t(mode === 'login' ? 'Sign in' : 'Reset password')}</h1>
          <p className="text-sm text-slate-500">{t('Dreamland Rental Management System')}</p>
        </div>
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode === 'login' && (
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{t(error)}</p>}
        {info && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{t(info)}</p>}
        <Button type="submit" block size="lg" loading={busy}>
          {t(mode === 'login' ? 'Sign in' : 'Send reset link')}
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'forgot' : 'login');
            setError('');
            setInfo('');
          }}
          className="w-full text-center text-sm font-medium text-navy-700 hover:underline"
        >
          {t(mode === 'login' ? 'Forgot password?' : 'Back to sign in')}
        </button>
      </form>
      <p className="mt-6 text-xs text-slate-500">Aari Syedan, Islamabad</p>
    </div>
  );
}
