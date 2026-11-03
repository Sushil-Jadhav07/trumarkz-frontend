import test from 'node:test';
import assert from 'node:assert/strict';
import { matchProfileIndustry, profileIndustries } from './industry.js';

const list = [
  { id: 'healthcare', name: 'Healthcare' }, { id: 'logistics', name: 'Logistics' }, { id: 'real_estate', name: 'Real Estate' },
];

test('matches the onboarding industry by name or id, from a string or a list', () => {
  assert.equal(matchProfileIndustry('Logistics', list).id, 'logistics');
  assert.equal(matchProfileIndustry(['  logistics '], list).id, 'logistics');
  assert.equal(matchProfileIndustry(['Nope', 'Real Estate'], list).id, 'real_estate');
  assert.equal(matchProfileIndustry('real-estate', list).id, 'real_estate');
});

test('no usable onboarding industry means no match, so the picker is shown', () => {
  assert.equal(matchProfileIndustry(undefined, list), null);
  assert.equal(matchProfileIndustry([], list), null);
  assert.equal(matchProfileIndustry('Mining', list), null);
  assert.deepEqual(profileIndustries([null, ' ', 'IT']), ['IT']);
});
