import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { SuccessCheckmark } from '@/components/ui/SuccessCheckmark';
import { StepWizard } from '@/components/ui/StepWizard';
import { Card } from '@/components/ui/Card';
import { Check, Mail, UserCheck } from 'lucide-react';

export const WelcomeKYC = () => {
  const navigate = useNavigate();

  const regType = sessionStorage.getItem('trumarkz_reg_type');
  const isIndividual = regType === 'individual';

  const verifiedItems = [
    { label: 'Email verified successfully', icon: Mail },
    { label: 'Registration completed', icon: UserCheck },
  ];

  const handleContinue = () => {
    sessionStorage.removeItem('trumarkz_reg_type');
    sessionStorage.removeItem('trumarkz_otp_email');
    sessionStorage.removeItem('trumarkz_verified_email');

    if (isIndividual) {
      navigate('/login?type=individual');
    } else {
      // Org: go to login, onboarding happens after first login
      navigate('/login?type=organization');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-6 sm:p-8 text-center">
          {!isIndividual && (
            <StepWizard steps={['Registration', 'OTP Verification', 'Onboarding']} currentStep={2} />
          )}

          <div className="flex justify-center mb-6">
            <SuccessCheckmark size="xl" />
          </div>

          <h2 className="font-sora font-bold text-xl text-brand-dark mb-1">
            {isIndividual ? 'Registration Complete!' : 'Account Verified!'}
          </h2>
          <p className="text-sm text-gray-500 font-inter mb-6">
            {isIndividual
              ? 'Your account is ready. You can now sign in and start building your verified profile.'
              : 'Your email has been verified. Please sign in to complete your organization onboarding.'}
          </p>

          <div className="space-y-3 mb-8">
            {verifiedItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.15 }}
                className="flex items-center gap-3 p-3 bg-green-50 rounded-xl"
              >
                <div className="p-1.5 bg-green-500 rounded-full">
                  <Check size={14} className="text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <item.icon size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700 font-inter">{item.label}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <Button variant="primary" size="lg" className="w-full" onClick={handleContinue}>
            {isIndividual ? 'Go to Login' : 'Sign In to Continue'}
          </Button>
          {!isIndividual && (
            <p className="text-xs text-gray-400 font-inter text-center mt-3">
              You'll complete your organization profile after signing in
            </p>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default WelcomeKYC;
