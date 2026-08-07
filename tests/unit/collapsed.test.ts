// @vitest-environment jsdom
import { beforeEach, expect, test } from 'vitest';
import { loadCollapsed, saveCollapsed } from '../../src/state/collapsed.js';

beforeEach(() => {
  localStorage.clear();
});

test('a saved set comes back on the next load', () => {
  saveCollapsed('b1', new Set(['l1', 'l3']));
  expect([...loadCollapsed('b1')]).toEqual(['l1', 'l3']);
});

test('boards keep their own collapsed lists', () => {
  saveCollapsed('b1', new Set(['l1']));
  saveCollapsed('b2', new Set(['l2']));

  expect([...loadCollapsed('b1')]).toEqual(['l1']);
  expect([...loadCollapsed('b2')]).toEqual(['l2']);
});

test('an empty set is removed rather than stored', () => {
  saveCollapsed('b1', new Set(['l1']));
  saveCollapsed('b1', new Set());

  expect(localStorage.getItem('simplest-fuckn-todo:collapsed:b1')).toBeNull();
  expect(loadCollapsed('b1').size).toBe(0);
});

test('an unknown board and a corrupted entry both load as nothing collapsed', () => {
  localStorage.setItem('simplest-fuckn-todo:collapsed:b1', 'not json');
  localStorage.setItem('simplest-fuckn-todo:collapsed:b2', '{"l1":true}');

  expect(loadCollapsed('b1').size).toBe(0);
  expect(loadCollapsed('b2').size).toBe(0);
  expect(loadCollapsed('nope').size).toBe(0);
});

test('non-string entries are dropped', () => {
  localStorage.setItem('simplest-fuckn-todo:collapsed:b1', '["l1",7,null]');
  expect([...loadCollapsed('b1')]).toEqual(['l1']);
});
