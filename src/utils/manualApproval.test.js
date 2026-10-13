import test from 'node:test';
import assert from 'node:assert/strict';
import { filterManualDecisions, manualApprovalEligibleIds, manualReviewStatus, stagedManualApprovalUsers, successfulManualUploadCount } from './manualApproval.js';

const users = [
  { batch_user_id: 'first', file_index: 0, status: 'pending' },
  { batch_user_id: 'untagged', file_index: null, status: 'pending', report_url: '/someone-elses-report' },
  { batch_user_id: 'decided', file_index: 1, status: 'rejected' },
];
const decisions = {
  first: { status: 'approved' }, untagged: { status: 'approved' },
  decided: { status: 'approved' }, reject: { status: 'rejected', reason: 'Invalid record' },
};

test('mixed reports approve only pending users with their own index, including zero', () => {
  assert.deepEqual([...manualApprovalEligibleIds({ used: true, users })], ['first']);
  // Individual and bulk staging both enter this same submission filter.
  assert.deepEqual(filterManualDecisions(decisions, { used: true, users }), ['first', 'reject']);
});

test('unused, stale, or missing confirmation blocks all approvals while preserving rejections', () => {
  for (const info of [null, { used: false, users }, { used: 'true', users }]) {
    assert.deepEqual(filterManualDecisions(decisions, info), ['reject']);
  }
});

test('HTTP success with zero matched files cannot authorize approvals', () => {
  for (const upload of [null, { files_uploaded: 0, used: false },
    { files_uploaded: 0, file_results: [{ status: 'uploaded' }] },
    { files_uploaded: 2, file_results: [{ status: 'unmatched' }, { status: 'failed' }] }]) {
    assert.deepEqual(filterManualDecisions(decisions, { used: true, users },
      { uploadAttempted: true, upload }), ['reject']);
  }
});

test('a partial successful upload still uses fresh server associations rather than staged IDs', () => {
  assert.deepEqual(filterManualDecisions(decisions, { used: true, users }, {
    uploadAttempted: true,
    upload: { files_uploaded: 1, file_results: [{ status: 'uploaded' }, { status: 'unmatched' }] },
  }), ['first', 'reject']);
});

test('shared reports require confirmed success and a used request', () => {
  const sharedUsers = users.map((user) => ({ ...user, file_index: null, report_url: null }));
  const info = { used: true, users: sharedUsers };
  assert.deepEqual([...manualApprovalEligibleIds(info)], []);
  assert.deepEqual([...manualApprovalEligibleIds(info, {
    uploadAttempted: true, upload: { files_uploaded: 1 },
  })], ['first', 'untagged']);
  assert.deepEqual([...manualApprovalEligibleIds({ ...info, used: false }, {
    uploadAttempted: true, upload: { files_uploaded: 1 },
  })], []);
  sharedUsers[0].report_url = '/shared-report.pdf';
  assert.deepEqual([...manualApprovalEligibleIds(info)], ['first', 'untagged']);
});

test('file results confirm successful uploads when the count is omitted', () => {
  assert.equal(successfulManualUploadCount({ file_results: [{ status: 'uploaded' }, { status: 'unmatched' }] }), 1);
  assert.equal(successfulManualUploadCount({ used: false, files_uploaded: 1 }), 0);
});

test('bulk approval includes every reviewable staged row, regardless of its upload workflow status', () => {
  const workflowUsers = ['not_uploaded', 'uploaded', 'Pending', 'in_progress', 'awaiting_review', null, 'APPROVED', 'rejected']
    .map((status, i) => ({ batch_user_id: `user-${i}`, status, file_index: null }));
  const pendingFiles = Object.fromEntries(workflowUsers.map(u => [u.batch_user_id, { name: 'report.pdf' }]));
  const eligible = stagedManualApprovalUsers({ used: false, users: workflowUsers }, pendingFiles);
  assert.deepEqual(eligible.map(u => u.batch_user_id), ['user-0', 'user-1', 'user-2', 'user-3', 'user-4', 'user-5']);
  assert.equal(workflowUsers.filter(u => manualReviewStatus(u) === 'pending').length, 6);
  assert.deepEqual(stagedManualApprovalUsers({ used: false, users: workflowUsers }), []);
  workflowUsers.forEach((u, i) => { u.file_index = i; });
  assert.deepEqual([...manualApprovalEligibleIds({ used: true, users: workflowUsers })], eligible.map(u => u.batch_user_id));
});

test('staging excludes unmatched rows and never authorizes a server approval', () => {
  const info = { used: false, users: [
    { batch_user_id: 'matched', status: 'not_uploaded', file_index: null },
    { batch_user_id: 'unmatched', status: 'not_uploaded', file_index: null },
  ] };
  assert.deepEqual(stagedManualApprovalUsers(info, { matched: { name: 'AS-01.pdf' } }).map(u => u.batch_user_id), ['matched']);
  assert.deepEqual([...manualApprovalEligibleIds(info)], []);
});
