import type { Board, List } from '../../shared/types.js';

export type BoardAction =
  | { type: 'board-loaded'; board: Board }
  | { type: 'rename-board'; name: string }
  | { type: 'add-list'; listId: string; name: string }
  | { type: 'rename-list'; listId: string; name: string }
  | { type: 'delete-list'; listId: string }
  | { type: 'add-card'; listId: string; cardId: string; title: string }
  | { type: 'edit-card'; listId: string; cardId: string; title: string }
  | { type: 'delete-card'; listId: string; cardId: string }
  | {
      type: 'move-card';
      fromListId: string;
      toListId: string;
      cardId: string;
      toIndex: number;
    };

export function listIdOfCard(board: Board, cardId: string): string | null {
  return board.lists.find((list) => list.cards.some((card) => card.id === cardId))?.id ?? null;
}

function clamp(index: number, length: number): number {
  return Math.max(0, Math.min(index, length));
}

function mapList(board: Board, listId: string, update: (list: List) => List): Board {
  let touched = false;
  const lists = board.lists.map((list) => {
    if (list.id !== listId) return list;
    const updated = update(list);
    if (updated !== list) touched = true;
    return updated;
  });
  return touched ? { ...board, lists } : board;
}

export function boardReducer(board: Board | null, action: BoardAction): Board | null {
  if (action.type === 'board-loaded') return action.board;
  if (!board) return board;

  switch (action.type) {
    case 'rename-board':
      return action.name === board.name ? board : { ...board, name: action.name };

    case 'add-list':
      return {
        ...board,
        lists: [...board.lists, { id: action.listId, name: action.name, cards: [] }],
      };

    case 'rename-list':
      return mapList(board, action.listId, (list) =>
        list.name === action.name ? list : { ...list, name: action.name },
      );

    case 'delete-list': {
      const lists = board.lists.filter((list) => list.id !== action.listId);
      return lists.length === board.lists.length ? board : { ...board, lists };
    }

    case 'add-card':
      return mapList(board, action.listId, (list) => ({
        ...list,
        cards: [...list.cards, { id: action.cardId, title: action.title }],
      }));

    case 'edit-card':
      return mapList(board, action.listId, (list) => {
        let touched = false;
        const cards = list.cards.map((card) => {
          if (card.id !== action.cardId || card.title === action.title) return card;
          touched = true;
          return { ...card, title: action.title };
        });
        return touched ? { ...list, cards } : list;
      });

    case 'delete-card':
      return mapList(board, action.listId, (list) => {
        const cards = list.cards.filter((card) => card.id !== action.cardId);
        return cards.length === list.cards.length ? list : { ...list, cards };
      });

    case 'move-card': {
      const from = board.lists.find((list) => list.id === action.fromListId);
      const to = board.lists.find((list) => list.id === action.toListId);
      if (!from || !to) return board;

      const at = from.cards.findIndex((card) => card.id === action.cardId);
      if (at === -1) return board;
      const card = from.cards[at]!;

      if (from === to) {
        const cards = from.cards.filter((c) => c.id !== action.cardId);
        const target = clamp(action.toIndex, cards.length);
        if (target === at) return board;
        cards.splice(target, 0, card);
        return { ...board, lists: board.lists.map((l) => (l === from ? { ...l, cards } : l)) };
      }

      const fromCards = from.cards.filter((c) => c.id !== action.cardId);
      const toCards = [...to.cards];
      toCards.splice(clamp(action.toIndex, toCards.length), 0, card);
      return {
        ...board,
        lists: board.lists.map((list) => {
          if (list === from) return { ...list, cards: fromCards };
          if (list === to) return { ...list, cards: toCards };
          return list;
        }),
      };
    }
  }
}
