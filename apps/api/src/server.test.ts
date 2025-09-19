import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fastify from 'fastify';
import { buildServer } from './server.js';

let app: ReturnType<typeof fastify>;

beforeAll(async () => {
  app = buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('API basics', () => {
  it('returns ok on /healthz', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('rejects submissions without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/rooms/room-1/submissions',
      payload: { payload: { msg: 'test' } }
    });
    expect(res.statusCode).toBe(401);
  });
});
