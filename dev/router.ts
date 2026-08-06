import type { IncomingMessage, ServerResponse } from 'node:http';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function vercelResponse(res: ServerResponse): VercelResponse {
  const wrapped = res as unknown as VercelResponse;
  wrapped.status = (code: number) => {
    res.statusCode = code;
    return wrapped;
  };
  wrapped.json = (body: unknown) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
    return wrapped;
  };
  wrapped.send = (body: unknown) => {
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
    return wrapped;
  };
  return wrapped;
}

export async function createHandlerRouter() {
  const collection: Handler = (await import('../api/boards/index.js')).default;
  const itemModulePath = '../api/boards/[id].js';
  const item: Handler | undefined = await import(/* @vite-ignore */ itemModulePath)
    .then((mod) => mod.default as Handler)
    .catch(() => undefined);

  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    const query: Record<string, string> = Object.fromEntries(url.searchParams);

    let handler: Handler | undefined;
    if (segments[0] === 'api' && segments[1] === 'boards') {
      if (segments.length === 2) handler = collection;
      else if (segments.length === 3) {
        handler = item;
        query.id = decodeURIComponent(segments[2]!);
      }
    }

    if (!handler) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not Found' }));
      return;
    }

    const vercelReq = Object.assign(req, { query, cookies: {}, body: await readBody(req) }) as VercelRequest;
    try {
      await handler(vercelReq, vercelResponse(res));
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  };
}
