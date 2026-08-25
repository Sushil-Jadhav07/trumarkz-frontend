import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QRCode } from '@/components/ui/QRCode';
import { StepWizard } from '@/components/ui/StepWizard';
import { mockCredential } from '@/data/mockData';
import { ArrowRight, Download, Share2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export const CredentialPreview = () => {
  const navigate = useNavigate();

  const handleGenerate = () => {
    toast.success('Credential generated successfully');
    navigate('/credential/share');
  };

  return (
    <AuthLayout title="Credential Preview">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard steps={['Template', 'Fields', 'Preview', 'Share']} currentStep={2} />
        <PageHeader title="Credential Preview" subtitle="Review before generating" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6">
            <div className="bg-gradient-to-br from-brand-blue to-brand-blue-hover rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide font-inter">
                    {mockCredential.status}
                  </div>
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                    <path d="M24 2L6 10V22C6 33.25 14 42.5 24 46C34 42.5 42 33.25 42 22V10L24 2Z" fill="white" fillOpacity="0.3" />
                    <path d="M18 24L22 28L30 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M24 12V22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                    <div className="w-14 h-14 rounded-full bg-gray-300" />
                  </div>
                  <div>
                    <h2 className="font-sora font-bold text-xl">{mockCredential.holderName}</h2>
                    <p className="text-xs opacity-80 font-inter">{mockCredential.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm font-inter">
                  <div>
                    <p className="text-xs opacity-60 mb-0.5">License</p>
                    <p className="font-semibold">{mockCredential.license}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-60 mb-0.5">DOB</p>
                    <p className="font-semibold">{mockCredential.dob}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-60 mb-0.5">Verified By</p>
                    <p className="font-semibold">{mockCredential.verifiedBy}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-60 mb-0.5">Status</p>
                    <div className="flex items-center gap-1">
                      <Check size={12} />
                      <span className="font-semibold">Verified</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div className="text-xs opacity-60 font-inter">
                    <p>Issue Date: {mockCredential.timestamp}</p>
                    <p className="mt-0.5">Network: {mockCredential.network}</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg shadow-sm">
                    <QRCode value={mockCredential.id} size={56} />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" icon={Download} onClick={() => toast.success('Downloading...')}>
            Download
          </Button>
          <Button variant="primary" className="flex-1" icon={ArrowRight} onClick={handleGenerate}>
            Generate & Share
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default CredentialPreview;
