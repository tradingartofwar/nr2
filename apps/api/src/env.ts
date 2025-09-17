import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url().describe('Base URL for the Supabase project'),
  SUPABASE_ANON_KEY: z.string().min(1).describe('Supabase anon/public API key'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .describe('Supabase service role key used for privileged operations'),
  DATABASE_URL: z.string().min(1).describe('Postgres connection string managed by Supabase'),
  REDIS_URL: z.string().min(1).describe('Upstash Redis URL for BullMQ jobs'),
  OPENAI_API_KEY: z.string().min(1).describe('API key used for synthesis and matching prompts')
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export const createEnv = (overrides: Record<string, string | undefined> = {}): EnvConfig => {
  loadEnv();

  const result = EnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    API_PORT: process.env.API_PORT,
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ...overrides
  });

  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(`Invalid environment configuration: ${JSON.stringify(formatted, null, 2)}`);
  }

  return result.data;
};
