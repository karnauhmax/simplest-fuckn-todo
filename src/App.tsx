import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Board, BoardSummary } from '../shared/types.js';
import {
  UnauthorizedError,
  clearSecret,
  createBoard,
  deleteBoard,
  fetchBoard,
  fetchBoards,
  loadActiveBoardId,
  loadSecret,
  rememberActiveBoardId,
} from './api/client.js';
import { createWriteQueue } from './api/writeQueue.js';
import { boardReducer, type BoardAction } from './state/boardReducer.js';
import { UnlockScreen } from './components/UnlockScreen.js';
import { BoardSwitcher } from './components/BoardSwitcher.js';
import { BoardView } from './components/BoardView.js';

export function App() {
  const [unlocked, setUnlocked] = useState(() => loadSecret() !== null);
  const [summaries, setSummaries] = useState<BoardSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveBoardId());
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mirrors `board` so a burst of commits within one tick each build on the
  // previous snapshot rather than on the last rendered one.
  const boardRef = useRef<Board | null>(null);
  const onWriteError = useRef<(error: Error, snapshot: Board) => void>(() => {});
  const queue = useMemo(
    () => createWriteQueue({ onError: (error, snapshot) => onWriteError.current(error, snapshot) }),
    [],
  );

  const showBoard = useCallback((next: Board | null) => {
    boardRef.current = next;
    setBoard(next);
  }, []);

  const lock = useCallback(() => {
    clearSecret();
    setSummaries([]);
    setActiveId(null);
    showBoard(null);
    setUnlocked(false);
  }, [showBoard]);

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
    onWriteError.current = (err, snapshot) => {
      if (err instanceof UnauthorizedError) {
        lock();
        return;
      }
      setError(`Could not save: ${err.message}`);
      if (boardRef.current?.id !== snapshot.id) return;
      // Deliberately not routed through `guard`: a successful refetch must not
      // clear the message telling the user their edit was rolled back.
      fetchBoard(snapshot.id)
        .then((fresh) => {
          if (boardRef.current?.id === fresh.id) showBoard(fresh);
        })
        .catch((refetchError: Error) => {
          if (refetchError instanceof UnauthorizedError) lock();
        });
    };
  });

  // Left in place when the app locks or the board is deleted: a stale id is
  // harmless (membership is checked on load) and surviving a lock means an
  // unlock returns you to the board you were on.
  useEffect(() => {
    if (activeId) rememberActiveBoardId(activeId);
  }, [activeId]);

  useEffect(() => {
    if (!unlocked) return;
    void guard(async () => {
      const list = await reloadSummaries();
      setActiveId((current) =>
        current && list.some((b) => b.id === current) ? current : (list[0]?.id ?? null),
      );
    });
  }, [unlocked, guard, reloadSummaries]);

  useEffect(() => {
    if (!unlocked || !activeId) {
      showBoard(null);
      return;
    }
    let stale = false;
    void guard(async () => {
      const loaded = await fetchBoard(activeId);
      if (!stale) showBoard(loaded);
    });
    return () => {
      stale = true;
    };
  }, [unlocked, activeId, guard, showBoard]);

  if (!unlocked) return <UnlockScreen onUnlocked={() => setUnlocked(true)} />;

  function commit(action: BoardAction) {
    const previous = boardRef.current;
    const next = boardReducer(previous, action);
    if (!next || next === previous) return;
    showBoard(next);
    queue.save(next);
  }

  const create = (name: string) =>
    guard(async () => {
      const created = await createBoard(name);
      await reloadSummaries();
      setActiveId(created.id);
    });

  const rename = (name: string) => {
    const id = boardRef.current?.id;
    if (!id) return;
    commit({ type: 'rename-board', name });
    setSummaries((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

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
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        {board ? (
          <BoardView
            key={board.id}
            board={board}
            onAddList={(name) => commit({ type: 'add-list', listId: crypto.randomUUID(), name })}
            onRenameList={(listId, name) => commit({ type: 'rename-list', listId, name })}
            onDeleteList={(listId) => commit({ type: 'delete-list', listId })}
            onAddCard={(listId, title) =>
              commit({ type: 'add-card', listId, cardId: crypto.randomUUID(), title })
            }
            onEditCard={(listId, cardId, title) =>
              commit({ type: 'edit-card', listId, cardId, title })
            }
            onDeleteCard={(listId, cardId) => commit({ type: 'delete-card', listId, cardId })}
            onMoveCard={(move) => commit({ type: 'move-card', ...move })}
            onMoveList={(listId, toIndex) => commit({ type: 'move-list', listId, toIndex })}
          />
        ) : (
          summaries.length === 0 && (
            <p className="board__empty">No boards yet. Create one to get started.</p>
          )
        )}
      </main>
    </>
  );
}
