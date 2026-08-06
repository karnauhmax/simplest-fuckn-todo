// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../../src/App.js';

const SECRET_KEY = 'simplest-fuckn-todo:secret';

function respond(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
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
  vi.stubGlobal('fetch', respond(200, [{ id: 'b1', name: 'Personal' }]));
  render(<App />);

  expect(await screen.findByText('Personal')).toBeInTheDocument();
  expect(screen.queryByLabelText('Secret')).not.toBeInTheDocument();
});

test('a 401 flips the app back to locked and discards the stored secret', async () => {
  localStorage.setItem(SECRET_KEY, 'stale-secret');
  vi.stubGlobal('fetch', respond(401, { error: 'Unauthorized' }));
  render(<App />);

  expect(await screen.findByLabelText('Secret')).toBeInTheDocument();
  expect(localStorage.getItem(SECRET_KEY)).toBeNull();
});
