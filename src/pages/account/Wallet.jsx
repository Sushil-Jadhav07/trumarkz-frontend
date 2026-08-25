import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockUser, mockTransactions } from '@/data/mockData';
import { Wallet as WalletIcon, Plus, ArrowRight, LogIn, Upload, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export const Wallet = () => {
  const navigate = useNavigate();

  const activities = [
    { action: 'Login', date: '08 Apr 2024', icon: LogIn, color: 'blue' },
    { action: 'Batch Upload', date: '08 Apr 2024', icon: Upload, color: 'green' },
    { action: 'Report Viewed', date: '08 Apr 2024', icon: Eye, color: 'purple' }
  ];

  return (
    <AuthLayout title="Wallet">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader title="Current Balance" subtitle="Manage your TruMarkZ wallet" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 mb-6 text-center">
            <div className="p-3 bg-brand-blue/10 rounded-full inline-flex mb-4">
              <WalletIcon size={28} className="text-brand-blue" />
            </div>
            <p className="font-sora font-bold text-4xl text-brand-dark mb-1">
              ₹{mockUser.walletBalance.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 font-inter mb-4">Available Balance</p>
            <Button variant="primary" size="md" icon={Plus} onClick={() => toast.success('Add funds feature coming soon')}>
              Add Funds
            </Button>
          </Card>

          <h3 className="font-sora font-semibold text-brand-dark mb-3">Transaction History</h3>
          <div className="space-y-3 mb-6">
            {mockTransactions.map((txn, i) => (
              <motion.div
                key={txn.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${txn.amount > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <WalletIcon size={16} className={txn.amount > 0 ? 'text-green-600' : 'text-red-500'} />
                      </div>
                      <div>
                        <p className="font-medium text-brand-dark font-inter text-sm">{txn.description}</p>
                        <p className="text-xs text-gray-500 font-inter">{txn.date}</p>
                      </div>
                    </div>
                    <span className={`font-sora font-bold ${txn.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {txn.amount > 0 ? '+' : ''}₹{Math.abs(txn.amount)}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <h3 className="font-sora font-semibold text-brand-dark mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {activities.map((activity, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-${activity.color}-50 rounded-lg`}>
                    <activity.icon size={16} className={`text-${activity.color}-500`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-dark font-inter">{activity.action}</p>
                    <p className="text-xs text-gray-500 font-inter">{activity.date}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-4 text-center">
            <button className="text-sm text-brand-blue font-inter hover:underline inline-flex items-center gap-1">
              View All Transactions <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default Wallet;
