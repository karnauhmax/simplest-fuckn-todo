import { expect, type Locator, type Page } from '@playwright/test';

export const SECRET = 'dev-secret';
export const SECRET_KEY = 'simplest-fuckn-todo:secret';

export async function unlock(page: Page) {
  await page.goto('/');
  await page.getByLabel('Secret').fill(SECRET);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByLabel('Board', { exact: true })).toBeVisible();
}

/** Skips the unlock screen for specs that are not about auth. */
export async function unlockSilently(page: Page) {
  await page.addInitScript(
    ([key, secret]) => localStorage.setItem(key, secret),
    [SECRET_KEY, SECRET] as const,
  );
  await page.goto('/');
  await expect(page.getByLabel('Board', { exact: true })).toBeVisible();
}

export async function createBoard(page: Page, name: string) {
  await page.getByRole('button', { name: 'New board' }).click();
  await page.getByLabel('New board name').fill(name);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
}

export async function addList(page: Page, name: string) {
  await page.getByLabel('New list name').fill(name);
  await page.getByRole('button', { name: 'Add list' }).click();
  await expect(list(page, name)).toBeVisible();
}

export async function addCard(page: Page, listName: string, title: string) {
  await page.getByLabel(`Add a card to ${listName}`).fill(title);
  await page.keyboard.press('Enter');
  await expect(card(page, listName, title)).toBeVisible();
}

export function list(page: Page, name: string): Locator {
  return page.getByRole('region', { name: `List ${name}` });
}

/** The card's title button. dnd-kit also gives the surrounding `li` a button
 *  role, so anything less specific matches three elements — every locator that
 *  names a card has to be exact. */
export function card(page: Page, listName: string, title: string): Locator {
  return list(page, listName).getByRole('button', { name: title, exact: true });
}

export function deleteCardButton(page: Page, title: string): Locator {
  return page.getByRole('button', { name: `Delete card ${title}`, exact: true });
}

/** Card titles per list, in board order — the shape every assertion compares. */
export async function boardState(page: Page) {
  return page.$$eval('.list', (lists) =>
    lists.map((column) => ({
      list: column.querySelector('.list__title')!.textContent,
      cards: [...column.querySelectorAll('.card')].map(
        (card) => card.querySelector('.card__title')!.textContent,
      ),
    })),
  );
}

async function centre(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element is not visible, cannot drag it');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

interface DragOptions {
  cancel?: boolean;
}

/** Mouse drag with a deliberate first nudge past the 5px activation distance. */
export async function dragTo(page: Page, source: Locator, target: Locator, options: DragOptions = {}) {
  const from = await centre(source);
  const to = await centre(target);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y + 10, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await expect(page.locator('.board[data-dragging]')).toBeVisible();

  if (options.cancel) await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.board[data-dragging]')).toHaveCount(0);
  // dnd-kit swallows the click that lands during its drop animation, so a test
  // that interacts immediately after a drop silently does nothing. The overlay
  // unmounting is the end of that window.
  await expect(page.locator('.overlay-list, .overlay-card')).toHaveCount(0);
}

/**
 * Resolves when a write lands. Pass `contains` to wait for one specific write:
 * writes are serialised per board, so waiting for "the next PUT" can settle on
 * an earlier queued one and leave the interesting write still in flight.
 */
export async function persisted(page: Page, contains?: string) {
  await page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.status() === 200 &&
      (contains === undefined || (response.request().postData() ?? '').includes(contains)),
  );
}
