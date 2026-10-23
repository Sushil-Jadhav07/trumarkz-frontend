import { pushAPI, tokenHelpers } from '@/services/api';
import { firebaseMessagingClient } from '@/lib/firebaseMessaging';
import { createPushRegistration } from '@/lib/pushRegistration';

export const pushNotifications = createPushRegistration({
  client: firebaseMessagingClient,
  api: pushAPI,
  storage: () => localStorage,
  getAuthToken: () => tokenHelpers.get(),
});
