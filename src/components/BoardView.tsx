import { useState, type FormEvent } from 'react';
import type { Board } from '../../shared/types.js';
import { ListColumn } from './ListColumn.js';

interface Props {
  board: Board;
  onAddList: (name: string) => void;
  onRenameList: (listId: string, name: string) => void;
  onDeleteList: (listId: string) => void;
  onAddCard: (listId: string, title: string) => void;
  onEditCard: (listId: string, cardId: string, title: string) => void;
  onDeleteCard: (listId: string, cardId: string) => void;
}

export function BoardView({
  board,
  onAddList,
  onRenameList,
  onDeleteList,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: Props) {
  const [draft, setDraft] = useState('');

  function addList(event: FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (name.length === 0) return;
    onAddList(name);
    setDraft('');
  }

  return (
    <section aria-label={`Board ${board.name}`}>
      <h2>{board.name}</h2>
      <div>
        {board.lists.map((list) => (
          <ListColumn
            key={list.id}
            list={list}
            onRename={(name) => onRenameList(list.id, name)}
            onDelete={() => onDeleteList(list.id)}
            onAddCard={(title) => onAddCard(list.id, title)}
            onEditCard={(cardId, title) => onEditCard(list.id, cardId, title)}
            onDeleteCard={(cardId) => onDeleteCard(list.id, cardId)}
          />
        ))}
        <form onSubmit={addList}>
          <label htmlFor="new-list">New list name</label>
          <input id="new-list" value={draft} onChange={(event) => setDraft(event.target.value)} />
          <button type="submit" disabled={draft.trim().length === 0}>
            Add list
          </button>
        </form>
      </div>
    </section>
  );
}
