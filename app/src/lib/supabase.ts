import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  .replace(/^['"]|['"]$/g, '')
  .replace(/\/+$/, '')
  .replace(/\/(rest|auth)\/v1$/, ''); // people often paste the "API URL" from the Data API page
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim().replace(/^['"]|['"]$/g, '');

/** Why the app cannot start, or null when the settings look right. Shown on screen instead of a blank page. */
function checkConfig(): string | null {
  if (!url) return 'VITE_SUPABASE_URL is not set.';
  if (url.startsWith('sb_') || url.startsWith('eyJ')) {
    return 'VITE_SUPABASE_URL contains an API key. It must be the Project URL, e.g. https://abcd1234.supabase.co';
  }
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
  } catch {
    return `VITE_SUPABASE_URL "${url}" is not a valid URL. It must look like https://abcd1234.supabase.co`;
  }
  if (!anonKey) return 'VITE_SUPABASE_ANON_KEY is not set.';
  if (/^https?:\/\//.test(anonKey)) return 'VITE_SUPABASE_ANON_KEY contains a URL. It must be the anon / publishable key.';
  return null;
}

export const configError = checkConfig();
export const isSupabaseConfigured = configError === null;

/**
 * Single Supabase client for the whole app. Only files in src/services
 * (and the auth context) may import it — see documentation/02 §2.3.
 */
export const supabase = createClient(isSupabaseConfigured ? url! : 'http://localhost:54321', isSupabaseConfigured ? anonKey! : 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
