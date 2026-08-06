import type { VercelRequest, VercelResponse } from '@vercel/node';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

interface CallOptions {
  method: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function callHandler(handler: Handler, options: CallOptions) {
  const req = {
    method: options.method,
    query: options.query ?? {},
    body: options.body,
    headers: options.headers ?? {},
    cookies: {},
  } as unknown as VercelRequest;

  let status = 200;
  let body: unknown;
  const headers: Record<string, string> = {};

  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
    send(payload: unknown) {
      body = payload;
      return res;
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
      return res;
    },
    end() {
      return res;
    },
  } as unknown as VercelResponse & { status: (c: number) => VercelResponse };

  await handler(req, res as VercelResponse);
  return { status, body, headers };
}
