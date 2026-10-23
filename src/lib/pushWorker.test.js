import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../public/firebase-messaging-sw.js', import.meta.url), 'utf8');
const fixture = (tabs = []) => {
  const events = new Map(); const calls = [];
  const self = { location: { href: 'https://unit-test.invalid/firebase-messaging-sw.js' }, registration: { scope: 'https://unit-test.invalid/' }, addEventListener: (type, callback) => events.set(type, callback), clients: { matchAll: async () => tabs, openWindow: async (url) => calls.push(['open', url]) } };
  vm.runInNewContext(source, { self, URL, importScripts: (file) => calls.push(['import', file]) });
  const click = async (data) => {
    let task;
    events.get('notificationclick')({ notification: { data, close: () => calls.push('close') }, stopImmediatePropagation: () => calls.push('stop'), waitUntil: (promise) => { task = promise; } });
    await task;
  };
  return { calls, click, self };
};

test('batch-deleted clicks focus a TruMarkZ tab and always navigate to the batch list', async () => {
  const navigated = [];
  const tab = { url: 'https://unit-test.invalid/org/dashboard', navigate: async (url) => { navigated.push(url); return tab; }, focus: async () => navigated.push('focus') };
  const f = fixture([tab]);
  await f.click({ FCM_MSG: { data: { notification_type: 'batch_deleted', batch_id: 'deleted-id', url: 'https://untrusted.invalid/' } } });
  assert.deepEqual(navigated, ['https://unit-test.invalid/org/batch-status', 'focus']);
  assert.equal(f.calls.some((call) => call[0] === 'open'), false);
});

test('without an existing tab, open only the safe batch list; unrelated types are untouched', async () => {
  const f = fixture();
  await f.click({ notification_type: 'batch_deleted', batch_id: 'deleted-id' });
  assert.deepEqual(f.calls.find((call) => call[0] === 'open'), ['open', 'https://unit-test.invalid/org/batch-status']);
  const other = fixture(); await other.click({ notification_type: 'unsupported-event' });
  assert.deepEqual(other.calls, [['import', './firebase-messaging-runtime.js']]);
  assert.equal(other.self.__TRUMARKZ_FIREBASE_CONFIG__, null);
});
