import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Check, ArrowRight, Shield, MapPin, FileText, GraduationCap } from 'lucide-react';
import { verificationTypes } from '@/data/mockData';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const iconMap = {
  identity: Shield,
  address: MapPin,
  police: FileText,
  driving: Shield,
  education: GraduationCap,
  idnumber: Shield,
  photo: Shield,
  employment: Shield
};

export const SelectDocuments = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(['identity', 'address']);

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const total = selected.reduce((sum, id) => {
    const v = verificationTypes.find(t => t.id === id);
    return sum + (v?.price || 0);
  }, 0);

  const handleContinue = () => {
    if (selected.length === 0) {
      toast.error('Select at least one document');
      return;
    }
    navigate('/marketplace/payment');
  };

  return (
    <AuthLayout title="Available Documents">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader title="Available Documents" subtitle="Select documents to purchase" />

        <Card className="p-6 mb-4">
          <div className="space-y-3">
            {verificationTypes.map((v, i) => {
              const isSelected = selected.includes(v.id);
              const Icon = iconMap[v.id] || Shield;
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggle(v.id)}
                  className={clsx(
                    'flex items-center justify-between p-4 rounded-xl cursor-pointer border-2 transition-all',
                    isSelected
                      ? 'border-brand-blue bg-brand-blue/5'
                      : 'border-gray-100 hover:border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected ? 'bg-brand-blue border-brand-blue' : 'border-gray-300'
                    )}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon size={16} className="text-gray-600" />
                    </div>
                    <span className="text-sm font-medium text-brand-dark font-inter">{v.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-dark font-inter">₹{v.price}</span>
                </motion.div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 font-inter">{selected.length} documents selected</span>
            <span className="font-sora font-bold text-xl text-brand-dark">₹{total}</span>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" size="lg" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectDocuments;
