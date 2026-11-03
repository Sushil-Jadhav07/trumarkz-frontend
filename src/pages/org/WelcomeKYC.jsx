import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SuccessCheckmark } from '@/components/ui/SuccessCheckmark';
import { HeroPanel, AuthStepper, AuthTopBar } from '@/components/auth/AuthShell';
import { ArrowRight, Building2, Check, Mail, UserCheck } from 'lucide-react';

// Shown after the OTP is verified. It stays until the user continues: the account has no session
// yet, so "continue" goes to sign-in, and an organization then lands on its onboarding step.
export const WelcomeKYC = () => {
  const navigate = useNavigate();

  const regType = sessionStorage.getItem('trumarkz_reg_type');
  const isIndividual = regType === 'individual';
  const loginRoute = isIndividual ? '/login?type=individual' : '/login?type=organization';

  const handleContinue = () => {
    sessionStorage.removeItem('trumarkz_reg_type');
    sessionStorage.removeItem('trumarkz_otp_email');
    sessionStorage.removeItem('trumarkz_verified_email');
    navigate(loginRoute, { replace: true });
  };

  const doneItems = [
    { label: 'Email verified successfully', icon: Mail },
    { label: 'Registration completed', icon: UserCheck },
  ];

  return (
    <div className="flex h-[100dvh] gap-5 overflow-hidden bg-white p-3 sm:p-5">
      <HeroPanel />

      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-8">
        <AuthTopBar />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto my-auto w-full max-w-[740px] pb-3"
        >
          <AuthStepper
            steps={isIndividual ? ['Registration', 'OTP verification', 'Welcome'] : ['Registration', 'OTP verification', 'Onboarding']}
            current={2}
          />

          <div className="mx-auto mt-6 w-full max-w-[440px] text-center">
            <SuccessCheckmark size="md" />
            <h1 className="mt-3 font-inter text-[26px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark">
              {isIndividual ? 'Registration complete' : 'Account verified'}
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#5b6a85] font-inter">
              {isIndividual
                ? 'Your account is ready. Sign in to start building your verified profile.'
                : 'Your email is verified. Sign in to complete your organization profile.'}
            </p>

            <ul className="mt-6 space-y-2.5 text-left">
              {doneItems.map((item, index) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.12 }}
                  className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-3.5 py-2.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <item.icon size={16} strokeWidth={1.75} className="text-green-600" />
                  <span className="text-[13px] font-medium text-green-700 font-inter">{item.label}</span>
                </motion.li>
              ))}
              {!isIndividual && (
                <motion.li
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-3 rounded-xl border border-[#dfe6f1] bg-white px-3.5 py-2.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#c5d1e4]" />
                  <Building2 size={16} strokeWidth={1.75} className="text-brand-blue" />
                  <span className="text-[13px] text-[#3d4b66] font-inter">Next: complete your organization profile</span>
                </motion.li>
              )}
            </ul>

            <button
              type="button"
              onClick={handleContinue}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover"
            >
              {isIndividual ? 'Go to sign in' : 'Sign in to continue'} <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomeKYC;
