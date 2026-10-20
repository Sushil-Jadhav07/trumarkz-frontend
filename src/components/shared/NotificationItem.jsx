import { Bell, Trash2 } from 'lucide-react';

export const notificationTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Time unavailable';
};

export const NotificationItem = ({ item, onRead, disabled = false }) => {
  const Icon = item.notification_type === 'batch_deleted' ? Trash2 : Bell;
  return <button type="button" onClick={() => onRead(item.id)} disabled={disabled}
    className={`flex w-full items-start gap-3 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue/40 disabled:opacity-60 ${item.is_read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/60 hover:bg-blue-50'}`}>
    <span className={`mt-0.5 rounded-lg p-2 ${item.is_read ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-brand-blue'}`}><Icon size={16} /></span>
    <span className="min-w-0 flex-1"><span className={`block text-sm font-inter ${item.is_read ? 'font-medium text-gray-600' : 'font-semibold text-brand-dark'}`}>{item.notification_type === 'batch_deleted' ? 'Batch Deleted' : 'Notification'}</span><span className="mt-1 block break-words text-sm leading-6 text-gray-600 font-inter">{item.message}</span><span className="mt-1 block text-xs text-gray-400 font-inter"><time dateTime={item.created_at || undefined}>{notificationTime(item.created_at)}</time> · {item.is_read ? 'Read' : 'Unread'}</span></span>
    {!item.is_read && <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-blue" />}
  </button>;
};
