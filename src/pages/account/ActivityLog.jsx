import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LogIn, Upload, Eye, Download, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export const ActivityLog = () => {
  const [dateRange, setDateRange] = useState('all');

  const activities = [
    { action: 'Login', date: '08 Apr 2024', time: '10:30 AM', device: 'Chrome / Windows', ip: '192.168.1.1', icon: LogIn, color: 'blue' },
    { action: 'Batch Upload', date: '08 Apr 2024', time: '11:15 AM', device: 'Chrome / Windows', ip: '192.168.1.1', icon: Upload, color: 'green' },
    { action: 'Report Viewed', date: '08 Apr 2024', time: '02:45 PM', device: 'Safari / macOS', ip: '192.168.1.2', icon: Eye, color: 'purple' }
  ];

  return (
    <AuthLayout title="Activity Log">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader
          title="Recent Activity"
          subtitle="Track your account activity"
          action={
            <Button variant="outline" size="sm" icon={Download} onClick={() => toast.success('Activity log exported')}>
              Export
            </Button>
          }
        />

        <div className="flex gap-2 mb-4">
          {['All', 'Last 7 Days', 'Last 30 Days'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-full text-sm font-medium font-inter transition-colors ${
                dateRange === range
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {activities.map((activity, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 bg-${activity.color}-50 rounded-lg shrink-0`}>
                    <activity.icon size={18} className={`text-${activity.color}-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-brand-dark font-inter text-sm">{activity.action}</p>
                      <span className="text-xs text-gray-400 font-inter">{activity.time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-inter">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {activity.date}
                      </span>
                      <span>{activity.device}</span>
                      <span className="font-mono text-gray-400">{activity.ip}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
};

export default ActivityLog;
