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
    <main className="unlock">
      <div className="unlock__inner">
        <h1 className="unlock__mark">
          simplest
          <br />
          fuckn <em>todo</em>
        </h1>
        <form className="unlock__form" onSubmit={submit}>
          <label className="label" htmlFor="secret">
            Secret
          </label>
          <div className="unlock__row">
            <input
              id="secret"
              className="field"
              type="password"
              value={secret}
              autoComplete="current-password"
              onChange={(event) => setSecret(event.target.value)}
            />
            <button className="solid" type="submit" disabled={busy || secret.length === 0}>
              {busy ? 'Checking' : 'Unlock'}
            </button>
          </div>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
