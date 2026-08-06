import type { Card, List } from '../../shared/types.js';

export const MAX_NAME_LENGTH = 200;

export interface BoardInput {
  name: string;
  lists: List[];
}

function isCard(value: unknown): value is Card {
  const card = value as Card;
  return (
    typeof card === 'object' &&
    card !== null &&
    typeof card.id === 'string' &&
    typeof card.title === 'string'
  );
}

function isList(value: unknown): value is List {
  const list = value as List;
  return (
    typeof list === 'object' &&
    list !== null &&
    typeof list.id === 'string' &&
    typeof list.name === 'string' &&
    Array.isArray(list.cards) &&
    list.cards.every(isCard)
  );
}

export function parseName(body: unknown): string | null {
  const name = (body as { name?: unknown } | null)?.name;
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) return null;
  return trimmed;
}

export function parseBoardInput(body: unknown): BoardInput | null {
  const name = parseName(body);
  if (name === null) return null;
  const lists = (body as { lists?: unknown }).lists;
  if (!Array.isArray(lists) || !lists.every(isList)) return null;
  return { name, lists };
}
