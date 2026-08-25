import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
} from '@/data/productVerificationFlow';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StepWizard } from '@/components/ui/StepWizard';
import { verificationAPI } from '@/services/api';
import {
  Cpu, Leaf, ArrowRight, ShoppingBag, Car, Shield,
  Activity, Factory, Sprout, Gem, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ICON_MAP = {
  'consumer_goods':         ShoppingBag,
  'beauty_cosmetics':       Leaf,
  'electronics_appliances': Cpu,
  'ev_automotive':          Car,
  'insurance_policies':     Shield,
  'healthcare_products':    Activity,
  'industrial_equipment':   Factory,
  'agriculture_products':   Sprout,
  'luxury_products':        Gem,
  'others':                 Package,
};

const DESC_MAP = {
  'Consumer Goods':          'General consumer product authenticity and quality certificates.',
  'Beauty & Cosmetics':      'Authenticity certificates with lab reports and batch proofs.',
  'Electronics & Appliances':'Warranty and serial-based certificates for devices and appliances.',
  'EV & Automotive':         'Vehicle identification and warranty certificates.',
  'Insurance Policies':      'Policy authenticity and compliance verification.',
  'Healthcare Products':     'Product safety, compliance, and batch certification.',
  'Industrial Equipment':    'Equipment authenticity and warranty certificates.',
  'Agriculture Products':    'Origin, quality, and batch-level product certificates.',
  'Luxury Products':         'Anti-counterfeit and provenance certificates for luxury items.',
  'Others':                  'Custom product verification and certification.',
};

const toId = (name = '') =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');


export const SelectProductSector = () => {
  const navigate = useNavigate();
  const {
    setBatchEntityType,
    setSelectedProductSector,
    setSelectedProductVerifications,
    setSelectedProductService,
    setProductBatchData,
  } = useApp();

  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificationAPI.getIndustryTypes()
      .then(({ data }) => {
        const industryTypes = Array.isArray(data) ? data : [];

        if (industryTypes.length === 0) {
          toast.error('Failed to load industry types');
          return;
        }

        setSectors(industryTypes.map((item) => ({
          id: toId(item.name),
          title: item.name,
          description: DESC_MAP[item.name] || `${item.name} product verification and certificates.`,
          aliases: [],
          fallbackWarranty: item.warranty_support,
          categoryId: '',
          categoryName: item.name,
          warrantySupport: item.warranty_support,
        })));
      })
      .catch(() => toast.error('Failed to load industry types'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (sector) => {
    setBatchEntityType('product');
    setSelectedProductVerifications([]);
    setSelectedProductService(null);
    setProductBatchData(null);
    setSelectedProductSector(sector);
    navigate('/org/product/service');
  };

  return (
    <AuthLayout title="Select Product Industry Type">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={PRODUCT_VERIFICATION_STEPS}
          currentStep={PRODUCT_VERIFICATION_STEP_META.sector.currentStep}
          stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
        />

        <PageHeader
          title="Select Product Industry Type"
          subtitle="Choose the industry type for this product verification batch."
          action={
            <button
              type="button"
              onClick={() => navigate('/org/create-batch')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors font-inter"
            >
              ← Back
            </button>
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {sectors.map((sector, index) => {
              const Icon = ICON_MAP[sector.id] || Package;
              return (
                <motion.button
                  key={sector.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(sector)}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-brand-blue hover:shadow-lg hover:shadow-blue-100/60 group min-h-[210px] focus:outline-none focus:ring-4 focus:ring-brand-blue/15"
                >
                  <span className="absolute inset-y-5 left-0 w-1.5 rounded-r-full bg-brand-blue opacity-90 transition-all duration-300 group-hover:inset-y-4" />

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue transition-all duration-300 group-hover:bg-brand-blue group-hover:text-white">
                    <Icon size={28} />
                  </div>

                  <h3 className="font-sora font-bold text-xl text-brand-dark mt-5 mb-2">
                    {sector.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-inter leading-relaxed">
                    {sector.description}
                  </p>

                  <div className="flex items-center gap-1 mt-4 text-brand-blue text-sm font-inter font-medium">
                    Select <ArrowRight size={14} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default SelectProductSector;
