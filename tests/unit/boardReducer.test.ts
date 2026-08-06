import { expect, test } from 'vitest';
import type { Board } from '../../shared/types.js';
import { boardReducer } from '../../src/state/boardReducer.js';

const board: Board = {
  id: 'b1',
  name: 'Personal',
  lists: [
    { id: 'l1', name: 'TODAY', cards: [{ id: 'c1', title: 'ship it' }] },
    { id: 'l2', name: 'LATER', cards: [] },
  ],
};

test('board-loaded replaces the whole board, even from null', () => {
  expect(boardReducer(null, { type: 'board-loaded', board })).toEqual(board);
});

test('every other action is a no-op without a board', () => {
  expect(boardReducer(null, { type: 'add-list', listId: 'x', name: 'New' })).toBeNull();
});

test('add-list appends an empty list at the end', () => {
  const next = boardReducer(board, { type: 'add-list', listId: 'l3', name: 'DONE' })!;

  expect(next.lists.map((l) => l.name)).toEqual(['TODAY', 'LATER', 'DONE']);
  expect(next.lists[2]).toEqual({ id: 'l3', name: 'DONE', cards: [] });
  expect(board.lists).toHaveLength(2);
});

test('rename-list renames only the target and keeps its cards', () => {
  const next = boardReducer(board, { type: 'rename-list', listId: 'l1', name: 'DOING' })!;

  expect(next.lists.map((l) => l.name)).toEqual(['DOING', 'LATER']);
  expect(next.lists[0]!.cards).toEqual([{ id: 'c1', title: 'ship it' }]);
});

test('delete-list removes only the target', () => {
  const next = boardReducer(board, { type: 'delete-list', listId: 'l1' })!;

  expect(next.lists.map((l) => l.id)).toEqual(['l2']);
});

test('rename-board renames the board and leaves lists untouched', () => {
  const next = boardReducer(board, { type: 'rename-board', name: 'Personal v2' })!;

  expect(next.name).toBe('Personal v2');
  expect(next.lists).toBe(board.lists);
});

test.each([
  ['unknown list rename', { type: 'rename-list', listId: 'nope', name: 'X' }],
  ['unknown list delete', { type: 'delete-list', listId: 'nope' }],
  ['rename to the same board name', { type: 'rename-board', name: 'Personal' }],
  ['rename to the same list name', { type: 'rename-list', listId: 'l1', name: 'TODAY' }],
] as const)('%s returns the identical board so no write is queued', (_label, action) => {
  expect(boardReducer(board, action)).toBe(board);
});
