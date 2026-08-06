import { useState, type FormEvent } from 'react';
import type { BoardSummary } from '../../shared/types.js';

interface Props {
  boards: BoardSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

type Mode = 'idle' | 'create' | 'rename';

export function BoardSwitcher({ boards, activeId, onSelect, onCreate, onRename, onDelete }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [draft, setDraft] = useState('');

  const active = boards.find((board) => board.id === activeId) ?? null;

  function open(next: Mode) {
    setDraft(next === 'rename' ? (active?.name ?? '') : '');
    setMode(next);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (name.length === 0) return;
    if (mode === 'create') onCreate(name);
    else onRename(name);
    setMode('idle');
  }

  function remove() {
    if (!active) return;
    if (!window.confirm(`Delete board "${active.name}"?`)) return;
    onDelete();
  }

  return (
    <header>
      <h1>Simplest Fuckn Todo</h1>
      <select
        aria-label="Board"
        value={activeId ?? ''}
        onChange={(event) => onSelect(event.target.value)}
        disabled={boards.length === 0}
      >
        {boards.length === 0 && <option value="">No boards yet</option>}
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => open('create')}>
        New board
      </button>
      <button type="button" onClick={() => open('rename')} disabled={!active}>
        Rename
      </button>
      <button type="button" onClick={remove} disabled={!active}>
        Delete
      </button>

      {mode !== 'idle' && (
        <form onSubmit={submit}>
          <label htmlFor="board-name">{mode === 'create' ? 'New board name' : 'Board name'}</label>
          <input
            id="board-name"
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" disabled={draft.trim().length === 0}>
            Save
          </button>
          <button type="button" onClick={() => setMode('idle')}>
            Cancel
          </button>
        </form>
      )}
    </header>
  );
}
