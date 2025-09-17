import fp from 'fastify-plugin';
import type { FastifyPluginCallback } from 'fastify';
import type { AuthUser } from '@supabase/supabase-js';

export interface SupabaseAuthPluginOptions {
  publicRoutes?: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    supabaseToken?: string;
    supabaseUser: AuthUser | null;
  }
}

const supabaseAuthPlugin: FastifyPluginCallback<SupabaseAuthPluginOptions> = (fastify, opts, done) => {
  const publicRoutes = opts.publicRoutes ?? ['/healthz'];

  fastify.addHook('onRequest', async (request, reply) => {
    request.supabaseUser = null;

    const routeConfig = request.routeOptions.config as { public?: boolean } | undefined;
    const isRoutePublic = Boolean(routeConfig?.public);
    const matchesPublicPattern = publicRoutes.some((route) =>
      route.endsWith('*') ? request.url.startsWith(route.slice(0, -1)) : route === request.url
    );

    if (isRoutePublic || matchesPublicPattern) {
      return;
    }

    const header = request.headers.authorization;
    if (!header) {
      reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', msg: 'Missing bearer token' } });
      return reply;
    }

    const token = header.replace('Bearer ', '').trim();
    if (!token) {
      reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', msg: 'Malformed bearer token' } });
      return reply;
    }

    const { data, error } = await fastify.supabase.auth.getUser(token);

    if (error || !data?.user) {
      fastify.log.warn({ err: error, tokenPreview: `${token.slice(0, 6)}…` }, 'Invalid Supabase session token');
      reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', msg: 'Invalid token' } });
      return reply;
    }

    request.supabaseToken = token;
    request.supabaseUser = data.user;
  });

  done();
};

export default fp(supabaseAuthPlugin, {
  name: 'supabase-auth'
});
