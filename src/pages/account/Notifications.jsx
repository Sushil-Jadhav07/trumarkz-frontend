import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckCircle, FileText, Bell, Check, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const Notifications = () => {
  const { notifications, markNotificationRead, markAllRead } = useApp();
  const unreadCount = notifications.filter(n => !n.read).length;

  const iconMap = {
    check: CheckCircle,
    file: FileText,
    wallet: Bell,
    user: Bell
  };

  return (
    <AuthLayout title="Notifications">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader
          title="Notifications"
          subtitle={`You have ${unreadCount} new updates`}
          action={
            <Button variant="outline" size="sm" icon={Check} onClick={() => { markAllRead(); toast.success('All marked as read'); }}>
              Mark All Read
            </Button>
          }
        />

        <div className="space-y-3">
          {notifications.map((n, i) => {
            const Icon = iconMap[n.icon] || Bell;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => markNotificationRead(n.id)}
                className={`cursor-pointer ${!n.read ? 'relative' : ''}`}
              >
                {!n.read && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-blue" />
                )}
                <Card className={`p-4 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${!n.read ? 'bg-brand-blue/10' : 'bg-gray-100'}`}>
                      <Icon size={16} className={!n.read ? 'text-brand-blue' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-inter ${!n.read ? 'font-semibold text-brand-dark' : 'text-gray-500'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-400 font-inter">{n.time}</p>
                    </div>
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 text-center">
          <button className="text-sm text-brand-blue font-inter hover:underline">View All</button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Notifications;
