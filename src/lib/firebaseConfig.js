export const FIREBASE_ENV_FIELDS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
};

const REQUIRED_FIELDS = ['apiKey', 'projectId', 'messagingSenderId', 'appId'];
const configuredValue = (value) => typeof value === 'string' && value.trim() &&
  !/[<>]|^(?:your[_-]|placeholder|dummy|undefined|null)/i.test(value.trim());

// Shared by the browser and worker build. Only public Web App fields are read.
export const resolveFirebaseConfig = (env = {}, existingOptions = null) => {
  const config = Object.fromEntries(Object.entries(FIREBASE_ENV_FIELDS)
    .map(([field, variable]) => [field, existingOptions ? existingOptions[field] : env[variable]])
    .filter(([, value]) => configuredValue(value))
    .map(([field, value]) => [field, value.trim()]));
  const missingFields = REQUIRED_FIELDS.filter((field) => !config[field]).map((field) => FIREBASE_ENV_FIELDS[field]);
  const vapidKey = configuredValue(env.VITE_FIREBASE_VAPID_PUBLIC_KEY) ? env.VITE_FIREBASE_VAPID_PUBLIC_KEY.trim() : '';
  return {
    config, vapidKey, missingFields,
    configured: missingFields.length === 0 && Boolean(vapidKey),
    reason: missingFields.length ? 'firebase_web_config_missing' : !vapidKey ? 'vapid_key_missing' : null,
  };
};
