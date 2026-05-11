import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, FileText, ArrowRight, Shield, MapPin, Award } from 'lucide-react';

export const ReportsList = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const reports = [
    { id: 'R1', type: 'Identity Verification', date: '05 Apr 2024', status: 'verified', icon: Shield },
    { id: 'R2', type: 'Address Verification', date: '05 Apr 2024', status: 'verified', icon: MapPin },
    { id: 'R3', type: 'Police Clearance', date: '04 Apr 2024', status: 'verified', icon: Award }
  ];

  const filtered = reports.filter(r => {
    const matchesFilter = filter === 'all' || r.type.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch = r.type.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const tabs = ['All', 'Address Verification', 'Identity Verification'];

  return (
    <AuthLayout title="Verification Reports">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader title="Verification Reports" subtitle="View and download verification reports" />

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab === 'All' ? 'all' : tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium font-inter whitespace-nowrap transition-colors ${
                (tab === 'All' ? filter === 'all' : filter === tab)
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={Search}
          />
        </div>

        <div className="space-y-3">
          {filtered.map((report, i) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-blue/10 rounded-lg">
                      <report.icon size={18} className="text-brand-blue" />
                    </div>
                    <div>
                      <p className="font-medium text-brand-dark font-inter text-sm">{report.type}</p>
                      <p className="text-xs text-gray-500 font-inter">{report.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status="verified">Verified</Badge>
                    <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate(`/qr/report/${report.id}`)}>
                      View
                    </Button>
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

export default ReportsList;
