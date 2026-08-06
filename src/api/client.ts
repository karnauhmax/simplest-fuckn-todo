import type { BoardSummary } from '../../shared/types.js';

const SECRET_KEY = 'simplest-fuckn-todo:secret';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export function loadSecret(): string | null {
  return localStorage.getItem(SECRET_KEY);
}

export function saveSecret(secret: string): void {
  localStorage.setItem(SECRET_KEY, secret);
}

export function clearSecret(): void {
  localStorage.removeItem(SECRET_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  secret?: string;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const secret = options.secret ?? loadSecret() ?? '';
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  if (response.status === 401) throw new UnauthorizedError();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

export function fetchBoards(options: RequestOptions = {}): Promise<BoardSummary[]> {
  return apiFetch<BoardSummary[]>('/api/boards', options);
}
