const Fastify = require('fastify');
const { ensureStateDir, getStateDir } = require('./lib/store.cjs');

async function main() {
  const allowInit = process.env.NR_ALLOW_INIT_DIR === 'true';
  const port = Number(process.env.PORT || 5000);
  const host = process.env.HOST || '0.0.0.0';

  const fastify = Fastify({
    logger: true
  });

  let stateDir;
  try {
    stateDir = await ensureStateDir({ allowInit });
    fastify.log.info({ stateDir, allowInit }, 'state directory ready');
  } catch (err) {
    fastify.log.fatal({ err }, 'Failed to initialise state directory');
    process.exit(1);
  }

  fastify.addHook('onReady', async () => {
    fastify.log.info({ stateDir }, 'service ready');
  });

  fastify.get('/healthz', async () => ({ ok: true }));
  fastify.register(require('./routes/status.cjs'));

  try {
    await fastify.listen({ port, host });
    fastify.log.info({ port, host }, 'nr-pilot listening');
  } catch (err) {
    fastify.log.fatal({ err }, 'Failed to start service');
    process.exit(1);
  }
}

try {
  getStateDir();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

main();
