import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadErrorText } from './uploadErrors.js';

test('spreadsheet schema errors have a row and no field', () => {
  assert.equal(uploadErrorText({ row: 4, error: 'address.city is required', data: {} }), 'Row 4 — address.city is required');
});

test('OCR errors name the file instead of a row', () => {
  assert.equal(uploadErrorText({ file: 'aadhaar.png', error: 'dob must be a date', extracted: {} }), 'aadhaar.png — dob must be a date');
});

test('older shapes keep their field and reason', () => {
  assert.equal(uploadErrorText({ row: 2, field: 'email', error: 'invalid' }), 'Row 2 — email: invalid');
  assert.equal(uploadErrorText({ row: 0, reason: 'duplicate' }), 'Row 0 — duplicate');
  assert.equal(uploadErrorText('plain'), 'plain');
  assert.equal(uploadErrorText(null), 'Unknown error');
});
