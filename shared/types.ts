export interface Card {
  id: string;
  title: string;
}

export interface List {
  id: string;
  name: string;
  cards: Card[];
}

export interface Board {
  id: string;
  name: string;
  lists: List[];
}

export type BoardSummary = Pick<Board, 'id' | 'name'>;
