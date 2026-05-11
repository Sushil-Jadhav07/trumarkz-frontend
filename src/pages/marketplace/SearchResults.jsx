import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Search, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { mockMarketplaceRecords } from '@/data/mockData';

export const SearchResults = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('relevance');
  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'date', label: 'Date' },
    { value: 'name', label: 'Name' }
  ];

  return (
    <AuthLayout title="Search Results">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader
          title="Found 35 Records"
          subtitle="Showing verified records matching your search"
        />

        <div className="mb-4 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          <div className="w-full sm:flex-1">
            <Input placeholder="Refine search..." icon={Search} />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Dropdown
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              className="flex-1 sm:w-36 sm:flex-none"
            />
            <button className="p-2.5 rounded-xl border-2 border-gray-200 hover:border-brand-blue text-gray-400 hover:text-brand-blue transition-colors shrink-0">
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {['Transport', 'Verified', '2024'].map(chip => (
            <span key={chip} className="px-3 py-1 bg-brand-blue/10 text-brand-blue text-xs font-medium rounded-full font-inter">
              {chip}
            </span>
          ))}
        </div>

        <div className="space-y-3">
          {mockMarketplaceRecords.map((record, i) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center font-sora font-bold text-brand-blue text-sm">
                      {record.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-brand-dark font-inter truncate">{record.name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 font-inter">
                        <span>{record.id}</span>
                        <span>-</span>
                        <span>License: {record.license}</span>
                        <span>-</span>
                        <span>{record.dob}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-inter">{record.industry}</span>
                    <Badge status="verified">Verified</Badge>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full min-[420px]:w-auto"
                      icon={ArrowRight}
                      onClick={() => navigate(`/marketplace/record/${record.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center gap-2 mt-6">
          {[1, 2, 3, '...', 8].map((page, i) => (
            <button
              key={i}
              className={`w-9 h-9 rounded-lg text-sm font-medium font-inter transition-colors ${
                page === 1
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
};

export default SearchResults;
