import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptySchemaConfigForm, schemaConfigJsonToForm, duplicateLabelError, HUMAN_SCHEMA_VARIANT,
  schemaConfigBlockingErrors, schemaConfigMappingWarnings, classifyJsonBox, exampleRecordJson,
  buildSchemaConfigPayload, configToForm, setInputMapping, rowsToMap,
} from './schemaConfig.js';

// SchemaConfigUpsertRequest, as published by the live API's /openapi.json.
const UPSERT_FIELDS = ['space_type', 'schema_variant', 'schema_id', 'space_id', 'label', 'local_fields', 'input_map', 'output_map', 'is_default'];
const UPSERT_REQUIRED = ['space_type', 'schema_id', 'space_id', 'label'];
const LOCAL_FIELD_KEYS = ['name', 'type', 'required', 'description', 'aliases'];

const assertMatchesUpsertContract = (payload) => {
  for (const key of Object.keys(payload)) assert.ok(UPSERT_FIELDS.includes(key), `"${key}" is not in SchemaConfigUpsertRequest`);
  for (const key of UPSERT_REQUIRED) assert.equal(typeof payload[key], 'string', key);
  assert.equal(typeof payload.is_default, 'boolean');
  for (const map of [payload.input_map, payload.output_map]) {
    assert.equal(Object.getPrototypeOf(map), Object.prototype);
    for (const v of Object.values(map)) assert.equal(typeof v, 'string');
  }
  assert.ok(Array.isArray(payload.local_fields));
  for (const f of payload.local_fields) {
    for (const key of Object.keys(f)) assert.ok(LOCAL_FIELD_KEYS.includes(key), key);
    assert.equal(typeof f.name, 'string');
  }
};

const human = (extra = {}) => ({ ...emptySchemaConfigForm('human'), label: 'L', schema_id: 's', space_id: 'p', ...extra });

test('the old "input_map is required" error is gone: an empty config is valid and only warns', () => {
  const form = human();
  assert.deepEqual(schemaConfigBlockingErrors(form), []);
  assert.equal(schemaConfigMappingWarnings(form).length, 3);
  assert.ok(schemaConfigMappingWarnings(form).every((w) => !/required to register/.test(w)));
  assert.deepEqual(schemaConfigMappingWarnings(emptySchemaConfigForm('product')), []);
  assertMatchesUpsertContract(buildSchemaConfigPayload(form));
});

test('only what the API rejects with a 400 blocks: an input_map key outside the semantic fields', () => {
  const form = human({ input_map: [{ key: 'full_name', value: 'Emp Name' }, { key: 'salary', value: 'CTC' }] });
  assert.match(schemaConfigBlockingErrors(form)[0], /"salary".*accepts only/);
  assert.equal(schemaConfigMappingWarnings(form).length, 2, 'warnings stay separate from the blocking error');
});

test('the box tells a sample record from a configuration JSON', () => {
  assert.equal(classifyJsonBox('').kind, 'empty');
  assert.equal(classifyJsonBox('   ').kind, 'empty');
  assert.equal(classifyJsonBox('{"input_map": {"full_name": "Name"}}').kind, 'config');
  assert.equal(classifyJsonBox('{"config": {"label": "x"}, "warnings": []}').kind, 'config');
  // A record that happens to use a config-like key is still a record.
  assert.equal(classifyJsonBox('{"label": "Shipping", "weight_kg": 4}').kind, 'sample');
  assert.equal(classifyJsonBox('{"input_map": "x", "Emp Name": "A"}').kind, 'sample');
  assert.equal(classifyJsonBox('{}').kind, 'sample');
  assert.equal(classifyJsonBox('{"a": 1,}').kind, 'invalid');
  assert.equal(classifyJsonBox('7').kind, 'invalid');
  const sample = classifyJsonBox('{"Emp Name": "A", "contact": {"email": "a@x.in"}}');
  assert.deepEqual(sample.discovery.mappableKeys, ['Emp Name']);
});

test('a source field picked from a sample reaches the payload byte-for-byte; nothing is guessed', () => {
  const box = classifyJsonBox('{" Emp Name ": "A", "Work.Email": "a@x.in", "DOB": "1990-01-01"}');
  let rows = [];
  rows = setInputMapping(rows, 'full_name', box.discovery.mappableKeys[0]);
  rows = setInputMapping(rows, 'email', box.discovery.mappableKeys[1]);
  const payload = buildSchemaConfigPayload(human({ input_map: rows }));
  assert.deepEqual(payload.input_map, { full_name: ' Emp Name ', email: 'Work.Email' });
  assert.deepEqual(payload.output_map, {}, 'no Dhiway output names are generated from a sample');
  assert.deepEqual(payload.local_fields, [], 'no local fields are generated from a sample');
  assertMatchesUpsertContract(payload);
});

test('setInputMapping replaces or clears one field and leaves the rest alone', () => {
  const rows = [{ key: 'full_name', value: 'A' }, { key: 'email', value: 'B' }];
  assert.deepEqual(rowsToMap(setInputMapping(rows, 'full_name', 'C')), { email: 'B', full_name: 'C' });
  assert.deepEqual(rowsToMap(setInputMapping(rows, 'email', '')), { full_name: 'A' });
});

