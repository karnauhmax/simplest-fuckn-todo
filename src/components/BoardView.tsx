import { useRef, useState, type FormEvent } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { Board, Card, List } from '../../shared/types.js';
import { boardReducer, listIdOfCard } from '../state/boardReducer.js';
import { loadCollapsed, saveCollapsed } from '../state/collapsed.js';
import { CardItem } from './CardItem.js';
import { CARDS_PREFIX, LIST_PREFIX, ListColumn } from './ListColumn.js';

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
  onMoveList: (listId: string, toIndex: number) => void;
}

interface DropTarget {
  listId: string;
  index: number;
}

const listIdFrom = (id: string): string | null => {
  if (id.startsWith(LIST_PREFIX)) return id.slice(LIST_PREFIX.length);
  if (id.startsWith(CARDS_PREFIX)) return id.slice(CARDS_PREFIX.length);
  return null;
};

function resolveTarget(board: Board, overId: string): DropTarget | null {
  const asList = listIdFrom(overId);
  const listId = asList ?? listIdOfCard(board, overId);
  const list = listId ? board.lists.find((candidate) => candidate.id === listId) : undefined;
  if (!list) return null;
  if (asList) return { listId: list.id, index: list.cards.length };

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
  onMoveList,
}: Props) {
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed(board.id));
  const [preview, setPreview] = useState<Board | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeList, setActiveList] = useState<List | null>(null);

  // Read synchronously inside drag handlers, which fire faster than re-renders.
  const previewRef = useRef<Board | null>(null);
  const originRef = useRef<DropTarget | null>(null);

  // Mouse and touch are handled by separate sensors on purpose. A single
  // PointerSensor also claims touch, and the browser cancels that pointer
  // stream the moment it decides the finger is panning, killing the drag.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // The delay is what lets a finger scroll the board without grabbing a card.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const view = preview ?? board;
  const dragging = activeCard !== null || activeList !== null;

  function showPreview(next: Board | null) {
    previewRef.current = next;
    setPreview(next);
  }

  function endGesture() {
    showPreview(null);
    setActiveCard(null);
    setActiveList(null);
    originRef.current = null;
  }

  function dragStart(event: DragStartEvent) {
    const id = String(event.active.id);

    const draggedListId = id.startsWith(LIST_PREFIX) ? id.slice(LIST_PREFIX.length) : null;
    if (draggedListId) {
      const index = board.lists.findIndex((list) => list.id === draggedListId);
      if (index === -1) return;
      originRef.current = { listId: draggedListId, index };
      setActiveList(board.lists[index]!);
      showPreview(board);
      return;
    }

    const listId = listIdOfCard(board, id);
    const list = board.lists.find((candidate) => candidate.id === listId);
    if (!list) return;

    originRef.current = { listId: list.id, index: list.cards.findIndex((c) => c.id === id) };
    setActiveCard(list.cards.find((c) => c.id === id) ?? null);
    showPreview(board);
  }

  // Cross-list card moves happen mid-gesture so the card visibly joins the
  // other list; nothing is persisted until the drop.
  function dragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    if (cardId.startsWith(LIST_PREFIX)) return;

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

  function dropList(event: DragEndEvent, listId: string) {
    const origin = originRef.current;
    const overId = event.over ? String(event.over.id) : null;
    const overListId = overId ? (listIdFrom(overId) ?? listIdOfCard(board, overId)) : null;
    endGesture();

    if (!origin || !overListId || overListId === listId) return;
    const toIndex = board.lists.findIndex((list) => list.id === overListId);
    if (toIndex === -1 || toIndex === origin.index) return;

    onMoveList(listId, toIndex);
  }

  function dragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const id = String(active.id);

    if (id.startsWith(LIST_PREFIX)) {
      dropList(event, id.slice(LIST_PREFIX.length));
      return;
    }

    const origin = originRef.current;
    let final = previewRef.current ?? board;

    if (over) {
      const fromListId = listIdOfCard(final, id);
      const target = resolveTarget(final, String(over.id));
      if (fromListId && target) {
        final =
          boardReducer(final, {
            type: 'move-card',
            fromListId,
            toListId: target.listId,
            cardId: id,
            toIndex: target.index,
          }) ?? final;
      }
    }

    endGesture();
    if (!origin) return;

    const toListId = listIdOfCard(final, id);
    const toList = final.lists.find((list) => list.id === toListId);
    if (!toListId || !toList) return;

    const toIndex = toList.cards.findIndex((card) => card.id === id);
    if (toListId === origin.listId && toIndex === origin.index) return;

    onMoveCard({ fromListId: origin.listId, toListId, cardId: id, toIndex });
  }

  function toggleCollapsed(listId: string) {
    const next = new Set(collapsed);
    if (!next.delete(listId)) next.add(listId);
    saveCollapsed(board.id, next);
    setCollapsed(next);
  }

  function addList(event: FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (name.length === 0) return;
    onAddList(name);
    setDraft('');
  }

  return (
    <section
      className="board"
      aria-label={`Board ${board.name}`}
      data-dragging={dragging || undefined}
    >
      <h2 className="board__title">{board.name}</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={dragStart}
        onDragOver={dragOver}
        onDragEnd={dragEnd}
        onDragCancel={endGesture}
      >
        <div className="board__rail">
          <SortableContext
            items={view.lists.map((list) => `${LIST_PREFIX}${list.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {view.lists.map((list, index) => (
              <ListColumn
                key={list.id}
                list={list}
                index={index}
                collapsed={collapsed.has(list.id)}
                onToggleCollapsed={() => toggleCollapsed(list.id)}
                onRename={(name) => onRenameList(list.id, name)}
                onDelete={() => onDeleteList(list.id)}
                onAddCard={(title) => onAddCard(list.id, title)}
                onEditCard={(cardId, title) => onEditCard(list.id, cardId, title)}
                onDeleteCard={(cardId) => onDeleteCard(list.id, cardId)}
              />
            ))}
          </SortableContext>
          <form className="new-list" onSubmit={addList}>
            <label className="label" htmlFor="new-list">
              New list name
            </label>
            <input
              id="new-list"
              className="field"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="solid" type="submit" disabled={draft.trim().length === 0}>
              Add list
            </button>
          </form>
        </div>
        <DragOverlay>
          {activeCard && (
            <ul className="overlay-list">
              <CardItem card={activeCard} overlay />
            </ul>
          )}
          {activeList && (
            <div className="overlay-card" aria-label={`Dragging list ${activeList.name}`}>
              {activeList.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
