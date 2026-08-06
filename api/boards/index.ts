import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { BoardSummary } from '../../shared/types.js';
import { boards } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const docs = await (await boards())
    .find({}, { projection: { name: 1 } })
    .sort({ name: 1 })
    .toArray();

  const summaries: BoardSummary[] = docs.map((doc) => ({ id: doc._id, name: doc.name }));
  return res.status(200).json(summaries);
}
