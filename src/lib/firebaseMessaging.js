import { resolveFirebaseConfig } from './firebaseConfig';

let runtimePromise;
let workerPromise;
let warned = false;
let deletion = Promise.resolve();
const permission = () => typeof Notification === 'undefined' ? 'default' : Notification.permission;
const browserSupported = () => typeof window !== 'undefined' && window.isSecureContext &&
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
const existingApp = (sdk) => sdk.getApps().find((app) => app.name === '[DEFAULT]') ||
  (sdk.getApps().length === 1 ? sdk.getApps()[0] : null);

export const getPushStatus = async () => {
  if (!browserSupported()) return { supported: false, configured: false, permission: permission(), reason: 'unsupported' };
  const appSdk = await import('firebase/app');
  const selectedApp = existingApp(appSdk);
  if (appSdk.getApps().length && !selectedApp) return { supported: true, configured: false, permission: permission(), reason: 'firebase_app_ambiguous' };
  const resolved = resolveFirebaseConfig(import.meta.env, selectedApp?.options);
  if (!resolved.configured) {
    if (import.meta.env.DEV && !warned) {
      warned = true;
      console.info('[push] Setup incomplete. Missing variables:', [...resolved.missingFields, ...(!resolved.vapidKey ? ['VITE_FIREBASE_VAPID_PUBLIC_KEY'] : [])].join(', '));
    }
    return { supported: true, configured: false, permission: permission(), reason: resolved.reason };
  }
  try {
    const messagingSdk = await import('firebase/messaging');
    const supported = await messagingSdk.isSupported();
    return { supported, configured: true, permission: permission(), reason: supported ? null : 'unsupported' };
  } catch {
    return { supported: false, configured: true, permission: permission(), reason: 'unsupported' };
  }
};

const getRuntime = async () => {
  if (!runtimePromise) runtimePromise = (async () => {
    const status = await getPushStatus();
    if (!status.supported || !status.configured || permission() !== 'granted') return null;
    const [appSdk, messagingSdk] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
    const app = existingApp(appSdk);
    if (!app && appSdk.getApps().length) return null; // Never add a second app to resolve ambiguity.
    const { config, vapidKey } = resolveFirebaseConfig(import.meta.env, app?.options);
    return { sdk: messagingSdk, messaging: messagingSdk.getMessaging(app || appSdk.initializeApp(config)), vapidKey, config };
  })().catch(() => { runtimePromise = null; throw new Error('Push setup could not be initialized.'); });
  const runtime = await runtimePromise;
  if (!runtime) runtimePromise = null;
  return runtime;
};

const getWorker = (config) => {
  if (!workerPromise) workerPromise = (async () => {
    const base = import.meta.env.BASE_URL || '/';
    // Existing initialized apps may provide config at runtime rather than env.
    // Preserve that public config in the worker script URL across worker restarts.
    const envConfig = resolveFirebaseConfig(import.meta.env);
    const needsRuntimeConfig = envConfig.missingFields.length > 0 || JSON.stringify(envConfig.config) !== JSON.stringify(config);
    const query = needsRuntimeConfig ? `?config=${encodeURIComponent(JSON.stringify(config))}` : '';
    const registration = await navigator.serviceWorker.register(`${base}firebase-messaging-sw.js${query}`, { scope: base, updateViaCache: 'none' });
    if (!registration.active) await new Promise((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) return reject(new Error('Push worker is unavailable.'));
      const finish = () => {
        if (worker.state === 'activated' || worker.state === 'redundant') {
          clearTimeout(timer); worker.removeEventListener('statechange', finish);
          worker.state === 'activated' ? resolve() : reject(new Error('Push worker installation failed.'));
        }
      };
      const timer = setTimeout(() => { worker.removeEventListener('statechange', finish); reject(new Error('Push worker activation timed out.')); }, 10000);
      worker.addEventListener('statechange', finish); finish();
    });
    return registration;
  })().catch(() => { workerPromise = null; throw new Error('Push worker could not be registered.'); });
  return workerPromise;
};

export const firebaseMessagingClient = {
  getStatus: getPushStatus,
  requestPermission: () => permission() === 'default' ? Notification.requestPermission() : Promise.resolve(permission()),
  getToken: async () => {
    await deletion.catch(() => {}); // Account-switch token creation follows prior SDK cleanup.
    if (permission() !== 'granted') return null; // Never let getToken trigger a prompt.
    const runtime = await getRuntime();
    if (!runtime) return null;
    const serviceWorkerRegistration = await getWorker(runtime.config);
    if (permission() !== 'granted') return null;
    return runtime.sdk.getToken(runtime.messaging, { vapidKey: runtime.vapidKey, serviceWorkerRegistration });
  },
  subscribe: async (callback) => {
    const runtime = await getRuntime();
    return runtime ? runtime.sdk.onMessage(runtime.messaging, callback) : () => {};
  },
  deleteToken: () => {
    deletion = (async () => {
      const runtime = runtimePromise && await runtimePromise;
      return runtime ? runtime.sdk.deleteToken(runtime.messaging) : false;
    })();
    return deletion;
  },
};
