import type { VercelRequest, VercelResponse } from '@vercel/node';
import { boards, toBoard } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { parseBoardInput } from '../_lib/validate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id) return res.status(400).json({ error: 'Missing board id' });

  const collection = await boards();

  if (req.method === 'GET') {
    const doc = await collection.findOne({ _id: id });
    if (!doc) return res.status(404).json({ error: 'Board not found' });
    return res.status(200).json(toBoard(doc));
  }

  if (req.method === 'PUT') {
    const input = parseBoardInput(req.body);
    if (input === null) return res.status(400).json({ error: 'Invalid board' });

    const result = await collection.updateOne(
      { _id: id },
      { $set: { name: input.name, lists: input.lists } },
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Board not found' });
    return res.status(200).json({ id, ...input });
  }

  if (req.method === 'DELETE') {
    const result = await collection.deleteOne({ _id: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Board not found' });
    return res.status(200).json({ id });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
