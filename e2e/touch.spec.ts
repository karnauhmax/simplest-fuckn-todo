import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  addCard,
  addList,
  boardState,
  card,
  createBoard,
  list,
  persisted,
  unlockSilently,
} from './helpers.js';

/**
 * WebKit refuses `new Touch` but keeps `document.createTouch`/`createTouchList`,
 * and its `TouchEvent` constructor wants real `TouchList`s rather than arrays.
 * Chromium is the mirror image. This picks whichever pair the engine has.
 */
const TOUCH_SHIM = `
  window.__touch = {
    make(target, x, y) {
      try {
        return new Touch({ identifier: 1, target, clientX: x, clientY: y });
      } catch {
        return document.createTouch(window, target, 1, x, y, x, y);
      }
    },
    list(touches) {
      return document.createTouchList
        ? document.createTouchList.apply(document, touches)
        : touches;
    },
    fire(type, target, touch) {
      const active = this.list(type === 'touchend' ? [] : [touch]);
      return target.dispatchEvent(new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: active,
        targetTouches: active,
        changedTouches: this.list([touch]),
      }));
    },
  };
`;

/**
 * WebKit exposes no touch-injection API, so the gesture is assembled by hand.
 * The events are untrusted, which dnd-kit does not care about — it reads
 * coordinates and timing, and the timing is the whole point: the sensor only
 * arms after a 200ms dwell, which is what stops a scroll becoming a drag.
 */
async function touchGesture(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: { dwellMs: number; steps?: number },
) {
  const steps = options.steps ?? 12;

  await page.evaluate(TOUCH_SHIM);
  await page.evaluate(({ x, y }) => {
    const shim = (window as never as Record<string, never>).__touch as never as {
      make: (target: Element, x: number, y: number) => never;
      fire: (type: string, target: Element, touch: never) => boolean;
    };
    const target = document.elementFromPoint(x, y)!;
    (window as unknown as { __dragTarget: Element }).__dragTarget = target;
    shim.fire('touchstart', target, shim.make(target, x, y));
  }, from);

  await page.waitForTimeout(options.dwellMs);

  for (let step = 1; step <= steps; step += 1) {
    const point = {
      x: from.x + ((to.x - from.x) * step) / steps,
      y: from.y + ((to.y - from.y) * step) / steps,
    };
    await page.evaluate(({ x, y }) => {
      const shim = (window as never as Record<string, never>).__touch as never as {
        make: (target: Element, x: number, y: number) => never;
        fire: (type: string, target: Element, touch: never) => boolean;
      };
      const target = (window as unknown as { __dragTarget: Element }).__dragTarget;
      shim.fire('touchmove', target, shim.make(target, x, y));
    }, point);
    await page.waitForTimeout(25);
  }

  await page.evaluate(({ x, y }) => {
    const shim = (window as never as Record<string, never>).__touch as never as {
      make: (target: Element, x: number, y: number) => never;
      fire: (type: string, target: Element, touch: never) => boolean;
    };
    const target = (window as unknown as { __dragTarget: Element }).__dragTarget;
    shim.fire('touchend', target, shim.make(target, x, y));
  }, to);
}

async function centre(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element is not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('a finger drags a card across lists once it has dwelled', async ({ page }) => {
  await unlockSilently(page);
  await createBoard(page, `Touch ${Date.now()}`);
  await addList(page, 'HERE');
  await addList(page, 'THERE');
  await addCard(page, 'HERE', 'carried by thumb');

  const from = await centre(card(page, 'HERE', 'carried by thumb'));
  const to = await centre(list(page, 'THERE').locator('.list__cards'));

  await touchGesture(page, from, to, { dwellMs: 320 });

  await expect(card(page, 'THERE', 'carried by thumb')).toBeVisible();
  expect(await boardState(page)).toEqual([
    { list: 'HERE', cards: [] },
    { list: 'THERE', cards: ['carried by thumb'] },
  ]);

  await page.reload();
  expect(await boardState(page)).toEqual([
    { list: 'HERE', cards: [] },
    { list: 'THERE', cards: ['carried by thumb'] },
  ]);
});

test('a flick that never dwells scrolls instead of dragging', async ({ page }) => {
  await unlockSilently(page);
  await createBoard(page, `Flick ${Date.now()}`);
  await addList(page, 'HERE');
  await addList(page, 'THERE');

  // Let the card's own write land before counting, or it is charged to the flick.
  const settled = persisted(page, 'must not move');
  await addCard(page, 'HERE', 'must not move');
  await settled;

  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'PUT') writes += 1;
  });

  const from = await centre(card(page, 'HERE', 'must not move'));
  const to = await centre(list(page, 'THERE').locator('.list__cards'));

  await touchGesture(page, from, to, { dwellMs: 40 });

  expect(writes).toBe(0);
  expect(await boardState(page)).toEqual([
    { list: 'HERE', cards: ['must not move'] },
    { list: 'THERE', cards: [] },
  ]);
});
