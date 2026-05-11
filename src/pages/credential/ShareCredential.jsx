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
import { MessageCircle, Mail, Link, Download, ArrowLeft, Copy, CheckCircle, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

export const ShareCredential = () => {
  const navigate = useNavigate();
  const shareUrl = `https://trumarkz.com/c/${mockCredential.id}`;

  const shareOptions = [
    {
      id: 'whatsapp',
      label: 'Share on WhatsApp',
      desc: 'Send credential link instantly',
      icon: MessageCircle,
      color: 'bg-green-50 text-green-700 border-green-100',
    },
    {
      id: 'email',
      label: 'Share via Email',
      desc: 'Open default mail flow',
      icon: Mail,
      color: 'bg-blue-50 text-brand-blue border-blue-100',
    },
    {
      id: 'link',
      label: 'Copy Public Link',
      desc: 'Use in chats, resumes, forms',
      icon: Link,
      color: 'bg-gray-50 text-brand-dark border-gray-200',
    },
    {
      id: 'qr',
      label: 'Download QR',
      desc: 'Use for print and offline scan',
      icon: Download,
      color: 'bg-purple-50 text-purple-700 border-purple-100',
    },
  ];

  const handleShare = (id) => {
    if (id === 'link') {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
      return;
    }

    if (id === 'qr') {
      toast.success('QR code downloaded');
      return;
    }

    toast.success(`Shared via ${id}`);
  };

  return (
    <AuthLayout title="Share Credential">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard steps={['Template', 'Fields', 'Preview', 'Share']} currentStep={3} />
        <PageHeader title="Share Credential" subtitle="Choose a clean sharing method for this credential" />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="xl:col-span-2 space-y-5">
            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="bg-gradient-to-br from-brand-blue to-brand-blue-hover rounded-xl p-3 text-white shrink-0">
                    <div className="font-sora font-bold text-xs">{mockCredential.status}</div>
                    <div className="text-xs opacity-80 mt-0.5 font-inter">{mockCredential.holderName}</div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-sora font-semibold text-brand-dark text-lg leading-tight">{mockCredential.holderName}</p>
                    <p className="text-sm text-gray-500 font-inter mt-1">Verified credential ready to share</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Hash size={12} className="text-brand-blue" />
                      <span className="text-xs text-brand-blue font-mono break-all">{mockCredential.id}</span>
                    </div>
                  </div>
                </div>
                <CheckCircle size={18} className="text-green-500 shrink-0 mt-1" />
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shareOptions.map((option, i) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleShare(option.id)}
                  className={`rounded-xl border p-4 text-left transition-shadow hover:shadow-sm ${option.color}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/70">
                      <option.icon size={18} />
                    </div>
                    <div>
                      <p className="font-sora font-semibold text-sm">{option.label}</p>
                      <p className="text-xs font-inter opacity-80 mt-1">{option.desc}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5 sm:p-6 sticky top-24">
              <h3 className="font-sora font-semibold text-brand-dark text-base mb-1">QR Share</h3>
              <p className="text-xs text-gray-500 font-inter mb-4">Scan to verify this credential instantly.</p>

              <div className="bg-gray-50 rounded-xl p-4 flex justify-center mb-4 border border-gray-100">
                <QRCode value={shareUrl} size={170} />
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 mb-3">
                <p className="text-[11px] text-gray-500 font-inter mb-1">Public Link</p>
                <p className="text-xs font-mono text-brand-blue break-all">{shareUrl}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                icon={Copy}
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success('Link copied to clipboard');
                }}
              >
                Copy Link
              </Button>
            </Card>
          </motion.div>
        </div>

        <div className="mt-5">
          <Button variant="outline" className="w-full" icon={ArrowLeft} onClick={() => navigate('/credential/preview')}>
            Back to Preview
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ShareCredential;
