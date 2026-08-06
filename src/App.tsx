import { useEffect, useState } from 'react';
import type { BoardSummary } from '../shared/types.js';

export function App() {
  const [summaries, setSummaries] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/boards')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<BoardSummary[]>;
      })
      .then(setSummaries)
      .catch((err: Error) => setError(err.message));
  }, []);

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
