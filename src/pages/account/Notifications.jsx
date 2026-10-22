import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useState } from 'react';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { NotificationItem } from '@/components/shared/NotificationItem';

export const Notifications = () => {
  const [filter, setFilter] = useState('all');
  const { notificationsEnabled, notificationFeeds, unreadCount, unreadCountKnown, fetchNotifications, loadMoreNotifications, markNotificationRead, markAllRead, readingNotificationIds, markingAllNotifications, notificationActionError } = useApp();
  const feed = notificationFeeds[filter];
  const busy = markingAllNotifications || readingNotificationIds.length > 0;
  return <AuthLayout title="Notifications">
    <PageHeader title="Notifications" subtitle="Updates for your organization."
      action={notificationsEnabled && <div className="flex flex-wrap items-center gap-2"><Button variant="ghost" size="sm" icon={RefreshCw} disabled={feed.loading} onClick={fetchNotifications}>Refresh</Button><Button variant="outline" size="sm" icon={Check} disabled={busy || !unreadCountKnown || unreadCount === 0} onClick={markAllRead}>{markingAllNotifications ? 'Updating…' : 'Mark all as read'}</Button></div>} />
    {!notificationsEnabled ? <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Notifications are available for organization accounts.</p> : <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <nav aria-label="Notification filters" className="flex gap-2 border-b border-gray-100 p-3">{[['all', 'All'], ['unread', 'Unread']].map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 ${filter === key ? 'bg-blue-50 text-brand-blue' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>)}</nav>
      {notificationActionError && <p role="alert" className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{notificationActionError}</p>}
      {feed.error && <div role="alert" className="space-y-2 border-b border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800"><p>{feed.error}</p><button type="button" onClick={fetchNotifications} className="font-semibold underline">Try again</button></div>}
      {feed.loading && feed.items.length === 0 ? <LoadingSkeleton variant="list" label="Loading notifications" className="px-5" />
        : feed.items.length === 0 && !feed.error ? <div className="flex flex-col items-center gap-3 p-10 text-center"><Bell size={25} className="text-gray-300" /><p className="text-sm text-gray-500">{filter === 'unread' ? "You're all caught up." : 'No notifications yet.'}</p></div>
        : <div className="divide-y divide-gray-100">{feed.items.map((item) => <NotificationItem key={item.id} item={item} onRead={markNotificationRead} disabled={busy} />)}</div>}
      {feed.hasMore && <div className="border-t border-gray-100 p-4 text-center"><Button variant="ghost" size="sm" disabled={feed.loading || busy} onClick={() => loadMoreNotifications(filter)}>{feed.loading ? 'Loading…' : 'Load More'}</Button></div>}
    </section>}
  </AuthLayout>;
};
export default Notifications;
