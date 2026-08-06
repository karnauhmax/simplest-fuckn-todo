// @vitest-environment jsdom
import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Board } from '../../shared/types.js';
import { BoardView } from '../../src/components/BoardView.js';
import { QuickAdd } from '../../src/components/QuickAdd.js';

const board: Board = {
  id: 'b1',
  name: 'Personal',
  lists: [
    {
      id: 'l1',
      name: 'TODAY',
      cards: [
        { id: 'c1', title: 'ship it' },
        { id: 'c2', title: 'write it down' },
      ],
    },
    { id: 'l2', name: 'LATER', cards: [] },
  ],
};

function renderBoard(overrides: Partial<Parameters<typeof BoardView>[0]> = {}) {
  const props = {
    board,
    onAddList: vi.fn(),
    onRenameList: vi.fn(),
    onDeleteList: vi.fn(),
    onAddCard: vi.fn(),
    onEditCard: vi.fn(),
    onDeleteCard: vi.fn(),
    onMoveCard: vi.fn(),
    onMoveList: vi.fn(),
    ...overrides,
  };
  render(<BoardView {...props} />);
  return props;
}

test('cards render in list order', () => {
  renderBoard();

  const titles = screen
    .getByRole('region', { name: 'List TODAY' })
    .querySelectorAll('li button:first-child');
  expect([...titles].map((el) => el.textContent)).toEqual(['ship it', 'write it down']);
});

test('QuickAdd submits on Enter, clears, and keeps focus for the next card', async () => {
  const onAdd = vi.fn();
  render(<QuickAdd listName="TODAY" onAdd={onAdd} />);

  const input = screen.getByLabelText('Add a card to TODAY');
  await userEvent.type(input, '  buy milk  {Enter}');

  expect(onAdd).toHaveBeenCalledWith('buy milk');
  expect(input).toHaveValue('');
  expect(input).toHaveFocus();

  await userEvent.type(input, 'and eggs{Enter}');
  expect(onAdd).toHaveBeenLastCalledWith('and eggs');
  expect(onAdd).toHaveBeenCalledTimes(2);
});

test('QuickAdd ignores a blank submission', async () => {
  const onAdd = vi.fn();
  render(<QuickAdd listName="TODAY" onAdd={onAdd} />);

  await userEvent.type(screen.getByLabelText('Add a card to TODAY'), '   {Enter}');

  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Add card to TODAY' })).toBeDisabled();
});

test('a quick-added card is reported against the list it was typed into', async () => {
  const { onAddCard } = renderBoard();

  await userEvent.type(screen.getByLabelText('Add a card to LATER'), 'someday{Enter}');

  expect(onAddCard).toHaveBeenCalledWith('l2', 'someday');
});

test('a card commits an inline edit on Enter', async () => {
  const { onEditCard } = renderBoard();

  await userEvent.click(screen.getByRole('button', { name: 'ship it' }));
  const input = screen.getByLabelText('Card title');
  await userEvent.clear(input);
  await userEvent.type(input, 'ship it today{Enter}');

  expect(onEditCard).toHaveBeenCalledWith('l1', 'c1', 'ship it today');
});

test('Escape abandons a card edit', async () => {
  const { onEditCard } = renderBoard();

  await userEvent.click(screen.getByRole('button', { name: 'ship it' }));
  await userEvent.type(screen.getByLabelText('Card title'), ' changed{Escape}');

  expect(onEditCard).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'ship it' })).toBeInTheDocument();
});

test('a card deletes without a confirmation prompt', async () => {
  const { onDeleteCard } = renderBoard();

  await userEvent.click(screen.getByRole('button', { name: 'Delete card write it down' }));

  expect(onDeleteCard).toHaveBeenCalledWith('l1', 'c2');
});
