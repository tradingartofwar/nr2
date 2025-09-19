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

  it('accepts submissions when authorized', async () => {
    const token = process.env.APN_TEST_JWT ?? process.env.API_TEST_JWT;
    if (!token) {
      // Skip when a real Supabase user token is not configured.
      expect(true).toBe(true);
      return;
    }

    const roomName = `vitest-room-${Date.now()}`;
    const createRes = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      payload: { name: roomName }
    });

    expect([200, 201]).toContain(createRes.statusCode);
    const createBody = createRes.json() as { ok: boolean; data: { id: string } };
    expect(createBody.ok).toBe(true);

    const submissionRes = await app.inject({
      method: 'POST',
      url: `/rooms/${roomName}/submissions`,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      payload: { payload: { msg: 'vitest', ts: new Date().toISOString() } }
    });

    expect(submissionRes.statusCode).toBe(201);
    const submissionBody = submissionRes.json() as { ok: boolean; data?: { roomId: string } };
    expect(submissionBody.ok).toBe(true);
    expect(submissionBody.data?.roomId).toBe(createBody.data.id);
  });
});
