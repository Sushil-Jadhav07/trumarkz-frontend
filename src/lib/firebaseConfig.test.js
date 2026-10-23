import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFirebaseConfig } from './firebaseConfig.js';

// Unit-test-only config; never used to initialize Firebase or contact a server.
const env = {
  VITE_FIREBASE_API_KEY: 'unit-test-api-key', VITE_FIREBASE_PROJECT_ID: 'unit-test-project',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789', VITE_FIREBASE_APP_ID: 'unit-test-app',
  VITE_FIREBASE_VAPID_PUBLIC_KEY: 'unit-test-public-vapid',
};

test('VAPID alone does not configure Firebase and names the missing fields', () => {
  const status = resolveFirebaseConfig({ VITE_FIREBASE_VAPID_PUBLIC_KEY: env.VITE_FIREBASE_VAPID_PUBLIC_KEY });
  assert.equal(status.configured, false);
  assert.equal(status.reason, 'firebase_web_config_missing');
  assert.deepEqual(status.missingFields, ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID']);
});

test('FCM config accepts public required fields and optional auth/storage fields', () => {
  assert.equal(resolveFirebaseConfig(env).configured, true);
  const full = resolveFirebaseConfig({ ...env, VITE_FIREBASE_AUTH_DOMAIN: 'unit-test.invalid', VITE_FIREBASE_STORAGE_BUCKET: 'unit-test-bucket' });
  assert.equal(full.config.authDomain, 'unit-test.invalid');
  assert.equal(full.config.storageBucket, 'unit-test-bucket');
  assert.equal(resolveFirebaseConfig({ ...env, VITE_FIREBASE_VAPID_PUBLIC_KEY: '' }).reason, 'vapid_key_missing');
});

test('reuse supplied app options rather than mixing projects; reject blank/template values', () => {
  const existing = { apiKey: 'existing-key', projectId: 'existing-project', messagingSenderId: '987654321', appId: 'existing-app' };
  assert.deepEqual(resolveFirebaseConfig(env, existing).config, existing);
  for (const value of ['', ' ', '<your key>', 'your-api-key', 'undefined', 'dummy-value']) {
    assert.equal(resolveFirebaseConfig({ ...env, VITE_FIREBASE_API_KEY: value }).configured, false);
  }
});

test('only explicitly allowlisted public fields can reach the worker config', () => {
  const result = resolveFirebaseConfig({ ...env, UNRELATED_SECRET: 'never-include' });
  assert.deepEqual(Object.keys(result.config).sort(), ['apiKey', 'appId', 'messagingSenderId', 'projectId']);
  assert.equal(JSON.stringify(result.config).includes('never-include'), false);
});
