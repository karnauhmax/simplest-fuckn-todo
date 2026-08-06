import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import type { Board } from '../../shared/types.js';
import type { BoardDoc } from '../../api/_lib/db.js';
import { callHandler } from '../helpers/callHandler.js';

let mongo: MongoMemoryServer;
let client: MongoClient;

const SECRET = 'correct-horse-battery-staple';
const auth = { authorization: `Bearer ${SECRET}` };

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.APP_SECRET = SECRET;
  client = await new MongoClient(mongo.getUri()).connect();
});

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

function collection() {
  return client.db('todo').collection<BoardDoc>('boards');
}

beforeEach(async () => {
  await collection().deleteMany({});
});

async function callCollection(options: Parameters<typeof callHandler>[1]) {
  const handler = (await import('../../api/boards/index.js')).default;
  return callHandler(handler, { ...options, headers: { ...auth, ...options.headers } });
}

async function callItem(id: string, options: Parameters<typeof callHandler>[1]) {
  const handler = (await import('../../api/boards/[id].js')).default;
  return callHandler(handler, {
    ...options,
    query: { id, ...options.query },
    headers: { ...auth, ...options.headers },
  });
}

const populated: BoardDoc = {
  _id: 'board-1',
  name: 'Personal',
  lists: [{ id: 'list-1', name: 'TODAY', cards: [{ id: 'card-1', title: 'ship it' }] }],
};

test('GET /api/boards returns id+name summaries without lists or cards', async () => {
  await collection().insertOne(populated);

  const { status, body } = await callCollection({ method: 'GET' });

  expect(status).toBe(200);
  expect(body).toEqual([{ id: 'board-1', name: 'Personal' }]);
  expect(JSON.stringify(body)).not.toContain('lists');
  expect(JSON.stringify(body)).not.toContain('cards');
});

test('POST /api/boards creates an empty board and returns it', async () => {
  const { status, body } = await callCollection({ method: 'POST', body: { name: '  Work  ' } });

  expect(status).toBe(201);
  const created = body as Board;
  expect(created.name).toBe('Work');
  expect(created.lists).toEqual([]);
  expect(created.id).toMatch(/^[0-9a-f-]{36}$/);

  const stored = await collection().findOne({ _id: created.id });
  expect(stored).toMatchObject({ _id: created.id, name: 'Work', lists: [] });
});

test.each([
  ['missing name', {}],
  ['empty name', { name: '   ' }],
  ['non-string name', { name: 42 }],
  ['no body at all', undefined],
])('POST /api/boards rejects %s with 400', async (_label, body) => {
  const { status } = await callCollection({ method: 'POST', body });
  expect(status).toBe(400);
  expect(await collection().countDocuments()).toBe(0);
});

test('POST /api/boards rejects an over-long name with 400', async () => {
  const { status } = await callCollection({ method: 'POST', body: { name: 'x'.repeat(201) } });
  expect(status).toBe(400);
});

test('unsupported methods on the collection are 405', async () => {
  const { status, headers } = await callCollection({ method: 'PATCH' });
  expect(status).toBe(405);
  expect(headers.Allow).toBe('GET, POST');
});

test('GET /api/boards/[id] returns the full board with lists and cards', async () => {
  await collection().insertOne(populated);

  const { status, body } = await callItem('board-1', { method: 'GET' });

  expect(status).toBe(200);
  expect(body).toEqual({ id: 'board-1', name: 'Personal', lists: populated.lists });
});

test('GET /api/boards/[id] on an unknown id is 404', async () => {
  const { status, body } = await callItem('nope', { method: 'GET' });
  expect(status).toBe(404);
  expect(body).toEqual({ error: 'Board not found' });
});

test('PUT /api/boards/[id] round-trips nested lists and cards intact', async () => {
  await collection().insertOne(populated);
  const next: Omit<Board, 'id'> = {
    name: 'Personal renamed',
    lists: [
      { id: 'list-1', name: 'DOING', cards: [{ id: 'card-1', title: 'ship it' }] },
      {
        id: 'list-2',
        name: 'DONE',
        cards: [
          { id: 'card-2', title: 'first' },
          { id: 'card-3', title: 'second' },
        ],
      },
    ],
  };

  const { status, body } = await callItem('board-1', { method: 'PUT', body: next });

  expect(status).toBe(200);
  expect(body).toEqual({ id: 'board-1', ...next });

  const read = await callItem('board-1', { method: 'GET' });
  expect(read.body).toEqual({ id: 'board-1', ...next });
});

test('PUT /api/boards/[id] on an unknown id is 404', async () => {
  const { status } = await callItem('nope', { method: 'PUT', body: { name: 'x', lists: [] } });
  expect(status).toBe(404);
});

test.each([
  ['lists missing', { name: 'ok' }],
  ['lists not an array', { name: 'ok', lists: {} }],
  ['list without cards', { name: 'ok', lists: [{ id: 'l', name: 'n' }] }],
  ['card without a title', { name: 'ok', lists: [{ id: 'l', name: 'n', cards: [{ id: 'c' }] }] }],
  ['name missing', { lists: [] }],
])('PUT /api/boards/[id] rejects %s with 400 and leaves the board untouched', async (_l, body) => {
  await collection().insertOne(populated);

  const { status } = await callItem('board-1', { method: 'PUT', body });

  expect(status).toBe(400);
  expect(await collection().findOne({ _id: 'board-1' })).toEqual(populated);
});

test('DELETE /api/boards/[id] removes the board', async () => {
  await collection().insertOne(populated);

  const { status, body } = await callItem('board-1', { method: 'DELETE' });

  expect(status).toBe(200);
  expect(body).toEqual({ id: 'board-1' });
  expect(await collection().countDocuments()).toBe(0);
});

test('DELETE /api/boards/[id] on an unknown id is 404', async () => {
  const { status } = await callItem('nope', { method: 'DELETE' });
  expect(status).toBe(404);
});

test('a request without a board id is 400', async () => {
  const handler = (await import('../../api/boards/[id].js')).default;
  const { status } = await callHandler(handler, { method: 'GET', headers: auth });
  expect(status).toBe(400);
});

test('unsupported methods on a board are 405', async () => {
  await collection().insertOne(populated);
  const { status, headers } = await callItem('board-1', { method: 'PATCH' });
  expect(status).toBe(405);
  expect(headers.Allow).toBe('GET, PUT, DELETE');
});
