import { supabase } from '@/lib/supabase';
import { AppError, errorMessage, unwrap } from '@/lib/errors';
import type { Profile } from '@/types/models';

export const authService = {
  async signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new AppError(errorMessage(error));
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  async sendPasswordReset(email: string) {
    unwrap(
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    );
  },
  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new AppError(errorMessage(error));
  },
  async getProfile(userId: string): Promise<Profile | null> {
    return unwrap(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()) as Profile | null;
  },
  async updateOwnProfile(userId: string, patch: Pick<Profile, 'full_name' | 'preferred_language'>) {
    unwrap(await supabase.from('profiles').update(patch).eq('id', userId));
  },
};
