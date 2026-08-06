// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnlockScreen } from '../../src/components/UnlockScreen.js';

const SECRET_KEY = 'simplest-fuckn-todo:secret';

function respond(status: number, body: unknown) {
  return vi.fn(
    async (_input: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }),
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('a correct secret is stored and unlocks the app', async () => {
  const fetchMock = respond(200, []);
  vi.stubGlobal('fetch', fetchMock);
  const onUnlocked = vi.fn();
  render(<UnlockScreen onUnlocked={onUnlocked} />);

  await userEvent.type(screen.getByLabelText('Secret'), 'open-sesame');
  await userEvent.click(screen.getByRole('button', { name: 'Unlock' }));

  expect(onUnlocked).toHaveBeenCalledOnce();
  expect(localStorage.getItem(SECRET_KEY)).toBe('open-sesame');
  const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
  expect(headers.Authorization).toBe('Bearer open-sesame');
});

test('a wrong secret reports an error and stores nothing', async () => {
  vi.stubGlobal('fetch', respond(401, { error: 'Unauthorized' }));
  const onUnlocked = vi.fn();
  render(<UnlockScreen onUnlocked={onUnlocked} />);

  await userEvent.type(screen.getByLabelText('Secret'), 'nope');
  await userEvent.click(screen.getByRole('button', { name: 'Unlock' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Wrong secret.');
  expect(onUnlocked).not.toHaveBeenCalled();
  expect(localStorage.getItem(SECRET_KEY)).toBeNull();
});

test('unlock is disabled until a secret is typed', async () => {
  vi.stubGlobal('fetch', respond(200, []));
  render(<UnlockScreen onUnlocked={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'Unlock' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Secret'), 'x');
  expect(screen.getByRole('button', { name: 'Unlock' })).toBeEnabled();
});
