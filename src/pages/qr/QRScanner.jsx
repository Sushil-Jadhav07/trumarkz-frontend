import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Camera, Keyboard } from 'lucide-react';
import toast from 'react-hot-toast';

export const QRScanner = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (scanning) {
      const timer = setTimeout(() => {
        toast.success('QR Code scanned');
        navigate('/qr/result');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [scanning, navigate]);

  return (
    <AuthLayout title="QR Scanner">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader title="QR Scanner" subtitle="Scan a credential QR code" />

        <Card className="p-6">
          <div className="relative bg-brand-dark rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
            {/* Corner brackets */}
            <div className="absolute top-6 left-6 w-8 h-8 border-l-4 border-t-4 border-brand-blue rounded-tl-lg" />
            <div className="absolute top-6 right-6 w-8 h-8 border-r-4 border-t-4 border-brand-blue rounded-tr-lg" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-l-4 border-b-4 border-brand-blue rounded-bl-lg" />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-r-4 border-b-4 border-brand-blue rounded-br-lg" />

            {/* Camera icon */}
            <div className="text-white/30">
              <Camera size={48} />
            </div>

            {/* Scan line */}
            {scanning && (
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-brand-blue shadow-lg shadow-brand-blue/50"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              />
            )}

            {/* Label */}
            <div className="absolute bottom-10 bg-brand-blue/80 backdrop-blur-sm text-white text-xs font-medium px-4 py-1.5 rounded-full font-inter">
              Scan Credential QR
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 font-inter mb-4">
              Position the QR code within the frame to scan
            </p>
            <Button variant="outline" size="md" icon={Keyboard} onClick={() => {
              setScanning(false);
              toast('Manual entry mode');
            }}>
              Enter Code Manually
            </Button>
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
};

export default QRScanner;
