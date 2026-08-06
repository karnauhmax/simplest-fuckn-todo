import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { parseKanban } from '../../scripts/migrate-obsidian.js';

const source = readFileSync('existing-tasks.md', 'utf8');

test('every heading becomes a list, in source order', () => {
  const board = parseKanban(source, 'Personal');

  expect(board.name).toBe('Personal');
  expect(board.lists.map((list) => list.name)).toEqual([
    'On Hold',
    'TODAY',
    'THIS WEEK',
    'LATER',
    'Done',
    'Archive',
  ]);
});

test('every checkbox line becomes a card and none are lost', () => {
  const board = parseKanban(source, 'Personal');
  const cards = board.lists.flatMap((list) => list.cards);
  const expected = source.split('\n').filter((line) => line.startsWith('- [ ]')).length;

  expect(cards).toHaveLength(expected);
  expect(cards).toHaveLength(88);
  expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
});

test('card titles keep their exact source text and order', () => {
  const board = parseKanban(source, 'Personal');
  const today = board.lists.find((list) => list.name === 'TODAY')!;

  expect(today.cards.slice(0, 3).map((card) => card.title)).toEqual([
    'сделать кастомный deep-interview более вертикальным скиллом',
    'нельзя бросать наблюдение своего харнеса ни в ком случае',
    'Засетапить нового юзера',
  ]);
  expect(board.lists.at(-1)!.cards.map((card) => card.title)).toEqual([
    'productivity builder',
    'yomitan desktop',
  ]);
});

test('the kanban settings block is ignored entirely', () => {
  const board = parseKanban(source, 'Personal');

  expect(JSON.stringify(board)).not.toContain('kanban-plugin');
  expect(JSON.stringify(board)).not.toContain('list-collapse');
});

test('checked items are imported too, as plain cards', () => {
  const board = parseKanban('## Done\n\n- [x] shipped it\n- [ ] not yet\n', 'X');

  expect(board.lists[0]!.cards.map((card) => card.title)).toEqual(['shipped it', 'not yet']);
});

test('cards before any heading are dropped rather than orphaned', () => {
  const board = parseKanban('- [ ] homeless\n\n## Real\n\n- [ ] kept\n', 'X');

  expect(board.lists).toHaveLength(1);
  expect(board.lists[0]!.cards.map((card) => card.title)).toEqual(['kept']);
});
