import type { Card } from '../../shared/types.js';
import { InlineEdit } from './InlineEdit.js';

interface Props {
  card: Card;
  onEdit: (title: string) => void;
  onDelete: () => void;
}

export function CardItem({ card, onEdit, onDelete }: Props) {
  return (
    <li>
      <InlineEdit value={card.title} label="Card title" onCommit={onEdit} />
      <button type="button" onClick={onDelete} aria-label={`Delete card ${card.title}`}>
        Delete
      </button>
    </li>
  );
}
