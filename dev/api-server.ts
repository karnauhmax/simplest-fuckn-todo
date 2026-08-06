import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { createHandlerRouter } from './router.js';

const PORT = Number(process.env.API_PORT ?? 3001);

async function main() {
  process.env.APP_SECRET ??= 'dev-secret';
  console.log(`APP_SECRET: ${process.env.APP_SECRET}`);

  if (!process.env.MONGODB_URI) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    writeFileSync('.dev-mongo-uri', process.env.MONGODB_URI);
    console.log(`ephemeral mongo: ${process.env.MONGODB_URI}`);
  }

  const router = await createHandlerRouter();
  createServer(router).listen(PORT, () => console.log(`api adapter on http://localhost:${PORT}`));
}

void main();
