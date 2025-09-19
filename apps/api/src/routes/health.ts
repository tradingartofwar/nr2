import type { FastifyInstance } from 'fastify';

export const registerHealthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', {
    config: { public: true }
  }, async () => ({ ok: true, service: 'apn-api' }));

  fastify.get('/healthz', {
    config: { public: true }
  }, async () => ({ ok: true }));

  fastify.get('/favicon.ico', {
    config: { public: true }
  }, async (_, reply) => reply.code(204).send());
};
