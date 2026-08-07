// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Board } from '../../shared/types.js';
import { BoardView } from '../../src/components/BoardView.js';

const board: Board = {
  id: 'b1',
  name: 'Personal',
  lists: [
    { id: 'l1', name: 'TODAY', cards: [{ id: 'c1', title: 'ship it' }] },
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

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('every list on the board is rendered in order', () => {
  renderBoard();

  const headings = screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'));
  expect(headings).toEqual(['Board Personal', 'List TODAY', 'List LATER']);
});

test('adding a list submits the trimmed name and clears the field', async () => {
  const { onAddList } = renderBoard();

  const input = screen.getByLabelText('New list name');
  await userEvent.type(input, '  DONE  ');
  await userEvent.click(screen.getByRole('button', { name: 'Add list' }));

  expect(onAddList).toHaveBeenCalledWith('DONE');
  expect(input).toHaveValue('');
});

test('the add-list button stays disabled for blank input', async () => {
  renderBoard();

  expect(screen.getByRole('button', { name: 'Add list' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('New list name'), '   ');
  expect(screen.getByRole('button', { name: 'Add list' })).toBeDisabled();
});

test('a list name commits on Enter', async () => {
  const { onRenameList } = renderBoard();

  await userEvent.click(screen.getByRole('button', { name: 'TODAY' }));
  const input = screen.getByLabelText('List name');
  expect(input).toHaveValue('TODAY');

  await userEvent.clear(input);
  await userEvent.type(input, 'DOING{Enter}');

  expect(onRenameList).toHaveBeenCalledWith('l1', 'DOING');
  expect(screen.queryByLabelText('List name')).not.toBeInTheDocument();
});

test('Escape abandons a list rename', async () => {
  const { onRenameList } = renderBoard();

  await userEvent.click(screen.getByRole('button', { name: 'TODAY' }));
  await userEvent.type(screen.getByLabelText('List name'), '{Escape}');

  expect(onRenameList).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'TODAY' })).toBeInTheDocument();
});

test('deleting a list asks for confirmation first', async () => {
  vi.stubGlobal('confirm', vi.fn(() => false));
  const { onDeleteList } = renderBoard();

  await userEvent.click(screen.getByRole('button', { name: 'Delete list TODAY' }));
  expect(onDeleteList).not.toHaveBeenCalled();

  vi.stubGlobal('confirm', vi.fn(() => true));
  await userEvent.click(screen.getByRole('button', { name: 'Delete list TODAY' }));
  expect(onDeleteList).toHaveBeenCalledWith('l1');
});

test('cards already on a list are shown', () => {
  renderBoard();
  expect(screen.getByText('ship it')).toBeInTheDocument();
});

test('collapsing a list hides its cards and quick-add but keeps name and count', async () => {
  renderBoard();

  await userEvent.click(screen.getByRole('button', { name: 'Collapse list TODAY' }));

  expect(screen.queryByText('ship it')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Add a card to TODAY')).not.toBeInTheDocument();
  const column = screen.getByRole('region', { name: 'List TODAY' });
  expect(column).toHaveTextContent('TODAY');
  expect(column).toHaveTextContent('1');

  await userEvent.click(screen.getByRole('button', { name: 'Expand list TODAY' }));
  expect(screen.getByText('ship it')).toBeInTheDocument();
});

test('only the toggled list collapses, and the choice is stored per board', async () => {
  renderBoard();

  await userEvent.click(screen.getByRole('button', { name: 'Collapse list TODAY' }));

  expect(screen.getByRole('button', { name: 'Expand list TODAY' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Collapse list LATER' })).toBeInTheDocument();
  expect(localStorage.getItem('simplest-fuckn-todo:collapsed:b1')).toBe('["l1"]');
});

test('a list stored as collapsed renders collapsed on mount', () => {
  localStorage.setItem('simplest-fuckn-todo:collapsed:b1', '["l1"]');
  renderBoard();

  expect(screen.queryByText('ship it')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Expand list TODAY' })).toBeInTheDocument();
});
