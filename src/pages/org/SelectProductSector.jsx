import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Leaf, Package, Plug } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { useApp } from '@/context/AppContext';
import {
  PRODUCT_VERIFICATION_STEPS,
  PRODUCT_VERIFICATION_STEP_META,
  PRODUCT_VERIFICATION_STEP_ROUTES,
  PRODUCT_SECTOR_DEFS,
} from '@/data/productVerificationFlow';
import { verificationAPI, getApiError } from '@/services/api';

const normalizeName = (v = '') =>
  v.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

const findCategoryForSector = (sector, categories = []) => {
  const aliases = [sector.title, ...sector.aliases].map(normalizeName);
  return (
    categories.find((cat) => {
      const name = normalizeName(cat.category_name);
      return aliases.some((a) => name.includes(a) || a.includes(name));
    }) || null
  );
};

const SECTOR_ICONS = { electronics_appliances: Plug, beauty_cosmetics: Leaf };

const cardMotion = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.07, duration: 0.26, ease: 'easeOut' },
  whileHover: { y: -3 },
  whileTap: { scale: 0.98 },
});

export const SelectProductSector = () => {
  const navigate = useNavigate();
  const { setSelectedProductSector, setSelectedProductService, setProductBatchData } = useApp();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificationAPI
      .getCategories()
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(getApiError(err, 'Failed to load product categories')))
      .finally(() => setLoading(false));
  }, []);

  const sectors = PRODUCT_SECTOR_DEFS.map((def) => {
    const category = findCategoryForSector(def, categories);
    return {
      ...def,
      category,
      categoryId: category?.id || '',
      categoryName: category?.category_name || def.title,
      warrantySupport: category?.warranty_support || def.fallbackWarranty,
    };
  });

  const handleSelect = (sector) => {
    setSelectedProductSector(sector);
    setSelectedProductService(null);
    setProductBatchData(null);
    navigate('/org/product/service');
  };

  return (
    <AuthLayout title="Select Sector">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={PRODUCT_VERIFICATION_STEPS}
          currentStep={PRODUCT_VERIFICATION_STEP_META.sector.currentStep}
          stepRoutes={PRODUCT_VERIFICATION_STEP_ROUTES}
        />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <PageHeader
            title="Select Product Sector"
            subtitle="Choose the industry sector for this product verification batch."
          />
        </motion.div>

        {loading ? (
          <Card className="p-10 mt-2">
            <div className="flex items-center justify-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-brand-blue/40 border-t-brand-blue rounded-full animate-spin" />
              <span className="text-sm font-inter">Loading sectors…</span>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
            {sectors.map((sector, i) => {
              const Icon = SECTOR_ICONS[sector.id] || Package;
              return (
                <motion.button
                  key={sector.id}
                  {...cardMotion(i)}
                  onClick={() => handleSelect(sector)}
                  className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-lg hover:shadow-blue-100/60 focus:outline-none focus:ring-4 focus:ring-brand-blue/15 group min-h-[220px]"
                >
                  <span className="absolute inset-y-5 left-0 w-1.5 rounded-r-full bg-brand-blue opacity-90 transition-all duration-300 group-hover:inset-y-4" />

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue transition-all duration-300 group-hover:bg-brand-blue group-hover:text-white">
                    <Icon size={28} />
                  </div>

                  <h3 className="font-sora font-bold text-xl text-brand-dark mt-5 mb-2">
                    {sector.categoryName}
                  </h3>
                  <p className="text-sm text-gray-500 font-inter leading-relaxed">
                    {sector.description}
                  </p>

                  {sector.warrantySupport === 'required' && (
                    <span className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-blue-50 text-xs font-semibold text-brand-blue font-inter">
                      Warranty supported
                    </span>
                  )}
                  {sector.warrantySupport === 'disabled' && (
                    <span className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-gray-50 text-xs font-semibold text-gray-400 font-inter">
                      Authenticity only
                    </span>
                  )}
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
