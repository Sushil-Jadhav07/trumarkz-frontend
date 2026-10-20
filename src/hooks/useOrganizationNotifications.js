import { useCallback, useEffect, useRef, useState } from 'react';
import { verificationAPI } from '@/services/api';

const PAGE_SIZE = 50;
const emptyFeed = () => ({ items: [], loading: false, error: null, hasMore: false, offset: 0 });
const emptyState = (scope) => ({ scope, all: emptyFeed(), unread: emptyFeed(), reading: [], markingAll: false, actionError: null });
const loadError = (error) => error?.response?.status === 404
  ? 'Notifications are unavailable in this backend environment. Check that the notification update is deployed.'
  : 'Could not load notifications. Please try again.';

export const useOrganizationNotifications = (scope) => {
  const [state, setState] = useState(() => emptyState(scope));
  const stateRef = useRef(state);
  stateRef.current = state;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const requests = useRef({ all: 0, unread: 0 });
  const mutations = useRef(new Set());
  const update = useCallback((change) => {
    if (currentScope.current !== scope) return;
    setState((previous) => change(previous.scope === scope ? previous : emptyState(scope)));
  }, [scope]);

  const loadFeed = useCallback(async (filter, append = false) => {
    if (!scope) return false;
    const previous = stateRef.current.scope === scope ? stateRef.current[filter] : emptyFeed();
    if (append && (previous.loading || !previous.hasMore)) return false;
    const offset = append ? previous.offset : 0;
    const sequence = ++requests.current[filter];
    update((value) => ({ ...value, [filter]: { ...value[filter], loading: true, error: null } }));
    try {
      const { data } = await verificationAPI.getNotifications({ unreadOnly: filter === 'unread', limit: PAGE_SIZE, offset });
      if (currentScope.current !== scope || requests.current[filter] !== sequence) return false;
      if (!Array.isArray(data) || data.some((item) => !item?.id || typeof item.is_read !== 'boolean')) throw new Error('Notification list unavailable');
      update((value) => {
        const items = append ? [...value[filter].items, ...data] : data;
        return { ...value, [filter]: { items: [...new Map(items.map((item) => [item.id, item])).values()], offset: offset + data.length, hasMore: data.length === PAGE_SIZE, loading: false, error: null } };
      });
      return true;
    } catch (error) {
      if (currentScope.current === scope && requests.current[filter] === sequence) update((value) => ({ ...value, [filter]: { ...value[filter], loading: false, error: loadError(error) } }));
      return false;
    }
  }, [scope, update]);

  const fetchNotifications = useCallback(() => Promise.all([loadFeed('all'), loadFeed('unread')]), [loadFeed]);
  useEffect(() => {
    setState(emptyState(scope));
    if (!scope) return;
    fetchNotifications();
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') fetchNotifications(); };
    const timer = setInterval(refreshWhenVisible, 60000);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      requests.current.all += 1;
      requests.current.unread += 1;
    };
  }, [scope, fetchNotifications]);

  const markNotificationRead = useCallback(async (id) => {
    if (!scope || currentScope.current !== scope) return false;
    const key = `${scope}:${id}`;
    if (mutations.current.has(key) || mutations.current.has(`${scope}:all`)) return false;
    const current = stateRef.current;
    const item = [...current.all.items, ...current.unread.items].find((entry) => entry.id === id);
    if (!item || item.is_read) return true;
    mutations.current.add(key);
    update((value) => ({ ...value, reading: [...value.reading, id], actionError: null }));
    try {
      const { data } = await verificationAPI.markNotificationRead(id);
      if (currentScope.current !== scope) return false;
      if (data?.id !== id || data?.is_read !== true) throw new Error('Read status was not confirmed');
      requests.current.all += 1;
      requests.current.unread += 1;
      update((value) => ({ ...value,
        all: { ...value.all, items: value.all.items.map((entry) => entry.id === id ? { ...entry, is_read: true } : entry) },
        unread: { ...value.unread, items: value.unread.items.filter((entry) => entry.id !== id) },
      }));
      await fetchNotifications(); // Reconcile a capped badge and shifted unread offsets.
      return true;
    } catch (error) {
      update((value) => ({ ...value, actionError: error?.response?.status === 404 ? 'This notification is no longer available.' : 'Could not mark this notification as read. Please try again.' }));
      return false;
    } finally {
      mutations.current.delete(key);
      update((value) => ({ ...value, reading: value.reading.filter((entry) => entry !== id) }));
    }
  }, [scope, update, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    if (!scope || currentScope.current !== scope) return false;
    const key = `${scope}:all`;
    if ([...mutations.current].some((entry) => entry.startsWith(`${scope}:`))) return false;
    mutations.current.add(key);
    update((value) => ({ ...value, markingAll: true, actionError: null }));
    try {
      const { data } = await verificationAPI.markAllNotificationsRead();
      if (currentScope.current !== scope) return false;
      if (!Number.isInteger(data?.marked_count) || data.marked_count < 0) throw new Error('Read status was not confirmed');
      requests.current.all += 1;
      requests.current.unread += 1;
      update((value) => ({ ...value, all: { ...value.all, items: value.all.items.map((entry) => ({ ...entry, is_read: true })) }, unread: emptyFeed() }));
      await fetchNotifications();
      return true;
    } catch {
      update((value) => ({ ...value, actionError: 'Could not mark all notifications as read. Please try again.' }));
      return false;
    } finally {
      mutations.current.delete(key);
      update((value) => ({ ...value, markingAll: false }));
    }
  }, [scope, update, fetchNotifications]);

  const current = state.scope === scope ? state : emptyState(scope);
  const unreadCount = current.unread.items.filter((item) => !item.is_read).length;
  // A full API page is a lower bound, never a total. Cap the visible badge.
  const unreadLabel = unreadCount > 9 || current.unread.hasMore ? '9+' : String(unreadCount);
  return {
    notificationsEnabled: Boolean(scope), notificationFeeds: { all: current.all, unread: current.unread },
    notifications: current.all.items, notificationsLoading: current.all.loading,
    notificationActionError: current.actionError, readingNotificationIds: current.reading, markingAllNotifications: current.markingAll,
    unreadCount, unreadLabel, unreadCountKnown: !current.unread.loading && !current.unread.error,
    fetchNotifications, loadMoreNotifications: (filter) => loadFeed(filter, true), markNotificationRead, markAllRead,
  };
};
