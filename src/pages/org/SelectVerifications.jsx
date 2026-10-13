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

        <Card className="overflow-hidden border border-blue-100 p-3 shadow-[0_18px_48px_-40px_rgba(37,99,235,0.35)] sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-inter text-[11px] font-medium uppercase tracking-[0.14em] text-brand-blue/70">
                Verification Catalog
              </p>
              <h3 className="mt-0.5 font-sora text-base font-semibold text-brand-dark">
                Choose checks for this batch
              </h3>
            </div>
            <div className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-right">
              <p className="font-inter text-[10px] uppercase tracking-[0.14em] text-brand-blue/65">Available</p>
              <p className="font-sora text-base font-semibold text-brand-dark">
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
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
                      'relative flex min-h-[122px] flex-col rounded-xl border p-3 text-left transition-all',
                      isSelected
                        ? 'border-brand-blue bg-brand-blue/[0.06] shadow-[0_16px_34px_-26px_rgba(37,99,235,0.75)]'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
                    )}
                  >
                    {/* Top row: icon + checkbox */}
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className={clsx(
                        'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                        isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
                      )}>
                        {isAuto ? <Zap size={14} /> : <Mail size={14} />}
                      </div>
                      <div className={clsx(
                        'flex h-5 w-5 items-center justify-center rounded-full border transition-colors shrink-0',
                        isSelected
                          ? 'border-brand-blue bg-brand-blue text-white'
                          : 'border-slate-300 bg-white text-transparent'
                      )}>
                        <Check size={11} />
                      </div>
                    </div>

                    {/* Name */}
                    <h4 className="font-inter text-xs font-semibold text-brand-dark leading-4 flex-1">
                      {item.name}
                    </h4>

                    {/* Label + Price + Timeline */}
                    <div className="mt-2 space-y-1.5">
                      <span className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-inter text-[10px] font-medium',
                        isAuto ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                      )}>
                        {isAuto ? <Zap size={9} /> : <Mail size={9} />}
                        {isAuto ? 'Automatic' : 'Manual'}
                      </span>

                      {item.timeline && (
                        <p className="flex items-center gap-1 font-inter text-[10px] text-slate-400">
                          <Clock size={10} />
                          {item.timeline}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-inter text-[10px] uppercase tracking-[0.1em] text-slate-400">
                          Per record
                        </span>
                        <span className="font-sora text-sm font-semibold text-brand-dark">
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

        {/* Floating/sticky — stays visible at the bottom of the viewport
            regardless of scroll, so selecting a card up top never forces a
            scroll all the way down just to hit Continue. The negative
            margins cancel AuthLayout's own page padding so the bar spans
            the full content width instead of floating inset. */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-5 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white/95 px-4 py-2.5 backdrop-blur-sm sm:flex-row sm:justify-end lg:-mx-8 lg:px-8">
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate('/org/industry')}>
            Back
          </Button>
          <Button variant="primary" size="sm" className="w-full sm:w-auto" onClick={handleContinue} icon={ArrowRight}>
            Continue
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectVerifications;
