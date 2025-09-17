import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { EnvConfig } from './env.js';

type Database = unknown;

export const createSupabaseClient = (env: EnvConfig): SupabaseClient<Database> =>
  createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
