import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { queryClient } from '@/lib/queryClient';
import { setLanguage } from '@/lib/i18n';
import type { Profile } from '@/types/models';

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isOwner: boolean;
  passwordRecovery: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    try {
      const p = await authService.getProfile(s.user.id);
      setProfile(p);
      if (p?.preferred_language && p.preferred_language !== (localStorage.getItem('lang') ?? 'en')) {
        void setLanguage(p.preferred_language);
      }
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        setPasswordRecovery(false);
      }
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Defer: supabase-js recommends not awaiting other calls inside this callback
        setTimeout(() => void loadProfile(s), 0);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      isOwner: profile?.role === 'owner' && profile.is_active,
      passwordRecovery,
      refreshProfile: () => loadProfile(session),
      signOut: async () => {
        await authService.signOut();
        setProfile(null);
      },
    }),
    [session, profile, loading, passwordRecovery, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
