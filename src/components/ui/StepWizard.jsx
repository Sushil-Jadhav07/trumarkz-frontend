import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export const StepWizard = ({ steps, currentStep, stepRoutes }) => {
  const navigate   = useNavigate();
  const safeTotal  = Math.max(steps.length - 1, 1);
  const progress   = steps.length > 1 ? (currentStep / safeTotal) * 100 : 100;

  const handleStepClick = (index) => {
    if (index >= currentStep) return;           // only completed steps
    if (!stepRoutes?.[index]) return;           // no route defined
    navigate(stepRoutes[index]);
  };

  return (
    <div className="mb-6 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="min-w-max px-2 py-2 sm:px-3">
        <div className="mb-2 flex items-center justify-end gap-3 px-1">
          <p className="font-inter text-[11px] font-semibold text-brand-blue">
            {Math.round(progress)}%
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-[18px] right-[18px] top-[16px] h-[3px] rounded-full bg-slate-200 sm:left-[20px] sm:right-[20px]" />
          <motion.div
            className="absolute left-[18px] top-[16px] h-[3px] rounded-full bg-brand-blue sm:left-[20px]"
            initial={{ width: 0 }}
            animate={{ width: `calc((100% - ${steps.length > 1 ? '36px' : '0px'}) * ${Math.min(Math.max(progress, 0), 100) / 100})` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />

          <div className="relative flex items-start justify-between gap-5 sm:gap-7">
            {steps.map((step, index) => {
              const isActive    = index === currentStep;
              const isCompleted = index < currentStep;
              const isClickable = isCompleted && !!stepRoutes?.[index];

              return (
                <div
                  key={step}
                  className={clsx(
                    'flex min-w-[84px] shrink-0 flex-col items-center text-center sm:min-w-[104px]',
                    isClickable && 'group'
                  )}
                  onClick={() => handleStepClick(index)}
                  style={{ cursor: isClickable ? 'pointer' : 'default' }}
                >
                  <motion.div
                    animate={{
                      backgroundColor: isActive ? '#2563EB' : isCompleted ? '#2563EB' : '#FFFFFF',
                      borderColor: isActive || isCompleted ? '#2563EB' : '#CBD5E1',
                      color: '#FFFFFF',
                      scale: isActive ? 1.03 : 1,
                    }}
                    whileHover={isClickable ? { scale: 1.12, boxShadow: '0 0 0 4px rgba(37,99,235,0.18)' } : {}}
                    transition={{ duration: 0.2 }}
                    className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-white text-sm font-semibold font-sora sm:h-9 sm:w-9"
                  >
                    {isCompleted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className={clsx(!isActive && !isCompleted && 'text-slate-400')}>{index + 1}</span>
                    )}
                  </motion.div>

                  <span
                    className={clsx(
                      'mt-2 max-w-[88px] text-xs font-medium font-inter leading-tight sm:max-w-[104px] sm:text-[13px]',
                      isActive    ? 'text-brand-blue' :
                      isCompleted ? 'text-slate-700 group-hover:text-brand-blue transition-colors' :
                                    'text-slate-400'
                    )}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepWizard;
