import type { SupabaseClient } from '@supabase/supabase-js';
import type { EnvConfig } from '../env';

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
    supabase: SupabaseClient;
  }
}