test('editing round-trips the API response: a new version keeps every mapping it was not asked to change', () => {
  const response = {
    id: 'cfg-1', org_id: 'org-1', space_type: 'human', schema_variant: 'human_5qr', schema_id: 's', space_id: 'p',
    label: 'Acme', version: 3, is_active: true, is_default: true, previous_version_id: 'cfg-0',
    created_by: 'u', created_by_role: 'organization', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
    local_fields: [{ name: 'employee_name', type: 'string', required: true, description: 'Full name', aliases: ['Emp Name'] }],
    input_map: { full_name: 'employee_name', email: 'work_email' },
    output_map: { full_name: 'Name', email: 'Email Address' },
  };
  const form = configToForm(response);
  const unchanged = buildSchemaConfigPayload(form);
  assertMatchesUpsertContract(unchanged);
  assert.deepEqual(unchanged.input_map, response.input_map);
  assert.deepEqual(unchanged.output_map, response.output_map);
  assert.deepEqual(unchanged.local_fields, response.local_fields);
  assert.equal(unchanged.is_default, true);
  assert.equal(unchanged.schema_variant, HUMAN_SCHEMA_VARIANT);

  // Mapping dob from a pasted sample changes only input_map.dob.
  const box = classifyJsonBox('{"Birth Date": "1990-01-01"}');
  const edited = buildSchemaConfigPayload({ ...form, input_map: setInputMapping(form.input_map, 'dob', box.discovery.mappableKeys[0]) });
  assert.deepEqual(edited.input_map, { ...response.input_map, dob: 'Birth Date' });
  assert.deepEqual(edited.output_map, response.output_map);
  assert.deepEqual(edited.local_fields, response.local_fields);
});

test('product and warranty payloads carry no schema_variant', () => {
  for (const type of ['product', 'warranty']) {
    const payload = buildSchemaConfigPayload({ ...emptySchemaConfigForm(type), label: 'L', schema_id: 's', space_id: 'p' });
    assert.equal('schema_variant' in payload, false);
    assertMatchesUpsertContract(payload);
  }
});

test('every inserted example is a sample record, not a configuration', () => {
  for (const type of ['human', 'product', 'warranty']) {
    const box = classifyJsonBox(exampleRecordJson(type));
    assert.equal(box.kind, 'sample', type);
    assert.ok(box.discovery.mappableKeys.length > 0, type);
  }
});

test('duplicate active labels are caught case-insensitively, per space_type, but not against the config being versioned', () => {
  const configs = [
    { id: 'a', label: 'Default Human Schema', space_type: 'human', is_active: true },
    { id: 'b', label: 'Old One', space_type: 'human', is_active: false },
    { id: 'c', label: 'Products', space_type: 'product', is_active: true },
  ];
  assert.match(duplicateLabelError(' default human schema ', 'human', configs), /already exists/);
  assert.equal(duplicateLabelError('Default Human Schema', 'human', configs, 'a'), '');
  assert.equal(duplicateLabelError('old one', 'human', configs), '');
  assert.equal(duplicateLabelError('Products', 'human', configs), '');
});

test('bad local field types in a pasted configuration are reported', () => {
  const bad = schemaConfigJsonToForm('{"local_fields": [{"name": "x", "type": "text"}, {"type": "string"}]}', emptySchemaConfigForm());
  assert.equal(bad.errors.length, 2);
});

test('a new human form defaults to the 5-QR variant', () => {
  assert.equal(emptySchemaConfigForm('human').schema_variant, HUMAN_SCHEMA_VARIANT);
  assert.equal(emptySchemaConfigForm('product').schema_variant, '');
});

test('pasted API-shaped JSON fills every field, maps become rows', () => {
  const json = JSON.stringify({
    space_type: 'human',
    schema_variant: 'legacy',
    label: ' Acme ',
    schema_id: 's1',
    space_id: 'sp1',
    local_fields: [{ name: 'employee_name', type: 'string', aliases: ['Emp Name', 'Name'] }, 'dept'],
    input_map: { full_name: 'employee_name' },
    output_map: [{ key: 'full_name', value: 'Name' }],
    is_default: true,
  });
  const { form, errors } = schemaConfigJsonToForm(json, emptySchemaConfigForm('human'));
  assert.equal(errors, undefined);
  assert.equal(form.label, 'Acme');
  assert.equal(form.schema_variant, HUMAN_SCHEMA_VARIANT);
  assert.deepEqual(form.local_fields.map((f) => [f.name, f.aliasesText]), [['employee_name', 'Emp Name, Name'], ['dept', '']]);
  assert.deepEqual(form.input_map, [{ key: 'full_name', value: 'employee_name' }]);
  assert.deepEqual(form.output_map, [{ key: 'full_name', value: 'Name' }]);
  assert.equal(form.is_default, true);
});

test('missing keys keep the current form values; a {config} wrapper is unwrapped', () => {
  const current = { ...emptySchemaConfigForm('product'), label: 'Kept', schema_id: 'old' };
  const { form } = schemaConfigJsonToForm('{"config": {"schema_id": "new"}}', current);
  assert.equal(form.label, 'Kept');
  assert.equal(form.schema_id, 'new');
  assert.equal(form.space_type, 'product');
});

test('bad input is reported, not applied', () => {
  assert.match(schemaConfigJsonToForm('{oops', emptySchemaConfigForm()).errors[0], /Not valid JSON/);
  assert.match(schemaConfigJsonToForm('[1,2]', emptySchemaConfigForm()).errors[0], /single JSON object/);
  assert.match(schemaConfigJsonToForm('{"space_type": "vehicle"}', emptySchemaConfigForm()).errors[0], /space_type/);
  const locked = schemaConfigJsonToForm('{"space_type": "product"}', emptySchemaConfigForm('human'), { lockSpaceType: true });
  assert.match(locked.errors[0], /cannot be changed/);
});
