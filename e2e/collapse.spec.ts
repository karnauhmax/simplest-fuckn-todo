import { expect, test } from '@playwright/test';
import {
  addCard,
  addList,
  boardState,
  collapseToggle,
  createBoard,
  dragTo,
  list,
  persisted,
  unlockSilently,
} from './helpers.js';

test('a collapsed list stays collapsed across a reload and costs no write', async ({ page }) => {
  await unlockSilently(page);
  await createBoard(page, `Collapse ${Date.now()}`);
  await addList(page, 'INBOX');
  await addList(page, 'DONE');
  // Let the card's own write land, or it would be counted against collapsing.
  const written = persisted(page, 'shipped');
  await addCard(page, 'DONE', 'shipped');
  await written;

  const writes: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'PUT') writes.push(request.url());
  });

  await collapseToggle(page, 'DONE').click();
  await expect(list(page, 'DONE')).toHaveClass(/list--collapsed/);
  await expect(page.getByText('shipped')).toHaveCount(0);
  await expect(page.getByLabel('Add a card to DONE')).toHaveCount(0);
  // The name and count survive so a collapsed list is still identifiable.
  await expect(list(page, 'DONE')).toContainText('DONE');
  await expect(list(page, 'DONE')).toContainText('1');
  expect(writes).toEqual([]);

  await page.reload();
  await expect(list(page, 'DONE')).toHaveClass(/list--collapsed/);
  await expect(list(page, 'INBOX')).not.toHaveClass(/list--collapsed/);

  await collapseToggle(page, 'DONE', true).click();
  await expect(page.getByText('shipped')).toBeVisible();
  expect(writes).toEqual([]);
});

test('a collapsed list still reorders by drag, and the keyboard can expand it', async ({
  page,
}) => {
  await unlockSilently(page);
  await createBoard(page, `Collapsed drag ${Date.now()}`);
  await addList(page, 'FIRST');
  await addList(page, 'SECOND');
  await addCard(page, 'FIRST', 'stays put');

  await collapseToggle(page, 'FIRST').click();
  // Registered before the gesture: the write lands during dnd-kit's drop
  // animation, which `dragTo` waits out.
  const written = persisted(page, 'stays put');
  await dragTo(
    page,
    list(page, 'FIRST').locator('.list__head'),
    list(page, 'SECOND').locator('.list__head'),
  );
  await written;

  await page.reload();
  await expect(list(page, 'FIRST')).toHaveClass(/list--collapsed/);

  // Enter on the toggle must expand, not start a keyboard drag.
  await collapseToggle(page, 'FIRST', true).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('stays put')).toBeVisible();

  expect(await boardState(page)).toEqual([
    { list: 'SECOND', cards: [] },
    { list: 'FIRST', cards: ['stays put'] },
  ]);
});
