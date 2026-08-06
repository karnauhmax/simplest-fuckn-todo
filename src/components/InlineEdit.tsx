import { useRef, useState, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  label: string;
  className?: string;
  onCommit: (next: string) => void;
}

export function InlineEdit({ value, label, className, onCommit }: Props) {
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
    // A card carries dnd-kit's keyboard listeners, which claim Space as the
    // drag activator; without this, spaces never reach the field.
    event.stopPropagation();

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
      <button type="button" className={className} onClick={begin}>
        {value}
      </button>
    );
  }

  return (
    <input
      aria-label={label}
      className={`inline-edit ${className ?? ''}`}
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={keyDown}
      onPointerDown={(event) => event.stopPropagation()}
    />
  );
}
