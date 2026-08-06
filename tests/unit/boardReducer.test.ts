import { expect, test } from 'vitest';
import type { Board } from '../../shared/types.js';
import { boardReducer, listIdOfCard } from '../../src/state/boardReducer.js';

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

const dragBoard: Board = {
  id: 'b1',
  name: 'Drag',
  lists: [
    {
      id: 'l1',
      name: 'TODAY',
      cards: [
        { id: 'c1', title: 'one' },
        { id: 'c2', title: 'two' },
        { id: 'c3', title: 'three' },
      ],
    },
    { id: 'l2', name: 'LATER', cards: [{ id: 'c4', title: 'four' }] },
    { id: 'l3', name: 'EMPTY', cards: [] },
  ],
};

const titles = (b: Board, listId: string) =>
  b.lists.find((l) => l.id === listId)!.cards.map((c) => c.title);

test('move-card reorders within a list, downwards', () => {
  const next = boardReducer(dragBoard, {
    type: 'move-card',
    fromListId: 'l1',
    toListId: 'l1',
    cardId: 'c1',
    toIndex: 2,
  })!;

  expect(titles(next, 'l1')).toEqual(['two', 'three', 'one']);
});

test('move-card reorders within a list, upwards', () => {
  const next = boardReducer(dragBoard, {
    type: 'move-card',
    fromListId: 'l1',
    toListId: 'l1',
    cardId: 'c3',
    toIndex: 0,
  })!;

  expect(titles(next, 'l1')).toEqual(['three', 'one', 'two']);
});

test('move-card moves across lists at the requested index', () => {
  const next = boardReducer(dragBoard, {
    type: 'move-card',
    fromListId: 'l1',
    toListId: 'l2',
    cardId: 'c2',
    toIndex: 0,
  })!;

  expect(titles(next, 'l1')).toEqual(['one', 'three']);
  expect(titles(next, 'l2')).toEqual(['two', 'four']);
});

test('move-card moves into an empty list', () => {
  const next = boardReducer(dragBoard, {
    type: 'move-card',
    fromListId: 'l1',
    toListId: 'l3',
    cardId: 'c1',
    toIndex: 0,
  })!;

  expect(titles(next, 'l1')).toEqual(['two', 'three']);
  expect(titles(next, 'l3')).toEqual(['one']);
});

test('move-card clamps an out-of-range index to the end', () => {
  const next = boardReducer(dragBoard, {
    type: 'move-card',
    fromListId: 'l1',
    toListId: 'l2',
    cardId: 'c1',
    toIndex: 99,
  })!;

  expect(titles(next, 'l2')).toEqual(['four', 'one']);
});

test('move-list reorders lists in both directions', () => {
  const right = boardReducer(dragBoard, { type: 'move-list', listId: 'l1', toIndex: 2 })!;
  expect(right.lists.map((l) => l.id)).toEqual(['l2', 'l3', 'l1']);

  const left = boardReducer(dragBoard, { type: 'move-list', listId: 'l3', toIndex: 0 })!;
  expect(left.lists.map((l) => l.id)).toEqual(['l3', 'l1', 'l2']);
});

test('move-list carries the cards with the list', () => {
  const next = boardReducer(dragBoard, { type: 'move-list', listId: 'l1', toIndex: 1 })!;

  expect(next.lists.map((l) => l.id)).toEqual(['l2', 'l1', 'l3']);
  expect(titles(next, 'l1')).toEqual(['one', 'two', 'three']);
});

test.each([
  ['move a list onto itself', { type: 'move-list', listId: 'l2', toIndex: 1 }],
  ['move an unknown list', { type: 'move-list', listId: 'nope', toIndex: 0 }],
] as const)('%s returns the identical board so no write is queued', (_label, action) => {
  expect(boardReducer(dragBoard, action)).toBe(dragBoard);
});

test('listIdOfCard finds the owning list, or null', () => {
  expect(listIdOfCard(dragBoard, 'c4')).toBe('l2');
  expect(listIdOfCard(dragBoard, 'nope')).toBeNull();
});

test.each([
  ['move to the same position', { type: 'move-card', fromListId: 'l1', toListId: 'l1', cardId: 'c2', toIndex: 1 }],
  ['move an unknown card', { type: 'move-card', fromListId: 'l1', toListId: 'l2', cardId: 'nope', toIndex: 0 }],
  ['move from an unknown list', { type: 'move-card', fromListId: 'nope', toListId: 'l2', cardId: 'c1', toIndex: 0 }],
  ['move to an unknown list', { type: 'move-card', fromListId: 'l1', toListId: 'nope', cardId: 'c1', toIndex: 0 }],
] as const)('%s returns the identical board so no write is queued', (_label, action) => {
  expect(boardReducer(dragBoard, action)).toBe(dragBoard);
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
