import test from 'node:test';
import assert from 'node:assert/strict';
import { createPushRegistration } from './pushRegistration.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { resolve, promise }; };
const fixture = (overrides = {}) => {
  const calls = [];
  const saved = new Map();
  let auth = 'session-a';
  let status = { supported: true, configured: true, permission: 'granted', reason: null };
  let receiver;
  const client = {
    getStatus: async () => status,
    requestPermission: async () => { calls.push('prompt'); status = { ...status, permission: 'granted' }; return 'granted'; },
    getToken: async () => { calls.push('token'); return 'fcm-unit-test-token'; },
    subscribe: async (fn) => { calls.push('subscribe'); receiver = fn; return () => calls.push('unsubscribe'); },
    deleteToken: async () => { calls.push('delete-sdk'); },
    ...overrides.client,
  };
  const api = {
    registerPushToken: async (token, options) => { calls.push(['register', token, options.expectedAccessToken]); return { data: { id: 'device-record', platform: 'web' } }; },
    removePushToken: async (token, options) => { calls.push(['remove', token, options.expectedAccessToken]); return { data: { removed: false } }; },
    ...overrides.api,
  };
  const service = createPushRegistration({ client, api, storage: () => ({ getItem: (key) => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) }), getAuthToken: () => auth });
  return { service, calls, saved, setAuth: (value) => { auth = value; }, setStatus: (value) => { status = { ...status, ...value }; }, receive: (value) => receiver?.(value) };
};

test('unconfigured/unsupported/default/denied sessions never prompt or request tokens on mount', async () => {
  for (const status of [{ configured: false, reason: 'firebase_web_config_missing' }, { supported: false }, { permission: 'default' }, { permission: 'denied' }]) {
    const f = fixture(); f.setStatus(status); f.service.start('owner-a'); await flush();
    assert.deepEqual(f.calls, []);
    assert.equal(f.service.getSnapshot().enabled, false);
    if (!status.configured && status.reason) { await f.service.enable(); assert.deepEqual(f.calls, []); }
  }
});

test('enable prompts only on a user action and registers only a real returned token', async () => {
  const f = fixture(); f.setStatus({ permission: 'default' });
  f.service.start('owner-a'); await flush();
  assert.deepEqual(f.calls, []);
  await f.service.enable();
  assert.equal(f.calls[0], 'prompt');
  assert.equal(f.calls.filter((call) => call[0] === 'register').length, 1);
  assert.equal(f.service.getSnapshot().enabled, true);
  assert.equal(JSON.stringify([...f.saved]).includes('session-a'), false);
});

test('granted session registers once, deduplicates focus refresh and handles only batch deletion', async () => {
  const f = fixture(); const received = [];
  f.service.start('owner-a', (payload) => received.push(payload)); await flush();
  await Promise.all([f.service.refresh(), f.service.refresh()]);
  assert.equal(f.calls.filter((call) => call[0] === 'register').length, 1);
  f.receive({ messageId: 'one', data: { notification_type: 'batch_deleted' } });
  f.receive({ messageId: 'one', data: { notification_type: 'batch_deleted' } });
  f.receive({ messageId: 'other', data: { notification_type: 'verification_complete' } });
  assert.equal(received.length, 1);
  await f.service.refresh(true);
  assert.equal(f.calls.filter((call) => call[0] === 'register').length, 2);
});

test('missing tokens and backend registration errors never produce Enabled', async () => {
  for (const overrides of [{ client: { getToken: async () => null } }, { api: { registerPushToken: async () => { throw { response: { status: 404 } }; } } }]) {
    const f = fixture(overrides); f.service.start('owner-a'); await flush();
    assert.equal(f.service.getSnapshot().enabled, false);
    assert.ok(f.service.getSnapshot().error);
    assert.equal(f.service.getSnapshot().loading, false);
  }
});

test('disable removes registration, persists opt-out and survives focus/reload without auto-enabling', async () => {
  const f = fixture(); const stop = f.service.start('owner-a'); await flush();
  await f.service.disable(); await f.service.refresh();
  assert.equal(f.service.getSnapshot().enabled, false);
  assert.equal(f.calls.filter((call) => call[0] === 'remove').length, 1);
  assert.equal(f.calls.filter((call) => call[0] === 'register').length, 1);
  stop();
  assert.equal(f.service.getSnapshot().owner, null, 'unmount also stops a session replaced by disable');
  f.service.start('owner-a'); await flush();
  assert.equal(f.calls.filter((call) => call[0] === 'register').length, 1);
  await f.service.enable();
  assert.equal(f.service.getSnapshot().enabled, true);
});

test('revoked permission clears enabled state and registration without re-prompting', async () => {
  const f = fixture(); f.service.start('owner-a'); await flush();
  f.setStatus({ permission: 'denied' }); await f.service.refresh(); await f.service.enable();
  assert.equal(f.service.getSnapshot().enabled, false);
  assert.equal(f.calls.includes('prompt'), false);
  assert.equal(f.calls.filter((call) => call[0] === 'remove').length, 1);
});

