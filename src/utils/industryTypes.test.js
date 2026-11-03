import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FALLBACK_INDUSTRIES, industryEntityForCategory, industrySelectOptions, industrySlug,
  parseIndustryTypes, splitIndustryTags, validateIndustryName, withCurrentIndustry,
} from './industryTypes.js';

const row = (name, extra = {}) => ({ id: `id-${name}`, name, entity_type: 'human', is_active: true, ...extra });

test('keeps only active rows of the requested list and slugs the names', () => {
  const out = parseIndustryTypes([row('Real Estate'), row('Aviation', { is_active: false })], 'human');
  assert.deepEqual(out.map((i) => [i.id, i.name, i.backendId]), [['real_estate', 'Real Estate', 'id-Real Estate']]);
  assert.equal(parseIndustryTypes([row('Aviation', { is_active: false })], 'human', { includeInactive: true })[0].isActive, false);
});

test('a backend that ignores entity_type is treated as unsupported, not as that list', () => {
  const old = [{ id: '1', name: 'Electronics & Appliances', warranty_support: true }];
  assert.equal(parseIndustryTypes(old, 'human'), null);
  assert.equal(parseIndustryTypes([row('Healthcare', { entity_type: 'product' })], 'human'), null);
  assert.equal(parseIndustryTypes({ detail: 'x' }, 'human'), null);
  assert.deepEqual(parseIndustryTypes([], 'human'), []);
});

test('Product fallback uses the valid backend name, not "Electronics"', () => {
  assert.ok(FALLBACK_INDUSTRIES.product.some((i) => i.name === 'Electronics & Appliances'));
  assert.ok(!FALLBACK_INDUSTRIES.product.some((i) => i.name === 'Electronics'));
  assert.equal(industrySlug('Beauty & Cosmetics'), 'beauty_cosmetics');
});

test('a saved value outside the list stays selectable exactly once', () => {
  assert.deepEqual(withCurrentIndustry(['A', 'B'], 'Transport & Logistics'), ['A', 'B', 'Transport & Logistics']);
  assert.deepEqual(withCurrentIndustry(['A', 'B'], ' b '), ['A', 'B']);
  assert.deepEqual(withCurrentIndustry(['A'], ''), ['A']);
  assert.deepEqual(industrySelectOptions(['A'], 'Z'), [{ value: 'A', label: 'A' }, { value: 'Z', label: 'Z' }]);
});

test('a verification type category picks its industry list', () => {
  assert.equal(industryEntityForCategory('human'), 'human');
  assert.equal(industryEntityForCategory('product'), 'product');
  assert.equal(industryEntityForCategory('warranty'), 'product');
});

test('tags split from a string or a list', () => {
  assert.deepEqual(splitIndustryTags('IT, Logistics ,'), ['IT', 'Logistics']);
  assert.deepEqual(splitIndustryTags([' IT ', '']), ['IT']);
  assert.deepEqual(splitIndustryTags(undefined), []);
});

test('industry names follow the backend rules', () => {
  assert.equal(validateIndustryName('Aviation'), '');
  assert.match(validateIndustryName('  '), /Enter/);
  assert.match(validateIndustryName('A, B'), /Commas/);
  assert.match(validateIndustryName('x'.repeat(101)), /100/);
});
