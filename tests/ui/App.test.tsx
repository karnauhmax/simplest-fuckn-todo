// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../../src/App.js';

const SECRET_KEY = 'simplest-fuckn-todo:secret';
const ACTIVE_BOARD_KEY = 'simplest-fuckn-todo:active-board';

function respond(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

function stubRoutes(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: string) => {
    const body = routes[input];
    if (body === undefined) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('without a stored secret the app is locked', () => {
  vi.stubGlobal('fetch', respond(200, []));
  render(<App />);

  expect(screen.getByLabelText('Secret')).toBeInTheDocument();
});

test('a stored secret unlocks the app and its boards load', async () => {
  localStorage.setItem(SECRET_KEY, 'open-sesame');
  stubRoutes({
    '/api/boards': [{ id: 'b1', name: 'Personal' }],
    '/api/boards/b1': { id: 'b1', name: 'Personal', lists: [] },
  });
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Personal', level: 2 })).toBeInTheDocument();
  expect(screen.queryByLabelText('Secret')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Board')).toHaveValue('b1');
});

test('a 401 flips the app back to locked and discards the stored secret', async () => {
  localStorage.setItem(SECRET_KEY, 'stale-secret');
  vi.stubGlobal('fetch', respond(401, { error: 'Unauthorized' }));
  render(<App />);

  expect(await screen.findByLabelText('Secret')).toBeInTheDocument();
  expect(localStorage.getItem(SECRET_KEY)).toBeNull();
});

test('the board you were last on is restored, not the first one', async () => {
  localStorage.setItem(SECRET_KEY, 'open-sesame');
  localStorage.setItem(ACTIVE_BOARD_KEY, 'b2');
  stubRoutes({
    '/api/boards': [
      { id: 'b1', name: 'Alpha' },
      { id: 'b2', name: 'Zeta' },
    ],
    '/api/boards/b2': { id: 'b2', name: 'Zeta', lists: [] },
  });
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Zeta', level: 2 })).toBeInTheDocument();
  expect(screen.getByLabelText('Board')).toHaveValue('b2');
});

test('a remembered board that no longer exists falls back to the first one', async () => {
  localStorage.setItem(SECRET_KEY, 'open-sesame');
  localStorage.setItem(ACTIVE_BOARD_KEY, 'deleted-board');
  stubRoutes({
    '/api/boards': [{ id: 'b1', name: 'Alpha' }],
    '/api/boards/b1': { id: 'b1', name: 'Alpha', lists: [] },
  });
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Alpha', level: 2 })).toBeInTheDocument();
  expect(localStorage.getItem(ACTIVE_BOARD_KEY)).toBe('b1');
});

test('with no boards at all the app invites creating one', async () => {
  localStorage.setItem(SECRET_KEY, 'open-sesame');
  stubRoutes({ '/api/boards': [] });
  render(<App />);

  expect(await screen.findByText('No boards yet. Create one to get started.')).toBeInTheDocument();
  expect(screen.getByLabelText('Board')).toBeDisabled();
});
