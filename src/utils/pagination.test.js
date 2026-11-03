import test from 'node:test';
import assert from 'node:assert/strict';
import { pageItems, pageRange } from './pagination.js';

test('short lists show every page; long lists collapse with ellipses around the current page', () => {
  assert.deepEqual(pageItems(1, 2), [1, 2]);
  assert.deepEqual(pageItems(1, 10), [1, 2, 3, 4, 5, '…', 10]);
  assert.deepEqual(pageItems(5, 10), [1, '…', 4, 5, 6, '…', 10]);
  assert.deepEqual(pageItems(10, 10), [1, '…', 6, 7, 8, 9, 10]);
});

test('range text bounds match the page', () => {
  assert.deepEqual(pageRange(1, 10, 17), { from: 1, to: 10 });
  assert.deepEqual(pageRange(2, 10, 17), { from: 11, to: 17 });
  assert.deepEqual(pageRange(1, 10, 0), { from: 0, to: 0 });
});
