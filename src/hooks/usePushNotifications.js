import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { pushNotifications } from '@/services/pushNotifications';
import { tokenHelpers } from '@/services/api';

export const usePushNotifications = (owner, onMessage) => {
  const handler = useRef(onMessage);
  handler.current = onMessage;
  const snapshot = useSyncExternalStore(pushNotifications.subscribe, pushNotifications.getSnapshot);
  const sessionToken = owner ? tokenHelpers.get() : null;
  useEffect(() => {
    if (!owner) return;
    const stop = pushNotifications.start(owner, (payload) => handler.current?.(payload));
    const refresh = () => { if (document.visibilityState === 'visible') pushNotifications.refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { stop(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [owner, sessionToken]);
  return {
    ...snapshot,
    enabled: Boolean(owner && snapshot.owner === owner && snapshot.enabled),
    enablePushNotifications: useCallback(() => pushNotifications.enable(), []),
    disablePushNotifications: useCallback(() => pushNotifications.disable(), []),
    refreshPushRegistration: useCallback(() => pushNotifications.refresh(true), []),
  };
};
