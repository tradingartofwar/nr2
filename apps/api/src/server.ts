import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { createEnv } from './env.js';
import { createSupabaseClient } from './supabase.js';
import authPlugin from './plugins/supabase-auth.js';
import { registerHealthRoutes } from './routes/health.js';

export const buildServer = (): FastifyInstance => {
  const env = createEnv();
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info'
    }
  });

  fastify.decorate('config', env);
  fastify.decorate('supabase', createSupabaseClient(env));

  fastify.register(authPlugin);
  fastify.register(registerHealthRoutes);

  return fastify;
};
