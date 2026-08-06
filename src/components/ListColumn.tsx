import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { List } from '../../shared/types.js';
import { InlineEdit } from './InlineEdit.js';
import { SortableCardItem } from './SortableCardItem.js';
import { QuickAdd } from './QuickAdd.js';

export const LIST_PREFIX = 'list:';
export const CARDS_PREFIX = 'cards:';

interface Props {
  list: List;
  index: number;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddCard: (title: string) => void;
  onEditCard: (cardId: string, title: string) => void;
  onDeleteCard: (cardId: string) => void;
}

export function ListColumn({
  list,
  index,
  onRename,
  onDelete,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${LIST_PREFIX}${list.id}`,
  });
  const cards = useDroppable({ id: `${CARDS_PREFIX}${list.id}` });
  const over = cards.isOver;

  function remove() {
    if (!window.confirm(`Delete list "${list.name}"?`)) return;
    onDelete();
  }

  return (
    <section
      ref={setNodeRef}
      className="list"
      aria-label={`List ${list.name}`}
      data-dragging={isDragging || undefined}
      data-over={over || undefined}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        ['--index' as string]: index,
      }}
    >
      <header className="list__head" {...attributes} {...listeners}>
        <InlineEdit
          value={list.name}
          label="List name"
          className="list__title"
          onCommit={onRename}
        />
        <span className="list__count">{list.cards.length}</span>
        <button
          type="button"
          className="ghost ghost--danger"
          onClick={remove}
          aria-label={`Delete list ${list.name}`}
        >
          Del
        </button>
      </header>
      <SortableContext
        items={list.cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="list__cards" ref={cards.setNodeRef}>
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
      <div className="list__foot">
        <QuickAdd listName={list.name} onAdd={onAddCard} />
      </div>
    </section>
  );
}
