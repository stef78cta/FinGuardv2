/**
 * Supabase client configuration.
 * Uses hardcoded values as per Lovable guidelines.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/** Supabase project URL */
const SUPABASE_URL = "https://gqxopxbzslwrjgukqbha.supabase.co";

/** Supabase anonymous/publishable key */
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeG9weGJ6c2x3cmpndWtxYmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTczOTUsImV4cCI6MjA4NDMzMzM5NX0.WBnygrdIbFpz7wi68TKrWjc7ELC8rTfR0iXYTWtRO1Q";

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