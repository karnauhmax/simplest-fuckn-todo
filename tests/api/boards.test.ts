import { afterAll, beforeAll, expect, test } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import type { BoardDoc } from '../../api/_lib/db.js';
import { callHandler } from '../helpers/callHandler.js';

let mongo: MongoMemoryServer;
let client: MongoClient;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  client = await new MongoClient(mongo.getUri()).connect();
});

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

test('GET /api/boards returns id+name summaries without lists or cards', async () => {
  const doc: BoardDoc = {
    _id: 'board-1',
    name: 'Personal',
    lists: [{ id: 'list-1', name: 'TODAY', cards: [{ id: 'card-1', title: 'ship it' }] }],
  };
  await client.db('todo').collection<BoardDoc>('boards').insertOne(doc);

  const handler = (await import('../../api/boards/index.js')).default;
  const { status, body } = await callHandler(handler, { method: 'GET' });

  expect(status).toBe(200);
  expect(body).toEqual([{ id: 'board-1', name: 'Personal' }]);
  expect(JSON.stringify(body)).not.toContain('lists');
  expect(JSON.stringify(body)).not.toContain('cards');
});
