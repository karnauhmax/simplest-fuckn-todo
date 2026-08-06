import { useRef, useState, type FormEvent } from 'react';

interface Props {
  listName: string;
  onAdd: (title: string) => void;
}

export function QuickAdd({ listName, onAdd }: Props) {
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (title.length === 0) return;
    onAdd(title);
    setDraft('');
    input.current?.focus();
  }

  return (
    <form onSubmit={submit}>
      <input
        ref={input}
        aria-label={`Add a card to ${listName}`}
        placeholder="Add a card"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="submit" aria-label={`Add card to ${listName}`} disabled={draft.trim().length === 0}>
        Add
      </button>
    </form>
  );
}
