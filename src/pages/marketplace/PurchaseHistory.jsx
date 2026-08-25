import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, Download, TrendingUp, Calendar } from 'lucide-react';
import { mockTransactions } from '@/data/mockData';
import toast from 'react-hot-toast';

export const PurchaseHistory = () => {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState('all');

  const history = [
    { id: 'VS-30008', amount: 45, date: '01-Apr-2024', status: 'completed' },
    { id: 'VS-20309', amount: 60, date: '01-Apr-2024', status: 'completed' },
    { id: 'VS-20388', amount: 20, date: '22-Apr-2024', status: 'confirmed' }
  ];

  const totalSpent = history.reduce((sum, h) => sum + h.amount, 0);

  return (
    <AuthLayout title="Purchase History">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader
          title="Purchase History"
          subtitle="Your document purchase records"
          action={
            <Button variant="outline" size="sm" icon={Download} onClick={() => toast.success('History exported')}>
              Export
            </Button>
          }
        />

        <Card className="p-5 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-brand-blue/10 rounded-lg">
              <TrendingUp size={20} className="text-brand-blue" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-inter">Total Spent</p>
              <p className="font-sora font-bold text-2xl text-brand-dark">₹{totalSpent}</p>
            </div>
          </div>
        </Card>

        <div className="flex gap-2 mb-4">
          {['All', 'Last 7 Days', 'Last 30 Days'].map(filter => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium font-inter transition-colors ${
                dateFilter === filter
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {history.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <CheckCircle size={18} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-brand-dark font-inter text-sm">{item.id}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 font-inter">
                        <Calendar size={12} />
                        {item.date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-sora font-bold text-brand-dark">₹{item.amount}</span>
                    <Badge status="verified">{item.status}</Badge>
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

export default PurchaseHistory;
