import { useCallback, useEffect, useState } from 'react';
import type { BoardSummary } from '../shared/types.js';
import { UnauthorizedError, clearSecret, fetchBoards, loadSecret } from './api/client.js';
import { UnlockScreen } from './components/UnlockScreen.js';

export function App() {
  const [unlocked, setUnlocked] = useState(() => loadSecret() !== null);
  const [summaries, setSummaries] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lock = useCallback(() => {
    clearSecret();
    setSummaries(null);
    setUnlocked(false);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    let stale = false;
    fetchBoards()
      .then((boards) => {
        if (!stale) setSummaries(boards);
      })
      .catch((err: Error) => {
        if (stale) return;
        if (err instanceof UnauthorizedError) lock();
        else setError(err.message);
      });
    return () => {
      stale = true;
    };
  }, [unlocked, lock]);

  if (!unlocked) return <UnlockScreen onUnlocked={() => setUnlocked(true)} />;

  return (
    <main>
      <h1>Simplest Fuckn Todo</h1>
      {error && <p role="alert">Failed to load boards: {error}</p>}
      {summaries && (
        <ul>
          {summaries.map((board) => (
            <li key={board.id}>{board.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
