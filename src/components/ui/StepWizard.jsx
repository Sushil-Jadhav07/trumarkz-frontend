import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export const StepWizard = ({ steps, currentStep }) => {
  return (
    <div
      className="mb-10 pb-1 -mx-1 px-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="min-w-max flex items-start justify-center sm:justify-center gap-2">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center shrink-0 pt-2">
              <motion.div
                animate={{
                  backgroundColor: isActive || isCompleted ? '#2563EB' : '#F3F5F7',
                  color: isActive || isCompleted ? '#FFFFFF' : '#CBD2D9',
                  scale: isActive ? 1.1 : 1
                }}
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-sora border-2',
                  isActive || isCompleted ? 'border-brand-blue' : 'border-brand-gray'
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
                'text-[11px] leading-tight mt-1.5 font-inter font-medium text-center whitespace-nowrap',
                isActive ? 'text-brand-blue' : isCompleted ? 'text-brand-dark' : 'text-brand-gray'
              )}>
                {step}
              </span>
            </div>
            {!isLast && (
              <div className={clsx(
                'w-8 sm:w-12 h-0.5 rounded-full mt-[25px] shrink-0',
                isCompleted ? 'bg-brand-blue' : 'bg-brand-gray'
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
