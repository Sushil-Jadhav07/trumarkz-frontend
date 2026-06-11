import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
  PRODUCT_SECTOR_DEFS,
} from '@/data/productVerificationFlow';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StepWizard } from '@/components/ui/StepWizard';
import { verificationAPI } from '@/services/api';
import { Cpu, Leaf, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const SECTOR_ICONS = { electronics_appliances: Cpu, beauty_cosmetics: Leaf };

const normalizeName = (v = '') =>
  v.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

const matchCategory = (sector, categories = []) => {
  const aliases = [sector.title, ...sector.aliases].map(normalizeName);
  return (
    categories.find((c) => {
      const name = normalizeName(c.category_name);
      return aliases.some((a) => name.includes(a) || a.includes(name));
    }) || null
  );
};

export const SelectProductSector = () => {
  const navigate = useNavigate();
  const {
    setBatchEntityType,
    setSelectedProductSector,
    setSelectedProductVerifications,
    setSelectedProductService,
    setProductBatchData,
  } = useApp();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificationAPI
      .getCategories()
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load product sectors'))
      .finally(() => setLoading(false));
  }, []);

  const sectors = PRODUCT_SECTOR_DEFS.map((def) => {
    const category = matchCategory(def, categories);
    return {
      ...def,
      category,
      categoryId: category?.id || '',
      categoryName: category?.category_name || def.title,
      warrantySupport: category?.warranty_support || def.fallbackWarranty,
    };
  });

  const handleSelect = (sector) => {
    setBatchEntityType('product');
    setSelectedProductVerifications([]);
    setSelectedProductService(null);
    setProductBatchData(null);
    setSelectedProductSector(sector);
    navigate('/org/product/verifications');
  };

  return (
    <AuthLayout title="Select Product Sector">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={PRODUCT_VERIFICATION_STEPS}
          currentStep={PRODUCT_VERIFICATION_STEP_META.sector.currentStep}
          stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
        />

        <PageHeader
          title="Select Product Sector"
          subtitle="Choose the sector category for this product verification batch."
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {sectors.map((sector, index) => {
              const Icon = SECTOR_ICONS[sector.id] || Cpu;
              return (
                <motion.button
                  key={sector.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
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
