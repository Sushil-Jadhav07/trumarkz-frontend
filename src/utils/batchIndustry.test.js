import test from 'node:test';
import assert from 'node:assert/strict';
import { getBatchIndustry, setBatchIndustry } from './batchIndustry.js';

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
};

test('remembers the pick per user and clears it', () => {
  const s = memory();
  setBatchIndustry('u1', 'Logistics', s);
  assert.equal(getBatchIndustry('u1', s), 'Logistics');
  assert.equal(getBatchIndustry('u2', s), '');
  setBatchIndustry('u1', '', s);
  assert.equal(getBatchIndustry('u1', s), '');
});

test('blocked storage never throws', () => {
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  assert.equal(getBatchIndustry('u1', broken), '');
  assert.doesNotThrow(() => setBatchIndustry('u1', 'IT', broken));
});
