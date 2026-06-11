import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META, HUMAN_VERIFICATION_STEP_ROUTES } from '@/data/humanVerificationFlow';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { verificationAPI, getApiError } from '@/services/api';
import { ArrowRight, Check, Clock, Mail, RefreshCw, Shield, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export const SelectVerifications = () => {
  const navigate = useNavigate();
  const {
    batchEntityType,
    selectedIndustry,
    selectedVerifications,
    setSelectedVerifications,
  } = useApp();

  const [allTypes, setAllTypes] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Stable string key — prevents infinite refetch when object reference changes
  const industryKey = (() => {
    if (!selectedIndustry) return '';
    const list = Array.isArray(selectedIndustry) ? selectedIndustry : [selectedIndustry];
    return list.map((ind) => ind?.name).filter(Boolean).sort().join(',');
  })();

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const names = industryKey ? industryKey.split(',') : [];
      const { data } = await verificationAPI.getVerificationTypes({
        category:      batchEntityType || 'human',
        industry_type: names.length > 0 ? names : undefined,
      });
      const list = Array.isArray(data)
        ? data
        : (data?.verification_types || data?.types || data?.items || []);
      setAllTypes(list);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load verification types'));
      setAllTypes([]);
    } finally {
      setLoading(false);
    }
  }, [batchEntityType, industryKey]);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const verificationTypes = allTypes;

  const toggleVerification = (id) => {
    setSelectedVerifications((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    if (selectedVerifications.length === 0) {
      toast.error('Select at least one verification');
      return;
    }
    navigate('/org/permissions');
  };

  return (
    <AuthLayout title="Select Verifications">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={HUMAN_VERIFICATION_STEPS}
          currentStep={HUMAN_VERIFICATION_STEP_META.verifications.currentStep}
          stepRoutes={HUMAN_VERIFICATION_STEP_ROUTES}
        />
        <PageHeader
          title="Select Verifications"
          subtitle={`${selectedVerifications.length} selected`}
        />

        <Card className="overflow-hidden border border-blue-100 p-4 shadow-[0_18px_48px_-40px_rgba(37,99,235,0.35)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-inter text-xs font-medium uppercase tracking-[0.14em] text-brand-blue/70">
                Verification Catalog
              </p>
              <h3 className="mt-1 font-sora text-lg font-semibold text-brand-dark">
                Choose checks for this batch
              </h3>
            </div>
            <div className="rounded-xl bg-blue-50 px-3 py-2 text-right">
              <p className="font-inter text-[11px] uppercase tracking-[0.14em] text-brand-blue/65">Available</p>
              <p className="font-sora text-lg font-semibold text-brand-dark">
                {loading ? '…' : verificationTypes.length}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw size={24} className="animate-spin text-brand-blue" />
              <p className="text-sm text-gray-400 font-inter">Loading verification types…</p>
            </div>
          ) : verificationTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Shield size={32} className="text-gray-200" />
              <p className="text-sm font-medium text-gray-400 font-inter">
                No verification types found for the selected industries
              </p>
              <p className="text-xs text-gray-400 font-inter">
                Go back and adjust your industry selection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {verificationTypes.map((item, index) => {
                const isSelected = selectedVerifications.includes(item.id);
                const isAuto     = item.label === 'automatic';

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => toggleVerification(item.id)}
                    className={clsx(
                      'relative flex min-h-[160px] flex-col rounded-2xl border p-4 text-left transition-all',
                      isSelected
                        ? 'border-brand-blue bg-brand-blue/[0.06] shadow-[0_16px_34px_-26px_rgba(37,99,235,0.75)]'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
                    )}
                  >
                    {/* Top row: icon + checkbox */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className={clsx(
                        'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
                        isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
                      )}>
                        {isAuto ? <Zap size={18} /> : <Mail size={18} />}
                      </div>
                      <div className={clsx(
                        'flex h-6 w-6 items-center justify-center rounded-full border transition-colors shrink-0',
                        isSelected
                          ? 'border-brand-blue bg-brand-blue text-white'
                          : 'border-slate-300 bg-white text-transparent'
                      )}>
                        <Check size={13} />
                      </div>
                    </div>

                    {/* Name */}
                    <h4 className="font-inter text-sm font-semibold text-brand-dark leading-5 flex-1">
                      {item.name}
                    </h4>

                    {/* Label + Price + Timeline */}
                    <div className="mt-3 space-y-2">
                      <span className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-inter text-[11px] font-medium',
                        isAuto ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                      )}>
                        {isAuto ? <Zap size={10} /> : <Mail size={10} />}
                        {isAuto ? 'Automatic' : 'Manual'}
                      </span>

                      {item.timeline && (
                        <p className="flex items-center gap-1 font-inter text-[11px] text-slate-400">
                          <Clock size={11} />
                          {item.timeline}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-inter text-[11px] uppercase tracking-[0.12em] text-slate-400">
                          Per record
                        </span>
                        <span className="font-sora text-base font-semibold text-brand-dark">
                          ₹{item.price ?? 0}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </Card>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" size="lg" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectVerifications;
