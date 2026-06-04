import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { verificationTypes } from '@/data/mockData';
import { Check, ArrowRight, Shield, MapPin, FileText, Car, GraduationCap, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const iconMap = {
  identity: Shield, pan: FileText, address: MapPin,
  police: FileText, criminal: FileText, driving: Car,
  education: GraduationCap, compliance: Shield, employment: Briefcase,
};

export const SelectVerifications = () => {
  const navigate = useNavigate();
  const { selectedVerifications, setSelectedVerifications } = useApp();
  const [agreedToCost, setAgreedToCost] = useState(false);

  const toggleVerification = (id) =>
    setSelectedVerifications(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );

  const totalCost = selectedVerifications.reduce((sum, id) => {
    const v = verificationTypes.find(vt => vt.id === id);
    return sum + (v?.price || 0);
  }, 0);

  const handleContinue = () => {
    if (selectedVerifications.length === 0) { toast.error('Select at least one verification'); return; }
    if (!agreedToCost) { toast.error('Please agree to the cost before continuing'); return; }
    navigate('/org/permissions');
  };

  return (
    <AuthLayout title="Select Verifications">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard steps={['Industry', 'Verifications', 'Permissions', 'Template', 'Batch']} currentStep={1} />
        <PageHeader title="Select Verifications" subtitle={`${selectedVerifications.length} selected`} />

        <Card className="p-3 sm:p-6">
          <div className="space-y-3">
            {verificationTypes.map((v, i) => {
              const isSelected = selectedVerifications.includes(v.id);
              const Icon = iconMap[v.id] || Shield;
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggleVerification(v.id)}
                  className={clsx(
                    'flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl cursor-pointer border-2 transition-all',
                    isSelected ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-100 hover:border-gray-200'
                  )}
                >
                  <div className={clsx(
                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0',
                    isSelected ? 'bg-brand-blue border-brand-blue' : 'border-gray-300'
                  )}>
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                    <Icon size={18} className="text-gray-600" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-brand-dark font-inter leading-snug pr-2">{v.name}</span>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
                    {v.type === 'api' ? (
                      <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-inter font-medium whitespace-nowrap">
                        Auto &middot; {v.apiLabel}
                      </span>
                    ) : (
                      <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-inter font-medium whitespace-nowrap">
                        Manual &middot; {v.turnaround}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-brand-dark font-inter whitespace-nowrap">Rs. {v.price}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {selectedVerifications.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 mt-4 border-2 border-brand-blue/20 bg-brand-blue/5">
              <h4 className="font-sora font-semibold text-brand-dark mb-3">Cost per person / product</h4>
              <div className="space-y-2 mb-3">
                {selectedVerifications.map(id => {
                  const v = verificationTypes.find(vt => vt.id === id);
                  return v ? (
                    <div key={id} className="flex justify-between text-sm font-inter">
                      <span className="text-gray-600">{v.name}</span>
                      <span className="font-medium text-brand-dark">Rs. {v.price}</span>
                    </div>
                  ) : null;
                })}
              </div>
              <div className="border-t border-brand-blue/20 pt-3 flex justify-between">
                <span className="font-sora font-semibold text-brand-dark">Total per record</span>
                <span className="font-sora font-bold text-brand-blue text-lg">Rs. {totalCost}</span>
              </div>
              <p className="text-xs text-gray-400 font-inter mt-2">
                * You will be charged this amount x number of records when the batch is submitted
              </p>
            </Card>

            <label className="flex items-start gap-3 cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={agreedToCost}
                onChange={e => setAgreedToCost(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-sm text-gray-600 font-inter">
                I agree to the per-unit cost shown above for this verification batch.
              </span>
            </label>
          </motion.div>
        )}

        <div className="mt-8 flex justify-end">
          <Button variant="primary" size="lg" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectVerifications;
