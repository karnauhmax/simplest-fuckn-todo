import { expect, test } from '@playwright/test';
import {
  addCard,
  addList,
  boardState,
  card,
  createBoard,
  deleteCardButton,
  dragTo,
  list,
  persisted,
  unlock,
} from './helpers.js';

test('the whole loop: unlock, build a board, rearrange it, and reload into the same state', async ({
  page,
}) => {
  await unlock(page);
  await createBoard(page, 'Golden');

  await addList(page, 'TODAY');
  await addList(page, 'LATER');

  await addCard(page, 'TODAY', 'ship the thing');
  await addCard(page, 'TODAY', 'call the accountant');
  await addCard(page, 'LATER', 'read the manual');

  expect(await boardState(page)).toEqual([
    { list: 'TODAY', cards: ['ship the thing', 'call the accountant'] },
    { list: 'LATER', cards: ['read the manual'] },
  ]);

  // drag a card across lists
  const settled = persisted(page);
  await dragTo(
    page,
    card(page, 'TODAY', 'ship the thing'),
    list(page, 'LATER').locator('.list__cards'),
  );
  await settled;

  expect(await boardState(page)).toEqual([
    { list: 'TODAY', cards: ['call the accountant'] },
    { list: 'LATER', cards: ['read the manual', 'ship the thing'] },
  ]);

  // reorder the lists themselves
  const listsSettled = persisted(page);
  await dragTo(
    page,
    list(page, 'TODAY').locator('.list__head'),
    list(page, 'LATER').locator('.list__head'),
  );
  await listsSettled;

  expect((await boardState(page)).map((column) => column.list)).toEqual(['LATER', 'TODAY']);

  // edit a card in place
  const editSettled = persisted(page);
  await card(page, 'LATER', 'read the manual').click();
  await page.getByLabel('Card title').fill('read the manual twice');
  await page.keyboard.press('Enter');
  await editSettled;

  // delete a card
  const deleteSettled = persisted(page);
  await deleteCardButton(page, 'call the accountant').click();
  await deleteSettled;

  const before = await boardState(page);
  expect(before).toEqual([
    { list: 'LATER', cards: ['read the manual twice', 'ship the thing'] },
    { list: 'TODAY', cards: [] },
  ]);

  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: 'Golden' })).toBeVisible();
  expect(await boardState(page)).toEqual(before);
});
