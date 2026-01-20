/**
 * Supabase client configuration.
 * Credentials are loaded from environment variables for security.
 * 
 * @see https://vitejs.dev/guide/env-and-mode.html
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/** Supabase project URL from environment variables */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/** Supabase anonymous/publishable key from environment variables */
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables at runtime
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

/**
 * Supabase client instance for interacting with the database.
 * 
 * @example
 * import { supabase } from "@/integrations/supabase/client";
 * 
 * const { data, error } = await supabase.from('users').select('*');
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});