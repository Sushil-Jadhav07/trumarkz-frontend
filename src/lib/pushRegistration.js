const TOKEN_KEY = 'trumarkz_push_registration';
const preferenceKey = (owner) => `trumarkz_push_disabled:${owner}`;
const initialState = () => ({ owner: null, supported: null, configured: false, permission: 'default', enabled: false, loading: false, error: null, reason: null });
const errorMessage = (error) => error?.response?.status === 404
  ? 'Push registration is unavailable in this backend environment.'
  : 'Could not update browser notifications. Please try again.';

const bounded = (promise, ms = 2500) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Push cleanup timed out')), ms);
  Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer));
});

// All device/session state lives here, independently of React and the bell.
// Dependencies are injected so account changes and failure paths can be tested
// without contacting Firebase or the production token API.
export const createPushRegistration = ({ client, api, storage, getAuthToken }) => {
  let state = initialState();
  let session = null;
  let inFlight = null;
  let unsubscribe = () => {};
  let logoutTask = null;
  const listeners = new Set();
  const read = (key) => { try { return JSON.parse(storage().getItem(key)); } catch { return null; } };
  const write = (key, value) => { try { storage().setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable. */ } };
  const remove = (key) => { try { storage().removeItem(key); } catch { /* Best effort. */ } };
  let memoryRecord = null;
  const record = () => memoryRecord || read(TOKEN_KEY);
  const saveRecord = (value) => { memoryRecord = value; write(TOKEN_KEY, value); };
  const forgetRecord = (value) => {
    const current = record();
    if (current?.owner === value?.owner && current?.token === value?.token) { memoryRecord = null; remove(TOKEN_KEY); }
  };
  const current = (target) => session === target && target?.authToken === getAuthToken();
  const update = (patch, target) => {
    if (target && !current(target)) return;
    state = { ...state, ...patch };
    listeners.forEach((notify) => notify());
  };
  const stopListening = () => { try { unsubscribe(); } catch { /* Optional listener cleanup must never block logout. */ } finally { unsubscribe = () => {}; } };
  const apiOptions = (target, extra = {}) => ({ expectedAccessToken: target.authToken, ...extra });

  const cleanupRecord = async (target) => {
    const saved = record();
    if (!saved?.token || saved.owner !== target.owner) return;
    let failed = false;
    try {
      await bounded(api.removePushToken(saved.token, apiOptions(target, { timeout: 2000 })));
    } catch { failed = true; }
    try { await bounded(client.deleteToken()); } catch { failed = true; }
    if (!failed) forgetRecord(saved);
    if (failed) throw new Error('Push cleanup failed');
  };

  const refresh = (force = false) => {
    const target = session;
    if (!target || !current(target)) return Promise.resolve(false);
    if (inFlight?.target === target) return inFlight.promise;
    const promise = (async () => {
      update({ loading: true, error: null }, target);
      try {
        const status = await client.getStatus();
        if (!current(target)) return false;
        update(status, target);
        if (!status.supported || !status.configured || status.permission !== 'granted' || read(preferenceKey(target.owner)) === true) {
          target.registeredToken = null;
          stopListening();
          update({ enabled: false }, target);
          if (status.permission !== 'granted' || read(preferenceKey(target.owner)) === true) await cleanupRecord(target);
          return false;
        }
        const token = await client.getToken();
        if (!current(target) || read(preferenceKey(target.owner)) === true) return false;
        if (typeof token !== 'string' || !token.trim()) throw new Error('No FCM token');
        if (!force && target.registeredToken === token && state.enabled) return true;
        // Retain only the actual token and owner for cleanup, never the JWT.
        // Also retain pending registrations so logout can clean up a POST
        // whose response was interrupted or whose outcome is uncertain.
        const previousRecord = record();
        saveRecord({ token, owner: target.owner });
        const response = await api.registerPushToken(token, apiOptions(target, { signal: target.controller.signal }));
        if (!current(target)) return false;
        if (!response?.data?.id || response.data.platform !== 'web') throw new Error('Registration not confirmed');
        if (previousRecord?.owner === target.owner && previousRecord.token !== token) {
          // Rotation must not leave a second still-reachable token for this device.
          try { await api.removePushToken(previousRecord.token, apiOptions(target, { signal: target.controller.signal, timeout: 2000 })); }
          catch { update({ error: 'Previous browser registration cleanup could not be confirmed.' }, target); }
          if (!current(target)) return false;
        }
        stopListening();
        const seen = new Set();
        const off = await client.subscribe((payload) => {
          if (!current(target) || !state.enabled || payload.data?.notification_type !== 'batch_deleted') return;
          if (payload.messageId && seen.has(payload.messageId)) return;
          if (payload.messageId) { seen.add(payload.messageId); if (seen.size > 100) seen.delete(seen.values().next().value); }
          target.onMessage?.(payload);
        });
        if (!current(target)) { off(); return false; }
        unsubscribe = off;
        target.registeredToken = token;
        update({ enabled: true, reason: null }, target);
        return true;
      } catch (error) {
        update({ enabled: false, error: errorMessage(error) }, target);
        return false;
      } finally { update({ loading: false }, target); }
    })();
    inFlight = { target, promise };
    return promise.finally(() => { if (inFlight?.promise === promise) inFlight = null; });
  };

  return {
    getSnapshot: () => state,
    subscribe: (notify) => { listeners.add(notify); return () => listeners.delete(notify); },
    start(owner, onMessage) {
      session?.controller.abort(); stopListening();
      const target = { owner, onMessage, handle: Symbol('push-session'), authToken: getAuthToken(), controller: new AbortController() };
      session = target;
      update({ ...initialState(), owner, loading: true });
      refresh(); // Never requests permission; only an already-granted session registers.
      return () => {
        if (session?.handle === target.handle) { session.controller.abort(); session = null; stopListening(); update(initialState()); }
      };
    },
    refresh,
    async enable() {
      const target = session;
      if (!target || !state.supported || !state.configured || state.loading) return false;
      if (state.permission === 'denied') return false;
      update({ loading: true, error: null }, target);
      // Call directly from the click, before any await (Safari user gesture).
      try {
        const permission = await client.requestPermission();
        if (!current(target)) return false;
        update({ permission, loading: false }, target);
        if (permission !== 'granted') return false;
        remove(preferenceKey(target.owner));
        return refresh(true);
      } catch { update({ loading: false, error: 'Browser notification permission could not be requested.' }, target); return false; }
    },
    async disable() {
      if (!session) return false;
      const previous = session;
      previous.controller.abort(); stopListening();
      const target = { ...previous, controller: new AbortController(), registeredToken: null };
      session = target;
      write(preferenceKey(target.owner), true);
      update({ loading: true, enabled: false, error: null }, target);
      try { await cleanupRecord(target); return true; }
      catch { update({ error: 'Browser registration cleanup could not be confirmed. Please try again.' }, target); return false; }
      finally { update({ loading: false }, target); }
    },
    cleanupOnLogout(owner) {
      if (logoutTask) return logoutTask;
      const target = { owner, authToken: getAuthToken() };
      const logoutRecord = record();
      session?.controller.abort(); session = null; stopListening(); update(initialState());
      logoutTask = bounded(cleanupRecord(target), 3000).catch(() => {}).finally(() => {
        if (logoutRecord?.owner === owner) forgetRecord(logoutRecord);
        logoutTask = null;
      });
      return logoutTask;
    },
  };
};
