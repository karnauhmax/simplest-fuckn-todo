import { useState, type FormEvent } from 'react';
import { UnauthorizedError, fetchBoards, saveSecret } from '../api/client.js';

interface Props {
  onUnlocked: () => void;
}

export function UnlockScreen({ onUnlocked }: Props) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetchBoards({ secret });
      saveSecret(secret);
      onUnlocked();
    } catch (err) {
      setError(err instanceof UnauthorizedError ? 'Wrong secret.' : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Simplest Fuckn Todo</h1>
      <form onSubmit={submit}>
        <label htmlFor="secret">Secret</label>
        <input
          id="secret"
          type="password"
          value={secret}
          autoComplete="current-password"
          onChange={(event) => setSecret(event.target.value)}
        />
        <button type="submit" disabled={busy || secret.length === 0}>
          Unlock
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
