import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockCredential } from '@/data/mockData';
import { Check, Share2, Download, FileText, Shield, MapPin, Award, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const VerificationResult = () => {
  const navigate = useNavigate();

  const verifications = [
    { label: 'Identity', status: 'verified' },
    { label: 'Address', status: 'verified' },
    { label: 'Police Clearance', status: 'verified' }
  ];

  return (
    <AuthLayout title="Verification Result">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader title="Certification Result" subtitle="Verified credential details" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex justify-center mb-6">
            <Badge status="verified" className="text-lg px-6 py-2">
              VERIFIED
            </Badge>
          </div>

          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <Award size={32} className="text-brand-blue" />
              </div>
              <div>
                <h2 className="font-sora font-bold text-lg text-brand-dark">{mockCredential.holderName}</h2>
                <p className="text-sm text-gray-500 font-inter">License: {mockCredential.license}</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {verifications.map((v) => (
                <div key={v.label} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <span className="text-sm font-medium text-green-700 font-inter">{v.label}</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <Check size={14} />
                    <span className="text-xs font-semibold font-inter">Verified</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm font-inter text-gray-500">
              <p>Verified by: <span className="text-brand-dark font-medium">{mockCredential.verifiedBy}</span></p>
              <p>Date: <span className="text-brand-dark font-medium">{mockCredential.timestamp}</span></p>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" icon={Share2} onClick={() => toast.success('Shared')}>
              Share
            </Button>
            <Button variant="outline" className="flex-1" icon={Download} onClick={() => toast.success('Downloaded')}>
              Download
            </Button>
            <Button variant="primary" className="flex-1" icon={ArrowRight} onClick={() => navigate('/qr/reports')}>
              Reports
            </Button>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default VerificationResult;

