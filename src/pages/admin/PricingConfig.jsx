import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { verificationTypes } from '@/data/mockData';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const PricingConfig = () => {
  const [prices, setPrices] = useState(Object.fromEntries(verificationTypes.map((v) => [v.id, v.price])));

  return (
    <AuthLayout title="Pricing Config">
      <PageHeader title="Verification Pricing" subtitle="Set per-check costs. Third-party agencies receive 70%, TruMarkZ keeps 30%." />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-5">
          <div className="space-y-3">
            {verificationTypes.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-dark font-inter">{v.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-inter ${v.type === 'api' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {v.type === 'api' ? 'Auto API' : 'Manual'}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-36 shrink-0">
                  <span className="text-sm text-gray-400 font-inter">Rs.</span>
                  <input
                    type="number"
                    value={prices[v.id]}
                    onChange={(e) => setPrices((p) => ({ ...p, [v.id]: parseInt(e.target.value, 10) || 0 }))}
                    className="w-20 rounded-lg border-2 border-gray-200 px-2 py-1.5 font-inter text-sm focus:border-brand-blue outline-none text-brand-dark"
                  />
                </div>

                <div className="w-28 shrink-0 text-right">
                  <p className="text-xs text-gray-400 font-inter">Agency gets</p>
                  <p className="text-sm font-semibold text-green-600 font-inter">Rs. {Math.round(prices[v.id] * 0.7)}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <Button variant="primary" size="lg" className="w-full mt-6" icon={Save} onClick={() => toast.success('Pricing updated')}>
            Save Pricing
          </Button>
        </Card>
      </motion.div>
    </AuthLayout>
  );
};

export default PricingConfig;

