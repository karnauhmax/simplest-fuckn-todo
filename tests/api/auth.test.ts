import { afterAll, beforeAll, expect, test } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { callHandler } from '../helpers/callHandler.js';

const SECRET = 'correct-horse-battery-staple';
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.APP_SECRET = SECRET;
});

afterAll(async () => {
  await mongo.stop();
});

async function get(headers: Record<string, string> = {}) {
  const handler = (await import('../../api/boards/index.js')).default;
  return callHandler(handler, { method: 'GET', headers });
}

test('missing Authorization header is 401', async () => {
  const { status, body } = await get();
  expect(status).toBe(401);
  expect(body).toEqual({ error: 'Unauthorized' });
});

test('non-bearer Authorization header is 401', async () => {
  const { status } = await get({ authorization: `Basic ${SECRET}` });
  expect(status).toBe(401);
});

test('wrong secret of the same length is 401', async () => {
  const wrong = 'x'.repeat(SECRET.length);
  const { status } = await get({ authorization: `Bearer ${wrong}` });
  expect(status).toBe(401);
});

test('wrong secret of a different length is 401, not 500', async () => {
  const { status, body } = await get({ authorization: 'Bearer short' });
  expect(status).toBe(401);
  expect(body).toEqual({ error: 'Unauthorized' });
});

test('correct secret is 200', async () => {
  const { status, body } = await get({ authorization: `Bearer ${SECRET}` });
  expect(status).toBe(200);
  expect(body).toEqual([]);
});
