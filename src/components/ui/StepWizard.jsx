import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export const StepWizard = ({ steps, currentStep }) => {
  return (
    <div
      className="pb-1 -mx-1 px-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="min-w-max flex items-start justify-center gap-2.5 sm:gap-3">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step}>
            <div className="flex min-w-[78px] flex-col items-center shrink-0 pt-2">
              <motion.div
                animate={{
                  backgroundColor: isActive || isCompleted ? '#2563EB' : '#FFFFFF',
                  color: isActive || isCompleted ? '#FFFFFF' : '#94A3B8',
                  scale: isActive ? 1.05 : 1
                }}
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold font-sora shadow-sm',
                  isActive || isCompleted
                    ? 'border-brand-blue shadow-[0_16px_30px_-18px_rgba(37,99,235,0.65)]'
                    : 'border-slate-200 bg-white'
                )}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </motion.div>
              <span className={clsx(
                'mt-2.5 text-center text-[11px] font-inter font-medium leading-tight whitespace-nowrap',
                isActive ? 'text-brand-blue' : isCompleted ? 'text-slate-700' : 'text-slate-400'
              )}>
                {step}
              </span>
            </div>
            {!isLast && (
              <div className={clsx(
                'mt-[28px] h-[2px] w-10 shrink-0 rounded-full sm:w-14',
                isCompleted ? 'bg-brand-blue' : 'bg-slate-200'
              )} />
            )}
          </React.Fragment>
        );
      })}
      </div>
    </div>
  );
};

export default StepWizard;
