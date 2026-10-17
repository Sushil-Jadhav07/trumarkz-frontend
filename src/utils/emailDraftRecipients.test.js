import test from 'node:test';
import assert from 'node:assert/strict';
import { emailRecipientBatchOptions, recipientReportUrl } from './emailDraftRecipients.js';

test('Super Admin grouped batches retain their organization and exact batch ID', () => {
  assert.deepEqual(emailRecipientBatchOptions([{ organization_name: 'Acme', org_id: 'org-1', batches: [
    { batch_id: 'batch-1', batch_name: 'October batch' },
    { id: 'batch-2', name: 'Another batch' },
  ] }]), [
    { value: 'batch-1', label: 'October batch · Acme' },
    { value: 'batch-2', label: 'Another batch · Acme' },
  ]);
});

test('flat batch responses work and duplicate/missing IDs do not become ambiguous choices', () => {
  const rows = [{ id: 'one', batch_name: 'First' }, { id: 'one', batch_name: 'Duplicate' }, { name: 'No ID' }];
  for (const response of [rows, { batches: rows }, { items: rows }]) {
    assert.deepEqual(emailRecipientBatchOptions(response), [{ value: 'one', label: 'First' }]);
  }
  assert.deepEqual(emailRecipientBatchOptions(null), []);
});

test('report links preserve signed URLs without rewriting their query parameters', () => {
  const url = 'https://reports.example.test/report.pdf?signature=a%2Bb%2Fc&expires=123';
  assert.equal(recipientReportUrl(url), url);
  assert.equal(recipientReportUrl('/reports/report.pdf'), '/reports/report.pdf');
});

test('missing reports and non-browser URL schemes do not become clickable links', () => {
  for (const url of [undefined, null, '', 'javascript:alert(1)', 'data:text/html,test', 'gs://private/report.pdf', '//example.test/report']) {
    assert.equal(recipientReportUrl(url), null);
  }
});
