import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockCredential } from '@/data/mockData';
import { Copy, ExternalLink, CheckCircle, Hash, Clock, Globe, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const BlockchainRecord = () => {
  const navigate = useNavigate();

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <AuthLayout title="Blockchain Record">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader title="Blockchain Record" subtitle="Immutable credential record" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 mb-6">
           

            <div className="space-y-4">
              {[
                { label: 'Credential ID', value: mockCredential.id, icon: Hash, copyable: false },
                { label: 'Network', value: mockCredential.network, icon: Globe, copyable: false },
                { label: 'Block Hash', value: mockCredential.blockchainHash, icon: Link2, copyable: true },
                { label: 'Timestamp', value: mockCredential.timestamp, icon: Clock, copyable: false },
              ].map((item, i) => (
                <div key={item.label} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-inter mb-1">
                    <item.icon size={12} />
                    {item.label}
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="text-sm text-brand-dark font-mono truncate flex-1">
                      {item.value}
                    </code>
                    {item.copyable && (
                      <button
                        onClick={() => handleCopy(item.value)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors ml-2"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700 font-inter">Status</span>
                </div>
                <Badge status="verified">Confirmed</Badge>
              </div>
            </div>
          </Card>

          <Button variant="primary" size="lg" className="w-full" icon={ExternalLink} onClick={() => toast.success('Opening explorer...')}>
            View on Explorer
          </Button>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default BlockchainRecord;

