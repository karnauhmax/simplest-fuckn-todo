import { createHash, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Hashing both sides first makes the compared buffers equal-length, so a
// wrong-length secret is a 401 rather than a timingSafeEqual throw.
function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

function bearerToken(req: VercelRequest): string {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length).trim();
}

export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'APP_SECRET is not set' });
    return false;
  }

  const token = bearerToken(req);
  if (!token || !timingSafeEqual(digest(token), digest(secret))) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}
