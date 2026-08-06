import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { List } from '../../shared/types.js';
import { InlineEdit } from './InlineEdit.js';
import { SortableCardItem } from './SortableCardItem.js';
import { QuickAdd } from './QuickAdd.js';

export const LIST_DROPPABLE_PREFIX = 'list:';

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
  const { setNodeRef } = useDroppable({ id: `${LIST_DROPPABLE_PREFIX}${list.id}` });

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
      <SortableContext
        items={list.cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul ref={setNodeRef}>
          {list.cards.map((card) => (
            <SortableCardItem
              key={card.id}
              card={card}
              onEdit={(title) => onEditCard(card.id, title)}
              onDelete={() => onDeleteCard(card.id)}
            />
          ))}
        </ul>
      </SortableContext>
      <QuickAdd listName={list.name} onAdd={onAddCard} />
    </section>
  );
}
