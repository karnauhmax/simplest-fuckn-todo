import { useRef, useState, type FormEvent } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Board, Card } from '../../shared/types.js';
import { boardReducer, listIdOfCard } from '../state/boardReducer.js';
import { CardItem } from './CardItem.js';
import { LIST_DROPPABLE_PREFIX, ListColumn } from './ListColumn.js';

export interface CardMove {
  fromListId: string;
  toListId: string;
  cardId: string;
  toIndex: number;
}

interface Props {
  board: Board;
  onAddList: (name: string) => void;
  onRenameList: (listId: string, name: string) => void;
  onDeleteList: (listId: string) => void;
  onAddCard: (listId: string, title: string) => void;
  onEditCard: (listId: string, cardId: string, title: string) => void;
  onDeleteCard: (listId: string, cardId: string) => void;
  onMoveCard: (move: CardMove) => void;
}

interface DropTarget {
  listId: string;
  index: number;
}

function resolveTarget(board: Board, overId: string): DropTarget | null {
  const overList = overId.startsWith(LIST_DROPPABLE_PREFIX);
  const listId = overList ? overId.slice(LIST_DROPPABLE_PREFIX.length) : listIdOfCard(board, overId);
  const list = listId ? board.lists.find((candidate) => candidate.id === listId) : undefined;
  if (!list) return null;
  if (overList) return { listId: list.id, index: list.cards.length };

  const index = list.cards.findIndex((card) => card.id === overId);
  return { listId: list.id, index: index === -1 ? list.cards.length : index };
}

export function BoardView({
  board,
  onAddList,
  onRenameList,
  onDeleteList,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onMoveCard,
}: Props) {
  const [draft, setDraft] = useState('');
  const [preview, setPreview] = useState<Board | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // Read synchronously inside drag handlers, which fire faster than re-renders.
  const previewRef = useRef<Board | null>(null);
  const originRef = useRef<DropTarget | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const view = preview ?? board;

  function showPreview(next: Board | null) {
    previewRef.current = next;
    setPreview(next);
  }

  function endGesture() {
    showPreview(null);
    setActiveCard(null);
    originRef.current = null;
  }

  function dragStart(event: DragStartEvent) {
    const cardId = String(event.active.id);
    const listId = listIdOfCard(board, cardId);
    const list = board.lists.find((candidate) => candidate.id === listId);
    if (!list) return;

    originRef.current = { listId: list.id, index: list.cards.findIndex((c) => c.id === cardId) };
    setActiveCard(list.cards.find((c) => c.id === cardId) ?? null);
    showPreview(board);
  }

  // Cross-list moves happen mid-gesture so the card visibly joins the other
  // list; nothing is persisted until the drop.
  function dragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const current = previewRef.current ?? board;
    const fromListId = listIdOfCard(current, cardId);
    const target = resolveTarget(current, String(over.id));
    if (!fromListId || !target || target.listId === fromListId) return;

    showPreview(
      boardReducer(current, {
        type: 'move-card',
        fromListId,
        toListId: target.listId,
        cardId,
        toIndex: target.index,
      }),
    );
  }

  function dragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const cardId = String(active.id);
    const origin = originRef.current;
    let final = previewRef.current ?? board;

    if (over) {
      const fromListId = listIdOfCard(final, cardId);
      const target = resolveTarget(final, String(over.id));
      if (fromListId && target) {
        final =
          boardReducer(final, {
            type: 'move-card',
            fromListId,
            toListId: target.listId,
            cardId,
            toIndex: target.index,
          }) ?? final;
      }
    }

    endGesture();
    if (!origin) return;

    const toListId = listIdOfCard(final, cardId);
    const toList = final.lists.find((list) => list.id === toListId);
    if (!toListId || !toList) return;

    const toIndex = toList.cards.findIndex((card) => card.id === cardId);
    if (toListId === origin.listId && toIndex === origin.index) return;

    onMoveCard({ fromListId: origin.listId, toListId, cardId, toIndex });
  }

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={dragStart}
        onDragOver={dragOver}
        onDragEnd={dragEnd}
        onDragCancel={endGesture}
      >
        <div>
          {view.lists.map((list) => (
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
        <DragOverlay>
          {activeCard && (
            <ul>
              <CardItem card={activeCard} dragging />
            </ul>
          )}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
