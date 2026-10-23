import { Bell, BellOff } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';

export const BrowserNotifications = () => {
  const { browserPush: push } = useApp();
  let status = 'Not enabled';
  let description = 'Get browser alerts when the superadmin deletes a batch. In-app history remains available.';
  if (push.supported === null) { status = 'Checking'; description = 'Checking browser notification availability.'; }
  else if (!push.supported) { status = 'Unsupported'; description = 'Push notifications are not supported in this browser.'; }
  else if (!push.configured) { status = 'Not configured'; description = 'Push notifications are not fully configured yet.'; }
  else if (push.permission === 'denied') { status = 'Blocked in browser'; description = 'Notifications are blocked in your browser settings.'; }
  else if (push.enabled) { status = 'Enabled'; description = 'Browser alerts are enabled on this device. In-app history is stored separately.'; }
  const canEnable = push.supported && push.configured && push.permission !== 'denied';
  const Icon = push.permission === 'denied' ? BellOff : Bell;
  return (
    <section className="mb-5 rounded-xl border border-gray-200 bg-white p-5" aria-label="Browser notifications">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand-blue"><Icon size={19} /></span>
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-inter text-sm font-semibold text-brand-dark">Browser Notifications</h3><span aria-live="polite" className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${push.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{status}</span></div><p className="mt-1 text-xs leading-5 text-gray-500">{description}</p></div>
        </div>
        {canEnable && <Button variant="outline" size="sm" loading={push.loading} disabled={push.loading} onClick={push.enabled ? push.disablePushNotifications : push.enablePushNotifications}>{push.enabled ? 'Disable Notifications' : 'Enable Notifications'}</Button>}
      </div>
      {push.error && <div className="mt-3 flex flex-wrap items-center gap-3"><p role="alert" className="text-xs leading-5 text-red-600">{push.error}</p><button type="button" onClick={push.refreshPushRegistration} disabled={push.loading} className="text-xs font-semibold text-brand-blue underline disabled:opacity-50">Try again</button></div>}
    </section>
  );
};

export default BrowserNotifications;
