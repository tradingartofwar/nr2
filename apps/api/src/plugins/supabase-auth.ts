// apps/api/src/plugins/supabase-auth.ts
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type PublicMatcher = string | RegExp | ((req: FastifyRequest) => boolean);
interface PluginOpts { publicRoutes?: PublicMatcher[]; }

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`[supabase-auth] Missing required env ${name}. Check apps/api/.env`);
  return v.trim();
}

function isPublic(req: FastifyRequest, allow: PublicMatcher[]): boolean {
  const routePath = req.routeOptions?.url ?? req.url;
  for (const matcher of allow) {
    if (typeof matcher === "string") {
      if (matcher === routePath) return true;
    } else if (matcher instanceof RegExp) {
      if (matcher.test(req.url)) return true;
    } else if (typeof matcher === "function") {
      try {
        if (matcher(req)) return true;
      } catch (_err) {
        /* ignore matcher errors */
      }
    }
  }

  const routeConfig = req.routeOptions?.config as { public?: boolean } | undefined;
  return routeConfig?.public === true;
}

declare module "fastify" {
  interface FastifyInstance { supabase: SupabaseClient; }
  interface FastifyRequest { user?: User; }
}

const supabaseAuth: FastifyPluginAsync<PluginOpts> = fp(
  async (fastify: FastifyInstance, opts: PluginOpts = {}) => {
    const SUPABASE_URL = envOrThrow("SUPABASE_URL");
    const SERVICE_KEY  = envOrThrow("SUPABASE_SERVICE_ROLE_KEY");

    // Safe decorate (idempotent across hot-reloads)
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const hasSupabaseDecorator = typeof fastify.hasDecorator === "function" && fastify.hasDecorator("supabase");
    if (hasSupabaseDecorator) {
      fastify.supabase = sb;
    } else {
      fastify.decorate("supabase", sb);
    }

    const allowlist: PublicMatcher[] = opts.publicRoutes ?? [];

    fastify.addHook("onRequest", async (req, reply) => {
      if (isPublic(req, allowlist)) return;

      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) return reply.code(401).send({ ok: false, error: { code: "UNAUTHORIZED", msg: "Missing bearer token" } });

      const { data, error } = await fastify.supabase.auth.getUser(token);
      if (error || !data?.user) {
        return reply.code(401).send({ ok: false, error: { code: "UNAUTHORIZED", msg: "Invalid token" } });
      }
      req.user = data.user;
    });
  },
  { name: "supabase-auth" }
);

export default supabaseAuth;
