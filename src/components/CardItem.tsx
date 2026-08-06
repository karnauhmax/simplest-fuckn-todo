import type { CSSProperties, HTMLAttributes, Ref } from 'react';
import type { Card } from '../../shared/types.js';
import { InlineEdit } from './InlineEdit.js';

interface Props {
  card: Card;
  onEdit?: (title: string) => void;
  onDelete?: () => void;
  ref?: Ref<HTMLLIElement>;
  style?: CSSProperties;
  dragging?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
}

export function CardItem({
  card,
  onEdit,
  onDelete,
  ref,
  style,
  dragging = false,
  dragHandleProps,
}: Props) {
  return (
    <li ref={ref} style={style} data-dragging={dragging || undefined} {...dragHandleProps}>
      {onEdit ? (
        <InlineEdit value={card.title} label="Card title" onCommit={onEdit} />
      ) : (
        <span>{card.title}</span>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} aria-label={`Delete card ${card.title}`}>
          Delete
        </button>
      )}
    </li>
  );
}
