import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, RefreshCw, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { NotificationItem } from '@/components/shared/NotificationItem';

export const NotificationBell = () => {
  const { notificationsEnabled, notificationFeeds, unreadCount, unreadLabel, unreadCountKnown, fetchNotifications, markNotificationRead, markAllRead, readingNotificationIds, markingAllNotifications, notificationActionError } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const navigate = useNavigate();
  const feed = notificationFeeds.all;
  const busy = markingAllNotifications || readingNotificationIds.length > 0;
  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  if (!notificationsEnabled) return null;
  return <div ref={ref} className="relative">
    <button ref={trigger} type="button" aria-label={`Notifications${unreadCountKnown ? unreadLabel === '9+' ? ', more than 9 unread' : `, ${unreadCount} unread` : ''}`} aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="dialog"
      onClick={() => { if (!open) fetchNotifications(); setOpen((value) => !value); }} className="relative rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40">
      <Bell size={20} />{unreadCountKnown && unreadCount > 0 && <span className="absolute right-0 top-0 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">{unreadLabel}</span>}
    </button>
    {open && <section id={id} role="dialog" aria-label="Notifications" className="fixed right-4 top-[4.25rem] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:absolute sm:right-0 sm:top-full sm:mt-2">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3"><h2 className="text-sm font-semibold text-brand-dark">Notifications</h2><div className="flex items-center gap-3"><button type="button" onClick={markAllRead} disabled={busy || !unreadCountKnown || unreadCount === 0} className="text-xs font-medium text-brand-blue disabled:opacity-40">Mark all as read</button><button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="rounded p-1 text-gray-400 hover:bg-gray-50"><X size={15} /></button></div></div>
      <div className="max-h-80 overflow-y-auto" aria-busy={feed.loading}>
        {notificationActionError && <p role="alert" className="px-4 py-3 text-xs leading-5 text-red-600">{notificationActionError}</p>}
        {feed.loading && feed.items.length === 0 ? <p role="status" className="flex items-center justify-center gap-2 p-6 text-sm text-gray-500"><RefreshCw size={15} className="animate-spin" />Loading notifications…</p>
          : feed.error ? <div role="alert" className="p-4 text-sm leading-6 text-gray-600">{feed.error}<button type="button" onClick={fetchNotifications} className="mt-2 block font-medium text-brand-blue">Try again</button></div>
          : feed.items.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No notifications yet.</p>
          : <div className="divide-y divide-gray-100">{feed.items.slice(0, 6).map((item) => <NotificationItem key={item.id} item={item} onRead={markNotificationRead} disabled={busy} />)}</div>}
      </div>
      <button type="button" onClick={() => { setOpen(false); navigate('/account/notifications'); }} className="w-full border-t border-gray-100 p-3 text-center text-sm font-medium text-brand-blue hover:bg-gray-50">View all notifications</button>
    </section>}
  </div>;
};
