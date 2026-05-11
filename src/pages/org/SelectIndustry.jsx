import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { industries } from '@/data/mockData';
import { Check, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const SelectIndustry = () => {
  const navigate = useNavigate();
  const { selectedIndustry, setSelectedIndustry } = useApp();

  const handleContinue = () => {
    if (!selectedIndustry) {
      toast.error('Please select an industry');
      return;
    }
    toast.success(`${selectedIndustry.name} selected`);
    navigate('/org/verifications');
  };

  return (
    <AuthLayout title="Select Industry">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard steps={['Industry', 'Verifications', 'Template', 'Batch']} currentStep={0} />
        <PageHeader title="Select Industry" subtitle="Choose the industry for your verification batch" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {industries.map((industry, i) => {
            const isSelected = selectedIndustry?.id === industry.id;
            return (
              <motion.div
                key={industry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedIndustry(industry)}
                className={`cursor-pointer rounded-xl border-2 p-5 text-center transition-all ${
                  isSelected
                    ? 'border-brand-blue bg-brand-blue/5 shadow-md'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="text-3xl mb-3">{industry.icon}</div>
                <p className="font-medium text-brand-dark font-inter text-sm">{industry.name}</p>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-2"
                  >
                    <Check size={16} className="mx-auto text-brand-blue" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectIndustry;

