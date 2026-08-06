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
  overlay?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
}

export function CardItem({
  card,
  onEdit,
  onDelete,
  ref,
  style,
  dragging = false,
  overlay = false,
  dragHandleProps,
}: Props) {
  return (
    <li
      ref={ref}
      style={style}
      className={`card${overlay ? ' card--overlay' : ''}`}
      data-dragging={dragging || undefined}
      {...dragHandleProps}
    >
      {onEdit ? (
        <InlineEdit value={card.title} label="Card title" className="card__title" onCommit={onEdit} />
      ) : (
        <span className="card__title">{card.title}</span>
      )}
      {onDelete && (
        <button
          type="button"
          className="ghost ghost--danger card__delete"
          onClick={onDelete}
          aria-label={`Delete card ${card.title}`}
        >
          Del
        </button>
      )}
    </li>
  );
}
