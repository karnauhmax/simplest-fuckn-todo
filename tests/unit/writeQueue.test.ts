import { expect, test, vi } from 'vitest';
import type { Board } from '../../shared/types.js';
import { createWriteQueue, type WriteQueue } from '../../src/api/writeQueue.js';

function board(id: string, name: string): Board {
  return { id, name, lists: [] };
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.catch(() => {});
  return { promise, resolve, reject };
}

/** A put whose in-flight calls the test settles by hand. */
function controllablePut() {
  const gates: ReturnType<typeof deferred>[] = [];
  const seen: Board[] = [];

  const put = vi.fn(async (snapshot: Board) => {
    seen.push(snapshot);
    const gate = deferred();
    gates.push(gate);
    return gate.promise;
  });

  /** Resolve every write, including ones started while draining, until idle. */
  async function settle(queue: WriteQueue) {
    let done = false;
    const idle = queue.idle().then(() => {
      done = true;
    });
    while (!done) {
      gates.forEach((gate) => gate.resolve());
      await new Promise((resume) => setTimeout(resume, 0));
    }
    await idle;
  }

  return { put, gates, seen, settle };
}

const tick = () => Promise.resolve();

test('a burst mid-flight collapses to the latest snapshot', async () => {
  const { put, gates, seen, settle } = controllablePut();
  const queue = createWriteQueue({ put });

  queue.save(board('b1', 'one'));
  await tick();
  expect(seen.map((b) => b.name)).toEqual(['one']);

  queue.save(board('b1', 'two'));
  queue.save(board('b1', 'three'));
  queue.save(board('b1', 'four'));
  gates[0]!.resolve();
  await settle(queue);

  expect(seen.map((b) => b.name)).toEqual(['one', 'four']);
  expect(put).toHaveBeenCalledTimes(2);
});

test('writes for one board never overlap', async () => {
  const { seen, settle, put } = controllablePut();
  const queue = createWriteQueue({ put });

  queue.save(board('b1', 'one'));
  await tick();
  queue.save(board('b1', 'two'));
  await tick();

  expect(seen).toHaveLength(1);

  await settle(queue);
  expect(seen.map((b) => b.name)).toEqual(['one', 'two']);
});

test('different boards are written concurrently', async () => {
  const { put, seen, settle } = controllablePut();
  const queue = createWriteQueue({ put });

  queue.save(board('b1', 'one'));
  queue.save(board('b2', 'two'));
  await tick();

  expect(seen.map((b) => b.id)).toEqual(['b1', 'b2']);
  await settle(queue);
});

test('a failed write is reported and does not wedge the chain', async () => {
  const { put, gates, seen, settle } = controllablePut();
  const onError = vi.fn();
  const queue = createWriteQueue({ put, onError });

  queue.save(board('b1', 'one'));
  await tick();
  gates[0]!.reject(new Error('boom'));
  await settle(queue);

  expect(onError).toHaveBeenCalledOnce();
  expect(onError.mock.calls[0]![0]).toMatchObject({ message: 'boom' });
  expect(onError.mock.calls[0]![1]).toMatchObject({ name: 'one' });

  queue.save(board('b1', 'two'));
  await settle(queue);

  expect(seen.map((b) => b.name)).toEqual(['one', 'two']);
});

test('a write queued behind a failing one is still sent', async () => {
  const { put, gates, seen, settle } = controllablePut();
  const onError = vi.fn();
  const queue = createWriteQueue({ put, onError });

  queue.save(board('b1', 'one'));
  await tick();
  queue.save(board('b1', 'two'));
  gates[0]!.reject(new Error('boom'));
  await settle(queue);

  expect(seen.map((b) => b.name)).toEqual(['one', 'two']);
  expect(onError).toHaveBeenCalledOnce();
});

test('idle resolves when nothing is queued', async () => {
  const queue = createWriteQueue({ put: vi.fn(async () => {}) });
  await expect(queue.idle()).resolves.toBeUndefined();
});
