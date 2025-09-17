import type { FastifyInstance } from 'fastify';

export const registerHealthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/healthz', {
    config: { public: true }
  }, async () => ({ ok: true }));
};
