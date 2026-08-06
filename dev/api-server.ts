import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHandlerRouter } from './router.js';

const PORT = Number(process.env.API_PORT ?? 3001);
const DB_PATH = '.dev-mongo';

async function main() {
  process.env.APP_SECRET ??= 'dev-secret';
  console.log(`APP_SECRET: ${process.env.APP_SECRET}`);

  if (!process.env.MONGODB_URI) {
    // Persisted to disk so a restart does not wipe the board you are testing
    // with. `DEV_MONGO_EPHEMERAL=1` restores throwaway storage, which is what
    // the E2E suite wants.
    const ephemeral = process.env.DEV_MONGO_EPHEMERAL === '1';
    if (!ephemeral) mkdirSync(DB_PATH, { recursive: true });

    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongo = await MongoMemoryServer.create(
      ephemeral ? undefined : { instance: { dbPath: DB_PATH, storageEngine: 'wiredTiger' } },
    );

    process.env.MONGODB_URI = mongo.getUri();
    writeFileSync('.dev-mongo-uri', process.env.MONGODB_URI);
    console.log(`${ephemeral ? 'ephemeral' : `mongo in ${DB_PATH}`}: ${process.env.MONGODB_URI}`);
  }

  const router = await createHandlerRouter();
  createServer(router).listen(PORT, () => console.log(`api adapter on http://localhost:${PORT}`));
}

void main();
