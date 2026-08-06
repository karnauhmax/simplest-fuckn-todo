import type { Board, BoardSummary } from '../../shared/types.js';

const SECRET_KEY = 'simplest-fuckn-todo:secret';
const ACTIVE_BOARD_KEY = 'simplest-fuckn-todo:active-board';

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

export function loadActiveBoardId(): string | null {
  return localStorage.getItem(ACTIVE_BOARD_KEY);
}

export function rememberActiveBoardId(id: string): void {
  localStorage.setItem(ACTIVE_BOARD_KEY, id);
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

function boardPath(id: string): string {
  return `/api/boards/${encodeURIComponent(id)}`;
}

export function createBoard(name: string): Promise<Board> {
  return apiFetch<Board>('/api/boards', { method: 'POST', body: { name } });
}

export function fetchBoard(id: string): Promise<Board> {
  return apiFetch<Board>(boardPath(id));
}

export function saveBoard(board: Board): Promise<Board> {
  return apiFetch<Board>(boardPath(board.id), {
    method: 'PUT',
    body: { name: board.name, lists: board.lists },
  });
}

export function deleteBoard(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(boardPath(id), { method: 'DELETE' });
}
