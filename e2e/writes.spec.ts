import { expect, test } from '@playwright/test';
import {
  addCard,
  addList,
  boardState,
  card,
  createBoard,
  dragTo,
  list,
  persisted,
  unlockSilently,
} from './helpers.js';

test('a burst of mutations coalesces and nothing is lost across a reload', async ({ page }) => {
  await unlockSilently(page);
  await createBoard(page, `Burst ${Date.now()}`);
  await addList(page, 'INBOX');

  // Hold every write open long enough that the next mutation lands mid-flight.
  const sent: string[][] = [];
  await page.route('**/api/boards/*', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    const body = route.request().postDataJSON() as { lists: { cards: { title: string }[] }[] };
    sent.push(body.lists[0]!.cards.map((entry) => entry.title));
    await new Promise((resume) => setTimeout(resume, 600));
    await route.continue();
  });

  const titles = ['one', 'two', 'three', 'four', 'five'];
  for (const title of titles) {
    await page.getByLabel('Add a card to INBOX').fill(title);
    await page.keyboard.press('Enter');
  }
  await expect(list(page, 'INBOX').locator('.card')).toHaveCount(titles.length);

  // Wait for the queue to drain, then prove intermediates never went out.
  await expect
    .poll(() => sent.at(-1)?.length ?? 0, { timeout: 15_000 })
    .toBe(titles.length);
  expect(sent.length).toBeLessThan(titles.length);
  await page.unroute('**/api/boards/*');

  await page.reload();
  await expect(list(page, 'INBOX').locator('.card')).toHaveCount(titles.length);
  expect(await boardState(page)).toEqual([{ list: 'INBOX', cards: titles }]);
});

test('a reordered list keeps its order and its cards across a reload', async ({ page }) => {
  await unlockSilently(page);
  await createBoard(page, `Reorder ${Date.now()}`);
  await addList(page, 'FIRST');
  await addList(page, 'SECOND');
  await addList(page, 'THIRD');
  await addCard(page, 'FIRST', 'travels with its list');

  await dragTo(page, list(page, 'FIRST').locator('.list__head'), list(page, 'THIRD').locator('.list__head'));

  const before = await boardState(page);
  expect(before.map((column) => column.list)).toEqual(['SECOND', 'THIRD', 'FIRST']);

  await page.reload();
  await expect(card(page, 'FIRST', 'travels with its list')).toBeVisible();
  expect(await boardState(page)).toEqual(before);
});

test('a cancelled drag writes nothing and restores the arrangement', async ({ page }) => {
  await unlockSilently(page);
  await createBoard(page, `Cancel ${Date.now()}`);
  await addList(page, 'LEFT');
  await addList(page, 'RIGHT');

  // Let the card's own write land before counting, or it is charged to the drag.
  const settled = persisted(page, 'stays put');
  await addCard(page, 'LEFT', 'stays put');
  await settled;

  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'PUT') writes += 1;
  });

  await dragTo(page, card(page, 'LEFT', 'stays put'), list(page, 'RIGHT').locator('.list__cards'), {
    cancel: true,
  });

  expect(writes).toBe(0);
  expect(await boardState(page)).toEqual([
    { list: 'LEFT', cards: ['stays put'] },
    { list: 'RIGHT', cards: [] },
  ]);
});
