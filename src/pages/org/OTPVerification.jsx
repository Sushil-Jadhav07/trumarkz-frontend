import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { OTPInput } from '@/components/ui/OTPInput';
import { StepWizard } from '@/components/ui/StepWizard';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, AlertCircle, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export const OTPVerification = () => {
  const navigate = useNavigate();
  const { verifyOTP } = useAuth();

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  const [identifier, setIdentifier] = useState(() => sessionStorage.getItem('trumarkz_otp_identifier') || '');
  const [purpose] = useState(() => sessionStorage.getItem('trumarkz_otp_purpose') || 'registration');
  const [regType] = useState(() => sessionStorage.getItem('trumarkz_reg_type') || 'org');
  const [stepLabel, setStepLabel] = useState(() => {
    const email = sessionStorage.getItem('trumarkz_otp_email') || '';
    const current = sessionStorage.getItem('trumarkz_otp_identifier') || '';
    return current && email && current !== email ? 'mobile' : 'email';
  });

  useEffect(() => {
    if (!identifier) {
      console.warn('[OTPVerification] No identifier in sessionStorage. Registration state may have been lost.');
    }
  }, [identifier]);

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    if (!identifier) {
      setError('Session expired. Please go back and register again.');
      return;
    }

    setSubmitting(true);
    const result = await verifyOTP(otp, identifier, purpose);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Invalid or expired OTP. Please try again.');
      return;
    }

    if (!result.complete && result.nextIdentifier) {
      setIdentifier(result.nextIdentifier);
      setStepLabel('mobile');
      setOtp('');
      setTimer(30);
      setCanResend(false);
      setError('');
      toast.success(result.message || 'Email verified. Please enter your mobile OTP.');
      return;
    }

    toast.success(result.message || 'Registration complete! You can now sign in.');
    navigate('/welcome');
  };

  const backRoute = regType === 'individual' ? '/register/individual' : '/register';
  const Icon = stepLabel === 'mobile' ? Phone : Mail;
  const targetLabel = stepLabel === 'mobile' ? 'mobile number' : 'email address';

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <StepWizard steps={['Registration', 'OTP', 'Welcome']} currentStep={1} />

          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <Icon size={22} />
            </div>
            <h2 className="font-sora font-bold text-xl text-brand-dark mb-1">
              Verify {stepLabel === 'mobile' ? 'Mobile' : 'Email'}
            </h2>
            {identifier ? (
              <p className="text-sm text-gray-500 font-inter">
                Enter the 6-digit OTP sent to your {targetLabel}<br />
                <span className="font-semibold text-brand-dark">{identifier}</span>
              </p>
            ) : (
              <div className="flex items-center justify-center gap-2 text-orange-500 text-sm mt-1">
                <AlertCircle size={16} />
                <span className="font-inter">Session lost. Please go back and register again.</span>
              </div>
            )}
            <p className="text-xs text-gray-400 font-inter mt-1">OTP expires in 10 minutes</p>
          </div>

          <div className="mb-6">
            <OTPInput
              value={otp}
              onChange={(val) => { setOtp(val); setError(''); }}
              error={!!error}
              disabled={!identifier}
            />
            {error && (
              <p className="text-center text-xs text-red-500 font-inter mt-2 flex items-center justify-center gap-1">
                <AlertCircle size={12} /> {error}
              </p>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full mb-4"
            onClick={handleVerify}
            disabled={submitting || !identifier}
          >
            {submitting ? 'Verifying...' : stepLabel === 'mobile' ? 'Verify Mobile & Create Account' : 'Verify OTP'}
          </Button>

          <div className="text-center">
            {canResend ? (
              <p className="text-sm text-gray-500 font-inter">
                OTP expired? Please go back and register again.
              </p>
            ) : (
              <p className="text-sm text-gray-500 font-inter">
                OTP expires in <span className="font-semibold text-brand-dark">00:{timer.toString().padStart(2, '0')}</span>
              </p>
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate(backRoute)}
              className="text-sm text-brand-blue font-inter hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back to Registration
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default OTPVerification;
