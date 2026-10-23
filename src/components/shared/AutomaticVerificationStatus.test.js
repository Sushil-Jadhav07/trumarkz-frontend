import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { build } from 'esbuild';
import { canRetryAutomatic } from '../../utils/automaticVerification.js';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const result = await build({
  entryPoints: [fileURLToPath(new URL('./AutomaticVerificationStatus.jsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], alias: { '@': fileURLToPath(new URL('../../', import.meta.url)) },
  plugins: [{ name: 'test-auth', setup(builder) {
    builder.onResolve({ filter: /^@\/context\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const useAuth = () => ({ user: { role: globalThis.testRole } });' }));
  } }],
});
const module = { exports: {} };
const context = vm.createContext({ module, exports: module.exports, require, testRole: 'super-admin' });
vm.runInContext(result.outputFiles[0].text, context);
const { AutomaticVerificationStatus } = module.exports;
const batch = { batch_type: 'human', credential_visibility: 'private' };
const render = ({ status = 'pending', report_url = null, label = 'automatic', consent_status = 'accepted', role = 'super-admin', waiting = false, busy = false, batchType = 'human' } = {}) => {
  context.testRole = role;
  const record = { consent_status, verification_type_status: { licence: { label, status, report_url } } };
  const currentBatch = { ...batch, batch_type: batchType };
  return renderToStaticMarkup(React.createElement(AutomaticVerificationStatus, { state: { record, batch: currentBatch, canRetry: canRetryAutomatic(record, currentBatch), checking: false, waiting, busy, message: '', retry() {}, refresh() {} } }));
};
const retryButton = (html) => html.match(/<button[^>]*>[\s\S]*?(?:Retry Automatic Verification|Verification in progress…|Scheduling…)[\s\S]*?<\/button>/)?.[0];

test('Super Admin sees an active retry for a single automatic missing/failed report', () => {
  for (const status of ['pending', 'failed', 'error']) {
    const button = retryButton(render({ status }));
    assert.ok(button); assert.doesNotMatch(button, / disabled=/);
  }
});
test('approved or rejected automatic verification keeps a visible disabled retry, even without a report', () => {
  for (const status of ['approved', 'rejected']) {
    const html = render({ status });
    assert.match(retryButton(html), / disabled=/);
    assert.match(html, /final decision/);
  }
});
test('existing report, consent gate, scheduling and in-progress disable the action', () => {
  for (const props of [{ report_url: 'report.pdf' }, { status: 'failed', report_url: 'report.pdf' }, { consent_status: 'pending' }, { consent_status: 'rejected' }, { waiting: true }, { busy: true }]) {
    assert.match(retryButton(render(props)), / disabled=/);
  }
});
test('manual-only, organization, Product and Warranty do not expose retry', () => {
  for (const props of [{ label: 'manual' }, { role: 'organization' }, { batchType: 'product' }, { batchType: 'warranty' }]) assert.equal(retryButton(render(props)), undefined);
});
