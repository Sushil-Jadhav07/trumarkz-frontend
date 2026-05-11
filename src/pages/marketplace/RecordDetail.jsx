import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { QRCode } from '@/components/ui/QRCode';
import { mockCredential } from '@/data/mockData';
import { ArrowLeft, Eye, ShoppingCart, Shield, Hash, Clock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export const MarketplaceRecordDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <AuthLayout title="Record Detail">
      <div className="w-full mx-auto lg:max-w-none">
        <button
          onClick={() => navigate('/marketplace/results')}
          className="flex items-center gap-2 text-sm text-brand-blue font-inter mb-4 hover:underline"
        >
          <ArrowLeft size={14} /> Back to Results
        </button>

        <PageHeader title={`Record ${id || 'VS-30508'}`} subtitle="Verified record details" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center font-sora font-bold text-brand-blue text-xl">
                R
              </div>
              <div>
                <h2 className="font-sora font-bold text-lg text-brand-dark">Ravi Kumar</h2>
                <p className="text-sm text-gray-500 font-inter">License: {mockCredential.license}</p>
              </div>
              <Badge status="verified" className="ml-auto">Verified</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'DOB', value: '01-Apr-1993', icon: Clock },
                { label: 'Industry', value: 'Transport', icon: Globe },
                { label: 'Record ID', value: id || 'VS-30508', icon: Hash },
                { label: 'Network', value: 'Dhiway CORD Network', icon: Shield }
              ].map(item => (
                <div key={item.label} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-inter mb-1">
                    <item.icon size={12} />
                    {item.label}
                  </div>
                  <p className="text-sm font-medium text-brand-dark font-inter">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 font-inter mb-2">Blockchain Hash</p>
              <code className="text-xs text-brand-blue font-mono bg-brand-blue/5 px-3 py-2 rounded-lg block truncate">
                {mockCredential.blockchainHash}
              </code>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" icon={Eye} onClick={() => toast.success('Credential viewed')}>
              View Credential
            </Button>
            <Button variant="primary" className="flex-1" icon={ShoppingCart} onClick={() => navigate('/marketplace/documents')}>
              Purchase Reports
            </Button>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default MarketplaceRecordDetail;