test('account switch drops late token generation and registers the new authenticated owner', async () => {
  const pending = deferred(); let count = 0;
  const f = fixture({ client: { getToken: async () => ++count === 1 ? pending.promise : 'second-owner-token' } });
  f.service.start('owner-a'); await flush();
  f.setAuth('session-b'); f.service.start('owner-b'); await flush();
  pending.resolve('old-owner-token'); await flush();
  const posts = f.calls.filter((call) => call[0] === 'register');
  assert.deepEqual(posts, [['register', 'second-owner-token', 'session-b']]);
  assert.equal(f.service.getSnapshot().owner, 'owner-b');
  assert.equal(f.service.getSnapshot().enabled, true);
});

test('logout removes the owned token with old auth, clears cache, and succeeds on cleanup failure', async () => {
  for (const fail of [false, true]) {
    const f = fixture(fail ? { api: { removePushToken: async () => { throw new Error('offline'); } } } : {});
    f.service.start('owner-a'); await flush();
    await f.service.cleanupOnLogout('owner-a');
    assert.equal(f.service.getSnapshot().enabled, false);
    assert.equal(f.saved.has('trumarkz_push_registration'), false);
    if (!fail) assert.deepEqual(f.calls.find((call) => call[0] === 'remove'), ['remove', 'fcm-unit-test-token', 'session-a']);
  }
});

test('logout cleans up an uncertain registration and ignores its late response', async () => {
  const pending = deferred();
  const f = fixture({ api: { registerPushToken: () => pending.promise } });
  f.service.start('owner-a'); await flush();
  await f.service.cleanupOnLogout('owner-a');
  pending.resolve({ data: { id: 'late-device', platform: 'web' } }); await flush();
  assert.equal(f.service.getSnapshot().enabled, false);
  assert.equal(f.saved.has('trumarkz_push_registration'), false);
  assert.equal(f.calls.filter((call) => call[0] === 'remove').length, 1);
});

test('unconfigured logout makes no API call and storage failures never block the app', async () => {
  const f = fixture(); f.setStatus({ configured: false });
  f.service.start('owner-a'); await flush(); await f.service.cleanupOnLogout('owner-a');
  assert.deepEqual(f.calls, []);
  const service = createPushRegistration({ client: { getStatus: async () => ({ supported: false, configured: false, permission: 'default' }) }, api: {}, storage: () => { throw new Error('blocked'); }, getAuthToken: () => 'test-session' });
  service.start('owner'); await flush(); await service.cleanupOnLogout('owner');
  assert.equal(service.getSnapshot().enabled, false);
});

test('rotated tokens register before the previous token is removed', async () => {
  let token = 'first-device-token';
  const f = fixture({ client: { getToken: async () => token } });
  f.service.start('owner-a'); await flush();
  token = 'rotated-device-token'; await f.service.refresh();
  assert.deepEqual(f.calls.filter((call) => Array.isArray(call)), [
    ['register', 'first-device-token', 'session-a'],
    ['register', 'rotated-device-token', 'session-a'],
    ['remove', 'first-device-token', 'session-a'],
  ]);
});

test('cleanup timeout never holds logout indefinitely', async () => {
  const f = fixture({ api: { removePushToken: () => new Promise(() => {}) } });
  f.service.start('owner-a'); await flush();
  const started = Date.now();
  await f.service.cleanupOnLogout('owner-a');
  assert.ok(Date.now() - started < 4000);
  assert.equal(f.saved.has('trumarkz_push_registration'), false);
});

test('a denied user gesture is not prompted again, and never registers a token', async () => {
  let prompts = 0;
  const f = fixture({ client: { requestPermission: async () => { prompts++; return 'denied'; } } });
  f.setStatus({ permission: 'default' });
  f.service.start('owner-a'); await flush();
  await f.service.enable(); await f.service.enable();
  assert.equal(prompts, 1);
  assert.equal(f.service.getSnapshot().permission, 'denied');
  assert.equal(f.service.getSnapshot().enabled, false);
  assert.equal(f.calls.some((call) => call[0] === 'register'), false);
});

test('failed disable retains cleanup information and can retry without re-enabling', async () => {
  let offline = true;
  const f = fixture({ api: { removePushToken: async () => { if (offline) throw new Error('offline'); return { data: { removed: true } }; } } });
  f.service.start('owner-a'); await flush();
  await f.service.disable();
  assert.equal(f.service.getSnapshot().enabled, false);
  assert.ok(f.service.getSnapshot().error);
  assert.equal(f.saved.has('trumarkz_push_registration'), true);
  offline = false; await f.service.refresh(true);
  assert.equal(f.saved.has('trumarkz_push_registration'), false);
  assert.equal(f.service.getSnapshot().enabled, false);
  assert.equal(f.calls.filter((call) => call[0] === 'register').length, 1);
});
