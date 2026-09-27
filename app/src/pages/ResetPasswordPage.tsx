import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Logo } from '@/components/layout/Logo';

/** Target of the password-reset email link (AUTH-05) */
export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pw.length < 8) return setError('Password must be at least 8 characters');
    if (pw !== pw2) return setError('Passwords do not match');
    setBusy(true);
    try {
      await authService.updatePassword(pw);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-navy-950 p-5">
      <Logo className="mb-8 scale-125" />
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-bold">{t('Set a new password')}</h1>
        {!loading && !session ? (
          <p className="text-sm text-slate-600">{t('This link is invalid or has expired. Request a new one from the sign-in page.')}</p>
        ) : (
          <>
            <TextField label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <TextField label="Repeat password" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t(error)}</p>}
            <Button type="submit" block size="lg" loading={busy}>
              {t('Save password')}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
