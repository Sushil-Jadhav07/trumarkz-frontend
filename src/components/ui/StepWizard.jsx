import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export const StepWizard = ({ steps, currentStep }) => {
  return (
    <div className="mb-10 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="min-w-max rounded-[32px] border border-slate-200/80 bg-white px-6 py-7 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.25)] sm:px-10">
        <div className="flex items-start justify-center gap-0">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isLast = index === steps.length - 1;

            return (
              <React.Fragment key={step}>
                <div className="flex min-w-[128px] flex-col items-center shrink-0">
                  <motion.div
                    animate={{
                      backgroundColor: isActive ? '#2563EB' : '#FFFFFF',
                      borderColor: isActive || isCompleted ? '#2563EB' : '#D6E0EC',
                      color: isActive ? '#FFFFFF' : isCompleted ? '#2563EB' : '#94A3B8',
                      scale: isActive ? 1.02 : 1,
                    }}
                    className={clsx(
                      'flex h-11 w-11 items-center justify-center rounded-full border text-base font-semibold font-sora transition-colors'
                    )}
                  >
                    {isCompleted ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </motion.div>
                  <span
                    className={clsx(
                      'mt-4 text-sm font-medium font-inter whitespace-nowrap text-center',
                      isActive ? 'text-brand-blue' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    )}
                  >
                    {step}
                  </span>
                </div>
                {!isLast && (
                  <div className="flex w-16 items-center justify-center pt-5 sm:w-28">
                    <div
                      className={clsx(
                        'h-px w-full rounded-full',
                        isCompleted ? 'bg-brand-blue/55' : 'bg-slate-200'
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StepWizard;
