import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverRecordFields, parseJsonOrdered, formatJsonPath } from './jsonRecord.js';

const paths = (text) => discoverRecordFields(text).fields.map((f) => f.path);

test('an ordinary record needs no input_map, local_fields or full_name/email/dob', () => {
  const d = discoverRecordFields('{"Emp Name": "Arjun", "Work Email": "a@x.in", "Joined": 2021}');
  assert.equal(d.error, undefined);
  assert.equal(d.records, 1);
  assert.deepEqual(d.mappableKeys, ['Emp Name', 'Work Email', 'Joined']);
});

test('nested objects, arrays, nulls and empty containers are all listed with their types', () => {
  const d = discoverRecordFields(JSON.stringify({
    person: { name: 'A', contact: { email: 'a@x.in', phones: ['1', 2] } },
    tags: [],
    meta: {},
    middle_name: null,
    history: [{ org: 'X', years: 2 }, { org: 'Y', remote: true }],
  }));
  const byPath = Object.fromEntries(d.fields.map((f) => [f.path, f]));
  assert.deepEqual(byPath['$.person.contact.phones[]'].types, ['string', 'number']);
  assert.deepEqual(byPath['$.tags'].types, ['empty array']);
  assert.deepEqual(byPath['$.meta'].types, ['empty object']);
  assert.deepEqual(byPath['$.middle_name'].types, ['null']);
  assert.equal(byPath['$.middle_name'].mappable, true);
  assert.ok(byPath['$.history[].remote'], 'a key only some array items have is still listed');
  assert.equal(byPath['$.history[].org'].example, 'X');
  assert.equal(byPath['$.person.contact.email'].mappable, false);
  assert.equal(byPath['$.person.contact.email'].note, 'nested');
  assert.equal(byPath['$.person'].note, 'holds an object or array');
  assert.deepEqual(d.mappableKeys, ['middle_name']);
});

test('unusual keys are kept exactly — spaces, dots, unicode, symbols, padding and the empty key', () => {
  const text = '{" Name ": 1, "a.b": 2, "नाम": 3, "%$#": 4, "": 5, "first name": 6}';
  assert.deepEqual(discoverRecordFields(text).mappableKeys, [' Name ', 'a.b', 'नाम', '%$#', 'first name']);
  assert.deepEqual(paths(text), ['$[" Name "]', '$["a.b"]', '$["नाम"]', '$["%$#"]', '$[""]', '$["first name"]']);
  assert.equal(discoverRecordFields(text).fields.find((f) => f.path === '$[""]').note, 'empty field name');
});

test('source order is kept, including integer-like keys JSON.parse would move to the front', () => {
  assert.deepEqual(discoverRecordFields('{"b": 1, "10": 2, "a": 3, "2": 4}').mappableKeys, ['b', '10', 'a', '2']);
});

test('duplicate keys are reported instead of silently keeping the last one', () => {
  const d = discoverRecordFields('{"email": "a@x.in", "name": "A", "email": "b@x.in"}');
  assert.deepEqual(d.duplicates, ['$.email']);
  assert.deepEqual(d.mappableKeys, ['email', 'name']);
});

test('a top-level array of records is read record by record', () => {
  const d = discoverRecordFields('[{"Name": "A"}, {"Name": "B", "DOB": "1990-01-01"}]');
  assert.equal(d.records, 2);
  assert.deepEqual(d.mappableKeys, ['Name', 'DOB']);
});

test('invalid or non-record input gives a clear error', () => {
  assert.throws(() => discoverRecordFields('{"a": 1,}'), SyntaxError);
  assert.throws(() => discoverRecordFields('{a: 1}'), SyntaxError);
  assert.match(discoverRecordFields('42').error, /record object/);
  assert.match(discoverRecordFields('"text"').error, /record object/);
  assert.match(discoverRecordFields('null').error, /record object/);
  assert.match(discoverRecordFields('[]').error, /empty/);
  assert.match(discoverRecordFields('[1, 2]').error, /must contain record objects/);
});

test('escaped strings and numbers parse exactly as JSON.parse does', () => {
  const { root } = parseJsonOrdered('{"q\\"uote": "line\\nbreak \\u00e9", "n": -1.5e3, "t": true, "f": false}');
  assert.deepEqual(root.entries.map(([k, v]) => [k, v.value]), [['q"uote', 'line\nbreak é'], ['n', -1500], ['t', true], ['f', false]]);
  assert.equal(formatJsonPath(['q"uote']), '$["q\\"uote"]');
});
