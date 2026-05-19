import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { StepWizard } from '@/components/ui/StepWizard';
import { industries } from '@/data/mockData';
import {
  Check,
  ArrowRight,
  Truck,
  BriefcaseMedical,
  GraduationCap,
  Factory,
  ShieldCheck,
  Tractor,
  Package,
  Grid2X2
} from 'lucide-react';
import toast from 'react-hot-toast';

const industryIconMap = {
  transport: Truck,
  healthcare: BriefcaseMedical,
  education: GraduationCap,
  manufacturing: Factory,
  security: ShieldCheck,
  agriculture: Tractor,
  products: Package,
  others: Grid2X2
};

const industryDescriptions = {
  transport: 'Driver, fleet, and logistics credential checks.',
  healthcare: 'Staff, licence, and healthcare compliance checks.',
  education: 'Academic records, certificates, and institute proof.',
  manufacturing: 'Factory staff, plant, and compliance verification.',
  security: 'Guard identity, background, and clearance workflows.',
  agriculture: 'Farm, supplier, and origin verification records.',
  products: 'Product certificates, warranties, and batch records.',
  others: 'Custom verification workflows for your organisation.'
};

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
        <StepWizard steps={['Industry', 'Verifications', 'Permissions', 'Template', 'Batch']} currentStep={0} />
        <PageHeader title="Select Industry" subtitle="Choose the industry for your verification batch" />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {industries.map((industry, i) => {
            const isSelected = selectedIndustry?.id === industry.id;
            const Icon = industryIconMap[industry.id] || Grid2X2;
            return (
              <motion.div
                key={industry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedIndustry(industry)}
                className={`relative flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 bg-white p-6 text-center shadow-sm transition-all ${
                  isSelected
                    ? 'border-brand-blue shadow-md shadow-brand-blue/10'
                    : 'border-gray-100 hover:border-brand-blue/30 hover:shadow-md'
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: isSelected ? 1.06 : 1 }}
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all ${
                    isSelected
                      ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/25'
                      : 'bg-brand-blue/10 text-brand-blue'
                  }`}
                >
                  <Icon size={30} strokeWidth={2.2} />
                </motion.div>

                <p className="font-inter text-lg font-semibold text-brand-dark">{industry.name}</p>
                <p className="mt-2 max-w-[300px] text-sm leading-6 text-gray-500">
                  {industryDescriptions[industry.id] || 'Verification workflow for this industry.'}
                </p>

                <motion.div
                  initial={false}
                  animate={{ scale: isSelected ? 1 : 0.85, opacity: isSelected ? 1 : 0 }}
                  className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-white shadow-sm"
                >
                  <Check size={16} />
                </motion.div>
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

