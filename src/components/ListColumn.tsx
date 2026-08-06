import type { List } from '../../shared/types.js';
import { InlineEdit } from './InlineEdit.js';

interface Props {
  list: List;
  onRename: (name: string) => void;
  onDelete: () => void;
}

export function ListColumn({ list, onRename, onDelete }: Props) {
  function remove() {
    if (!window.confirm(`Delete list "${list.name}"?`)) return;
    onDelete();
  }

  return (
    <section aria-label={`List ${list.name}`}>
      <header>
        <InlineEdit value={list.name} label="List name" onCommit={onRename} />
        <button type="button" onClick={remove} aria-label={`Delete list ${list.name}`}>
          Delete
        </button>
      </header>
      <ul>
        {list.cards.map((card) => (
          <li key={card.id}>{card.title}</li>
        ))}
      </ul>
    </section>
  );
}
