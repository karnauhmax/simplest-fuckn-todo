// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardSwitcher } from '../../src/components/BoardSwitcher.js';

const boards = [
  { id: 'b1', name: 'Personal' },
  { id: 'b2', name: 'Work' },
];

function renderSwitcher(overrides: Partial<Parameters<typeof BoardSwitcher>[0]> = {}) {
  const props = {
    boards,
    activeId: 'b1',
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<BoardSwitcher {...props} />);
  return props;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test('the dropdown lists every board and reports a switch', async () => {
  const { onSelect } = renderSwitcher();

  const select = screen.getByLabelText('Board');
  expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Personal', 'Work']);
  expect(select).toHaveValue('b1');

  await userEvent.selectOptions(select, 'b2');
  expect(onSelect).toHaveBeenCalledWith('b2');
});

test('creating a board submits the typed name', async () => {
  const { onCreate } = renderSwitcher();

  await userEvent.click(screen.getByRole('button', { name: 'New board' }));
  await userEvent.type(screen.getByLabelText('New board name'), '  Groceries  ');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(onCreate).toHaveBeenCalledWith('Groceries');
  expect(screen.queryByLabelText('New board name')).not.toBeInTheDocument();
});

test('renaming prefills the active board name and submits the edit', async () => {
  const { onRename } = renderSwitcher();

  await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
  const input = screen.getByLabelText('Board name');
  expect(input).toHaveValue('Personal');

  await userEvent.clear(input);
  await userEvent.type(input, 'Personal v2{Enter}');

  expect(onRename).toHaveBeenCalledWith('Personal v2');
});

test('cancelling closes the form without reporting anything', async () => {
  const { onCreate, onRename } = renderSwitcher();

  await userEvent.click(screen.getByRole('button', { name: 'New board' }));
  await userEvent.type(screen.getByLabelText('New board name'), 'Draft');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(screen.queryByLabelText('New board name')).not.toBeInTheDocument();
  expect(onCreate).not.toHaveBeenCalled();
  expect(onRename).not.toHaveBeenCalled();
});

test('deleting asks for confirmation first', async () => {
  vi.stubGlobal('confirm', vi.fn(() => false));
  const { onDelete } = renderSwitcher();

  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(onDelete).not.toHaveBeenCalled();

  vi.stubGlobal('confirm', vi.fn(() => true));
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(onDelete).toHaveBeenCalledOnce();
});

test('rename and delete are unavailable with no boards', () => {
  renderSwitcher({ boards: [], activeId: null });

  expect(screen.getByRole('button', { name: 'Rename' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'New board' })).toBeEnabled();
});
