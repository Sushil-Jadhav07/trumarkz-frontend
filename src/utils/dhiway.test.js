import test from 'node:test';
import assert from 'node:assert/strict';
import { batchSdcSpaceId, resolveDhiwaySpaceId, mergeSchemaConfigSpaces } from './dhiway.js';

const cfg = (extra) => ({ is_active: true, is_default: false, space_type: 'human', space_id: 'sp-1', schema_id: 'sc-1', ...extra });

test('a schema configuration\'s space and schema are added to Dhiway Spaces once', () => {
  const { rows, changed } = mergeSchemaConfigSpaces([], [cfg({ is_default: true }), cfg({ label: 'second, same ids' })]);
  assert.equal(changed, true);
  assert.deepEqual(rows, [{ space_id: 'sp-1', schema_id: 'sc-1', space_type: 'human', default: true }]);
  assert.equal(mergeSchemaConfigSpaces(rows, [cfg({ is_default: true })]).changed, false, 'already there — nothing to do');
});

test('existing rows are kept; a new type gets its own row; the default config becomes that type\'s default', () => {
  const existing = [{ space_id: 'old', schema_id: 'old-s', space_type: 'human', default: true }, { space_id: 'p', schema_id: 'p-s', space_type: 'product', default: true }];
  const { rows } = mergeSchemaConfigSpaces(existing, [cfg({ is_default: true }), cfg({ space_type: 'warranty', space_id: 'w', schema_id: 'w-s' })]);
  assert.deepEqual(rows.map((r) => [r.space_type, r.space_id, r.default]), [
    ['human', 'old', false], ['product', 'p', true], ['human', 'sp-1', true], ['warranty', 'w', true],
  ]);
  const notDefault = mergeSchemaConfigSpaces(existing, [cfg()]).rows;
  assert.equal(notDefault.find((r) => r.space_id === 'old').default, true, 'a non-default config never steals the default');
  assert.equal(notDefault.find((r) => r.space_id === 'sp-1').default, false);
});

test('deactivated or incomplete configs are never added', () => {
  const { rows, changed } = mergeSchemaConfigSpaces([], [cfg({ is_active: false }), cfg({ space_id: '' }), cfg({ space_type: 'vehicle' })]);
  assert.equal(changed, false);
  assert.deepEqual(rows, []);
});

test('a batch uses the space it recorded, then its frozen schema configuration, and only then the legacy list', () => {
  const legacy = resolveDhiwaySpaceId([{ space_id: 'legacy-space', default: true }], 'human');
  assert.equal(batchSdcSpaceId({ space_id: 'issued-space', resolved_template: { space_id: 'schema-space' } }, legacy), 'issued-space');
  assert.equal(batchSdcSpaceId({ resolved_template: { space_id: 'schema-space' } }, legacy), 'schema-space');
  assert.equal(batchSdcSpaceId({}, legacy), 'legacy-space');
  assert.equal(batchSdcSpaceId(null, legacy), 'legacy-space');
});

test('an org set up only through a Schema Configuration still resolves its space', () => {
  const noLegacyRows = resolveDhiwaySpaceId([], 'human');
  assert.equal(noLegacyRows, '');
  assert.equal(batchSdcSpaceId({ resolved_template: { space_id: 'fca1f91b1-88a0-4459-9e22-9bb2289c05da' } }, noLegacyRows), 'fca1f91b1-88a0-4459-9e22-9bb2289c05da');
  assert.equal(batchSdcSpaceId(undefined, noLegacyRows), '');
});
