import { MongoClient, type Collection } from 'mongodb';
import type { Board } from '../../shared/types.js';

export type BoardDoc = Omit<Board, 'id'> & { _id: string };

export function toBoard(doc: BoardDoc): Board {
  return { id: doc._id, name: doc.name, lists: doc.lists };
}

let clientPromise: Promise<MongoClient> | undefined;
let cachedUri: string | undefined;

function connect(uri: string): Promise<MongoClient> {
  if (!clientPromise || cachedUri !== uri) {
    cachedUri = uri;
    clientPromise = new MongoClient(uri, { maxPoolSize: 5 }).connect();
  }
  return clientPromise;
}

export async function boards(): Promise<Collection<BoardDoc>> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  const client = await connect(uri);
  return client.db(process.env.MONGODB_DB ?? 'todo').collection<BoardDoc>('boards');
}
