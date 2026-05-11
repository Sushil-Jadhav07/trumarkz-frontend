import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { Check, ArrowRight, Truck, Heart, GraduationCap, Package, Wrench, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const templates = [
  {
    id: 'T1', name: 'Workforce / Driver ID',
    desc: 'Transport, security, logistics',
    fields: 'Photo · Name · Designation · Licence No · QR',
    icon: Truck, iconBg: 'bg-blue-50', iconColor: 'text-brand-blue',
  },
  {
    id: 'T2', name: 'Healthcare / Nurse',
    desc: 'Hospitals, nursing colleges',
    fields: 'Photo · Name · Qualification · Reg No · QR',
    icon: Heart, iconBg: 'bg-red-50', iconColor: 'text-red-500',
  },
  {
    id: 'T3', name: 'Education / Student',
    desc: 'Colleges, universities, institutes',
    fields: 'Photo · Name · Course · Institution · Year · QR',
    icon: GraduationCap, iconBg: 'bg-purple-50', iconColor: 'text-purple-600',
  },
  {
    id: 'T4', name: 'Product / Compliance',
    desc: 'Manufacturers, organic goods, e-commerce',
    fields: 'Product Name · Batch No · Compliance · Issued By · QR',
    icon: Package, iconBg: 'bg-orange-50', iconColor: 'text-orange-500',
  },
  {
    id: 'T5', name: 'Service / Professional',
    desc: 'Freelancers, engineers, tradespeople',
    fields: 'Photo · Name · Skill · Experience · Verified By · QR',
    icon: Wrench, iconBg: 'bg-green-50', iconColor: 'text-green-600',
  },
  {
    id: 'T6', name: 'Skill Tree Credential',
    desc: 'Individual verified digital resume',
    fields: 'Photo · Name · Skill Nodes · Credential IDs · QR',
    icon: GitBranch, iconBg: 'bg-teal-50', iconColor: 'text-teal-600',
  },
];

export const SelectTemplate = () => {
  const navigate = useNavigate();
  const { selectedTemplate, setSelectedTemplate } = useApp();

  const handleContinue = () => {
    if (!selectedTemplate) { toast.error('Please select a template'); return; }
    navigate('/credential/fields');
  };

  return (
    <AuthLayout title="Choose Template">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard steps={['Template', 'Fields', 'Preview', 'Share']} currentStep={0} />
        <PageHeader title="Choose Template" subtitle="Select a credential template design" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((template, i) => {
            const isSelected = selectedTemplate?.id === template.id;
            const Icon = template.icon;
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelectedTemplate(template)}
                className={clsx(
                  'cursor-pointer rounded-xl border-2 p-5 transition-all',
                  isSelected
                    ? 'border-brand-blue bg-brand-blue/5 shadow-md'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-xl ${template.iconBg}`}>
                    <Icon size={22} className={template.iconColor} />
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </div>
                <h3 className="font-sora font-semibold text-brand-dark mb-1">{template.name}</h3>
                <p className="text-xs text-gray-400 font-inter mb-2">{template.desc}</p>
                <p className="text-xs text-gray-500 font-inter border-t border-gray-100 pt-2 mt-2">
                  {template.fields}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <Button variant="primary" size="lg" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectTemplate;
