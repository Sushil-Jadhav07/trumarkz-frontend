import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Search, Globe, CheckCircle, TrendingUp, Shield, Clock } from 'lucide-react';
import { mockMarketplaceRecords } from '@/data/mockData';
import toast from 'react-hot-toast';

export const RegistryHome = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [industry, setIndustry] = useState('all-industries');
  const [vType, setVType] = useState('all-verifications');
  const [year, setYear] = useState('all-years');

  const industryOptions = [
    { value: 'all-industries', label: 'All Industries' },
    { value: 'transport-logistics', label: 'Transport & Logistics' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' }
  ];

  const verificationOptions = [
    { value: 'all-verifications', label: 'All Verifications' },
    { value: 'identity', label: 'Identity' },
    { value: 'address', label: 'Address' },
    { value: 'police', label: 'Police' }
  ];

  const yearOptions = [
    { value: 'all-years', label: 'All Years' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
    { value: '2022', label: '2022' }
  ];

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Enter a search term');
      return;
    }
    navigate('/marketplace/results');
  };

  return (
    <AuthLayout title="Blockchain Registry">
      <div className="w-full mx-auto">
        <PageHeader
          title="Blockchain Registry"
          subtitle="Search verified records globally"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 mb-6">
            <Input
              placeholder="Search by name, ID, or license number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={Search}
              className="mb-4"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Dropdown value={industry} onChange={setIndustry} options={industryOptions} />
              <Dropdown value={vType} onChange={setVType} options={verificationOptions} />
              <Dropdown value={year} onChange={setYear} options={yearOptions} />
            </div>

            <Button variant="primary" size="lg" className="w-full" icon={Search} onClick={handleSearch}>
              Search
            </Button>
          </Card>
        </motion.div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: '100M+', desc: 'Verifications', icon: Shield },
            { label: '50+', desc: 'Countries', icon: Globe },
            { label: '99.99%', desc: 'Uptime', icon: Clock },
            { label: '24/7', desc: 'Availability', icon: CheckCircle }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Card className="p-4 text-center">
                <stat.icon size={20} className="mx-auto mb-2 text-brand-blue" />
                <p className="font-sora font-bold text-xl text-brand-dark">{stat.label}</p>
                <p className="text-xs text-gray-500 font-inter">{stat.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recent Records */}
        <h3 className="font-sora font-semibold text-lg text-brand-dark mb-4">Recent Records</h3>
        <div className="space-y-3">
          {mockMarketplaceRecords.slice(0, 3).map((record, i) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/marketplace/record/${record.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brand-dark font-inter">{record.name}</p>
                    <p className="text-xs text-gray-500 font-inter">{record.id} • {record.industry}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full font-inter">Verified</span>
                    <Button variant="ghost" size="sm">View</Button>
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

export default RegistryHome;
