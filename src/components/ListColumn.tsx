import type { List } from '../../shared/types.js';
import { InlineEdit } from './InlineEdit.js';
import { CardItem } from './CardItem.js';
import { QuickAdd } from './QuickAdd.js';

interface Props {
  list: List;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddCard: (title: string) => void;
  onEditCard: (cardId: string, title: string) => void;
  onDeleteCard: (cardId: string) => void;
}

export function ListColumn({
  list,
  onRename,
  onDelete,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: Props) {
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
          <CardItem
            key={card.id}
            card={card}
            onEdit={(title) => onEditCard(card.id, title)}
            onDelete={() => onDeleteCard(card.id)}
          />
        ))}
      </ul>
      <QuickAdd listName={list.name} onAdd={onAddCard} />
    </section>
  );
}
