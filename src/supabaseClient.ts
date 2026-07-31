import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

const missing = [rawUrl ? '' : 'VITE_SUPABASE_URL', rawKey ? '' : 'VITE_SUPABASE_ANON_KEY'].filter(Boolean);
if (missing.length > 0) {
  console.warn(`[Supabase] Missing env: ${missing.join(', ')}. App will run in offline mode.`);
}

export const supabase = createClient(rawUrl || 'https://placeholder.supabase.co', rawKey || 'placeholder-key');
