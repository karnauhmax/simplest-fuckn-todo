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

test('add-card appends at the bottom of the target list', () => {
  const withTwo = boardReducer(board, {
    type: 'add-card',
    listId: 'l1',
    cardId: 'c2',
    title: 'second',
  })!;
  const withThree = boardReducer(withTwo, {
    type: 'add-card',
    listId: 'l1',
    cardId: 'c3',
    title: 'third',
  })!;

  expect(withThree.lists[0]!.cards.map((c) => c.title)).toEqual(['ship it', 'second', 'third']);
  expect(withThree.lists[1]!.cards).toEqual([]);
});

test('add-card works on an empty list', () => {
  const next = boardReducer(board, {
    type: 'add-card',
    listId: 'l2',
    cardId: 'c9',
    title: 'first here',
  })!;

  expect(next.lists[1]!.cards).toEqual([{ id: 'c9', title: 'first here' }]);
});

test('edit-card retitles only the target card', () => {
  const next = boardReducer(board, {
    type: 'edit-card',
    listId: 'l1',
    cardId: 'c1',
    title: 'ship it twice',
  })!;

  expect(next.lists[0]!.cards).toEqual([{ id: 'c1', title: 'ship it twice' }]);
});

test('delete-card removes only the target card', () => {
  const next = boardReducer(board, { type: 'delete-card', listId: 'l1', cardId: 'c1' })!;

  expect(next.lists[0]!.cards).toEqual([]);
  expect(next.lists[0]!.name).toBe('TODAY');
});

test.each([
  ['unknown list rename', { type: 'rename-list', listId: 'nope', name: 'X' }],
  ['unknown list delete', { type: 'delete-list', listId: 'nope' }],
  ['rename to the same board name', { type: 'rename-board', name: 'Personal' }],
  ['rename to the same list name', { type: 'rename-list', listId: 'l1', name: 'TODAY' }],
  ['edit to the same card title', { type: 'edit-card', listId: 'l1', cardId: 'c1', title: 'ship it' }],
  ['edit a card in the wrong list', { type: 'edit-card', listId: 'l2', cardId: 'c1', title: 'x' }],
  ['delete an unknown card', { type: 'delete-card', listId: 'l1', cardId: 'nope' }],
  ['add a card to an unknown list', { type: 'add-card', listId: 'nope', cardId: 'c9', title: 'x' }],
] as const)('%s returns the identical board so no write is queued', (_label, action) => {
  expect(boardReducer(board, action)).toBe(board);
});
