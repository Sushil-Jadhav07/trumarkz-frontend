import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { resolveFirebaseConfig } from './firebaseConfig';

// Replaced at build time by a public-config-only object, or null when absent.
const supplied = self.__TRUMARKZ_FIREBASE_CONFIG__ || __FIREBASE_WEB_CONFIG__;
const resolved = resolveFirebaseConfig({}, supplied);
const config = supplied && !resolved.missingFields.length ? resolved.config : null;
if (config) {
  try {
    const app = getApps()[0] || initializeApp(config);
    onBackgroundMessage(getMessaging(app), (payload) => {
      if (payload.data?.notification_type !== 'batch_deleted' || payload.notification) return;
      // Firebase already displays notification payloads. Only data-only delivery
      // needs a display here; never create a second alert for the same message.
      return self.registration.showNotification('Batch Deleted', {
        body: 'A batch was deleted by the superadmin and is no longer available.',
        data: { notification_type: 'batch_deleted' },
        tag: payload.messageId || 'batch-deleted',
      });
    });
  } catch { /* Push setup failure must not break the worker or application. */ }
}
