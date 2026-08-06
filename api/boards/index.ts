import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { BoardSummary } from '../../shared/types.js';
import { boards, toBoard, type BoardDoc } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { parseName } from '../_lib/validate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;

  const collection = await boards();

  if (req.method === 'GET') {
    const docs = await collection
      .find({}, { projection: { name: 1 } })
      .sort({ name: 1 })
      .toArray();

    const summaries: BoardSummary[] = docs.map((doc) => ({ id: doc._id, name: doc.name }));
    return res.status(200).json(summaries);
  }

  if (req.method === 'POST') {
    const name = parseName(req.body);
    if (name === null) return res.status(400).json({ error: 'Invalid board name' });

    const doc: BoardDoc = { _id: randomUUID(), name, lists: [] };
    await collection.insertOne(doc);
    return res.status(201).json(toBoard(doc));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
