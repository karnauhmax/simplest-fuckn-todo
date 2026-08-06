import { useRef, useState, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  label: string;
  onCommit: (next: string) => void;
}

export function InlineEdit({ value, label, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  function begin() {
    cancelled.current = false;
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = draft.trim();
    if (next.length > 0 && next !== value) onCommit(next);
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      cancelled.current = true;
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <button type="button" onClick={begin}>
        {value}
      </button>
    );
  }

  return (
    <input
      aria-label={label}
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={keyDown}
    />
  );
}
