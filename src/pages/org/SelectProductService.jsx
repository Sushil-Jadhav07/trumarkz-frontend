import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
  PRODUCT_SERVICE_OPTIONS,
} from '@/data/productVerificationFlow';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { StepWizard } from '@/components/ui/StepWizard';
import { BadgeCheck, Award, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const SERVICE_ICONS = { verification: BadgeCheck, warranty: Award };

export const SelectProductService = () => {
  const navigate = useNavigate();
  const {
    selectedProductSector,
    selectedProductService,
    setSelectedProductService,
    setProductBatchData,
  } = useApp();

  useEffect(() => {
    if (!selectedProductSector) {
      navigate('/org/product/sector', { replace: true });
    }
  }, [selectedProductSector, navigate]);

  // Beauty & Cosmetics doesn't support warranty
  const warrantyDisabled = selectedProductSector?.warrantySupport === 'disabled';

  const availableServices = PRODUCT_SERVICE_OPTIONS.filter(
    (s) => !(s.id === 'warranty' && warrantyDisabled)
  );

  const handleSelect = (service) => {
    setSelectedProductService(service);
    setProductBatchData(null);
  };

  const handleContinue = () => {
    if (!selectedProductService) {
      toast.error('Please select a product service');
      return;
    }
    toast.success(`${selectedProductService.title} selected`);
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

        <PageHeader
          title="Product Service"
          subtitle="Choose the product certification type for this batch."
        />

        <div className="grid gap-4 md:grid-cols-2">
          {availableServices.map((service, index) => {
            const isSelected = selectedProductService?.id === service.id;
            const Icon = SERVICE_ICONS[service.id] || BadgeCheck;

            return (
              <motion.button
                key={service.id}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => handleSelect(service)}
                className={clsx(
                  'flex min-h-[180px] flex-col rounded-2xl border p-5 text-left transition-all focus:outline-none focus:ring-4 focus:ring-brand-blue/15',
                  isSelected
                    ? 'border-brand-blue bg-brand-blue/[0.05] shadow-[0_16px_30px_-28px_rgba(37,99,235,0.55)]'
                    : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/20'
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className={clsx(
                    'flex h-12 w-12 items-center justify-center rounded-2xl transition-all',
                    isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-500'
                  )}>
                    <Icon size={22} strokeWidth={2.1} />
                  </div>

                  <div className={clsx(
                    'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                    isSelected ? 'border-brand-blue bg-brand-blue' : 'border-slate-300 bg-white'
                  )}>
                    {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-sora text-lg font-semibold text-brand-dark">
                    {service.title}
                  </h3>
                  <p className="mt-2 font-inter text-sm leading-6 text-slate-500">
                    {service.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {warrantyDisabled && (
          <p className="mt-3 font-inter text-xs text-slate-400">
            Warranty certificates are not available for the{' '}
            <span className="font-semibold">{selectedProductSector?.title}</span> sector.
          </p>
        )}

        <div className="mt-8 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={handleContinue}
            icon={ArrowRight}
            disabled={!selectedProductService}
          >
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectProductService;
