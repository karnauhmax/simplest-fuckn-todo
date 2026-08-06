import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../../shared/types.js';
import { CardItem } from './CardItem.js';

interface Props {
  card: Card;
  onEdit: (title: string) => void;
  onDelete: () => void;
}

export function SortableCardItem({ card, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  return (
    <CardItem
      card={card}
      onEdit={onEdit}
      onDelete={onDelete}
      ref={setNodeRef}
      dragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    />
  );
}
