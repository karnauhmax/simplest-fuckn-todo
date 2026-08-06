import type { Board } from '../../shared/types.js';
import { saveBoard } from './client.js';

export interface WriteQueueOptions {
  put?: (board: Board) => Promise<unknown>;
  onError?: (error: Error, board: Board) => void;
}

export interface WriteQueue {
  save: (board: Board) => void;
  idle: () => Promise<void>;
}

// One PUT in flight per board. A save arriving mid-flight replaces whatever is
// queued, so a burst collapses to its final snapshot and intermediates never
// reach the network. A rejected PUT is reported and the loop continues.
export function createWriteQueue(options: WriteQueueOptions = {}): WriteQueue {
  const put = options.put ?? saveBoard;
  const onError = options.onError ?? (() => {});

  const pending = new Map<string, Board>();
  const running = new Map<string, Promise<void>>();

  async function drain(id: string): Promise<void> {
    try {
      while (pending.has(id)) {
        const snapshot = pending.get(id)!;
        pending.delete(id);
        try {
          await put(snapshot);
        } catch (error) {
          onError(error as Error, snapshot);
        }
      }
    } finally {
      running.delete(id);
    }
  }

  function save(board: Board): void {
    pending.set(board.id, board);
    if (running.has(board.id)) return;
    running.set(board.id, drain(board.id));
  }

  async function idle(): Promise<void> {
    while (running.size > 0) await Promise.all([...running.values()]);
  }

  return { save, idle };
}
