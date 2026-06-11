import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Award, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { StepWizard } from '@/components/ui/StepWizard';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
  PRODUCT_SERVICE_OPTIONS,
} from '@/data/productVerificationFlow';

const SERVICE_ICONS = { verification: BadgeCheck, warranty: Award };

const cardMotion = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.08, duration: 0.26, ease: 'easeOut' },
});

export const SelectProductService = () => {
  const navigate = useNavigate();
  const {
    selectedProductSector,
    selectedProductService,
    setSelectedProductService,
  } = useApp();

  // Guard: if no sector selected, redirect back
  if (!selectedProductSector) {
    navigate('/org/product/sector', { replace: true });
    return null;
  }

  const warrantyDisabled = selectedProductSector?.warrantySupport === 'disabled';

  const handleSelect = (service) => {
    if (service.id === 'warranty' && warrantyDisabled) {
      toast.error(`Warranty is not available for ${selectedProductSector.categoryName}`);
      return;
    }
    setSelectedProductService(service);
  };

  const handleContinue = () => {
    if (!selectedProductService) {
      toast.error('Please select a product service type');
      return;
    }
    navigate('/org/product/template');
  };

  return (
    <AuthLayout title="Product Service">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={PRODUCT_VERIFICATION_STEPS}
          currentStep={PRODUCT_VERIFICATION_STEP_META.service.currentStep}
          stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
        />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/org/product/sector')}
              className="text-sm text-gray-400 hover:text-brand-blue font-inter transition-colors"
            >
              ← Back
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500 font-inter">
              {selectedProductSector.categoryName}
            </span>
          </div>

          <PageHeader
            title="Product Service"
            subtitle="Choose the product certification type for this batch."
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
          {PRODUCT_SERVICE_OPTIONS.map((service, i) => {
            const Icon = SERVICE_ICONS[service.id] || BadgeCheck;
            const isSelected = selectedProductService?.id === service.id;
            const isDisabled = service.id === 'warranty' && warrantyDisabled;

            return (
              <motion.button
                key={service.id}
                {...cardMotion(i)}
                type="button"
                onClick={() => handleSelect(service)}
                disabled={isDisabled}
                className={clsx(
                  'relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-brand-blue/15 min-h-[180px]',
                  isDisabled
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'border-brand-blue bg-brand-blue/[0.05] shadow-[0_16px_30px_-28px_rgba(37,99,235,0.55)]'
                    : 'border-gray-200 bg-white hover:border-brand-blue hover:shadow-lg hover:shadow-blue-100/60 hover:-translate-y-0.5'
                )}
              >
                {isSelected && (
                  <span className="absolute inset-y-5 left-0 w-1.5 rounded-r-full bg-brand-blue opacity-90" />
                )}

                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className={clsx(
                      'flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300',
                      isSelected
                        ? 'bg-brand-blue text-white'
                        : 'bg-blue-50 text-brand-blue'
                    )}
                  >
                    <Icon size={24} />
                  </div>

                  <div
                    className={clsx(
                      'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                      isSelected
                        ? 'border-brand-blue bg-brand-blue'
                        : 'border-gray-300 bg-white'
                    )}
                  >
                    {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                </div>

                <h3 className="font-sora font-bold text-lg text-brand-dark mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-gray-500 font-inter leading-relaxed">
                  {service.description}
                </p>

                {isDisabled && (
                  <p className="mt-3 text-xs text-gray-400 font-inter">
                    Not available for {selectedProductSector.categoryName}
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={handleContinue}
            disabled={!selectedProductService}
          >
            Continue →
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectProductService;
