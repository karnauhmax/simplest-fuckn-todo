import { useCallback, useEffect, useState } from 'react';
import type { Board, BoardSummary } from '../shared/types.js';
import {
  UnauthorizedError,
  clearSecret,
  createBoard,
  deleteBoard,
  fetchBoard,
  fetchBoards,
  loadSecret,
  saveBoard,
} from './api/client.js';
import { UnlockScreen } from './components/UnlockScreen.js';
import { BoardSwitcher } from './components/BoardSwitcher.js';

export function App() {
  const [unlocked, setUnlocked] = useState(() => loadSecret() !== null);
  const [summaries, setSummaries] = useState<BoardSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lock = useCallback(() => {
    clearSecret();
    setSummaries([]);
    setActiveId(null);
    setBoard(null);
    setUnlocked(false);
  }, []);

  const guard = useCallback(
    async (work: () => Promise<void>) => {
      try {
        await work();
        setError(null);
      } catch (err) {
        if (err instanceof UnauthorizedError) lock();
        else setError((err as Error).message);
      }
    },
    [lock],
  );

  const reloadSummaries = useCallback(async (): Promise<BoardSummary[]> => {
    const list = await fetchBoards();
    setSummaries(list);
    return list;
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    void guard(async () => {
      const list = await reloadSummaries();
      setActiveId((current) => (current && list.some((b) => b.id === current) ? current : (list[0]?.id ?? null)));
    });
  }, [unlocked, guard, reloadSummaries]);

  useEffect(() => {
    if (!unlocked || !activeId) {
      setBoard(null);
      return;
    }
    let stale = false;
    void guard(async () => {
      const loaded = await fetchBoard(activeId);
      if (!stale) setBoard(loaded);
    });
    return () => {
      stale = true;
    };
  }, [unlocked, activeId, guard]);

  if (!unlocked) return <UnlockScreen onUnlocked={() => setUnlocked(true)} />;

  const create = (name: string) =>
    guard(async () => {
      const created = await createBoard(name);
      await reloadSummaries();
      setActiveId(created.id);
    });

  const rename = (name: string) =>
    guard(async () => {
      if (!board) return;
      const renamed = await saveBoard({ ...board, name });
      setBoard(renamed);
      await reloadSummaries();
    });

  const remove = () =>
    guard(async () => {
      if (!activeId) return;
      await deleteBoard(activeId);
      const list = await reloadSummaries();
      setActiveId(list[0]?.id ?? null);
    });

  return (
    <>
      <BoardSwitcher
        boards={summaries}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={create}
        onRename={rename}
        onDelete={remove}
      />
      <main>
        {error && <p role="alert">{error}</p>}
        {board ? (
          <section aria-label={board.name}>
            <h2>{board.name}</h2>
            {board.lists.length === 0 && <p>No lists yet.</p>}
          </section>
        ) : (
          summaries.length === 0 && <p>No boards yet. Create one to get started.</p>
        )}
      </main>
    </>
  );
}
