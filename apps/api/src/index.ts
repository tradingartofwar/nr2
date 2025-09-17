import { buildServer } from './server.js';

const start = async (): Promise<void> => {
  const server = buildServer();
  const port = server.config.API_PORT;

  try {
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info({ port }, 'API server listening');
  } catch (error) {
    server.log.error(error, 'Failed to start API server');
    process.exit(1);
  }
};

void start();
