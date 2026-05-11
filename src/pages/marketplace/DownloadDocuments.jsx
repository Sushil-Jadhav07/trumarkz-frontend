import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { SuccessCheckmark } from '@/components/ui/SuccessCheckmark';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Download, ArrowRight, ExternalLink, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const DownloadDocuments = () => {
  const navigate = useNavigate();

  const documents = [
    { id: 'D1', name: 'Identity Verification', size: '245 KB' },
    { id: 'D2', name: 'Address Verification', size: '312 KB' }
  ];

  return (
    <AuthLayout title="Download Documents">
      <div className="w-full mx-auto lg:max-w-none text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mb-6"
        >
          <SuccessCheckmark size="xl" />
        </motion.div>

        <h2 className="font-sora font-bold text-2xl text-brand-dark mb-2">
          Payment Successful
        </h2>
        <p className="text-sm text-gray-500 font-inter mb-8">
          Your documents are ready for download
        </p>

        <div className="space-y-3 mb-6">
          {documents.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <FileText size={18} className="text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-brand-dark font-inter text-sm">{doc.name}</p>
                      <p className="text-xs text-gray-500 font-inter">{doc.size}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" icon={Download} onClick={() => toast.success(`${doc.name} downloaded`)}>
                    Download
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <Button variant="primary" size="lg" className="w-full mb-3" icon={Download} onClick={() => toast.success('All documents downloaded')}>
          Download All
        </Button>
        <Button variant="ghost" size="md" className="w-full" icon={ExternalLink} onClick={() => navigate('/marketplace/blockchain')}>
          View on Explorer
        </Button>
      </div>
    </AuthLayout>
  );
};

export default DownloadDocuments;
