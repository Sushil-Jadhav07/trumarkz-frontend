import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { OTPInput } from '@/components/ui/OTPInput';
import { StepWizard } from '@/components/ui/StepWizard';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, AlertCircle, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const OTPVerification = () => {
  const navigate = useNavigate();
  const { verifyOTP, resendOTP } = useAuth();

  const email = sessionStorage.getItem('trumarkz_otp_email') || '';
  const regType = sessionStorage.getItem('trumarkz_reg_type') || 'org';
  const isOrg = regType === 'org' || regType === 'organization';

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!email) {
      toast.error('Session expired. Please register again.');
      navigate(isOrg ? '/org-registration' : '/register/individual');
    }
  }, [email]);

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  const handleVerify = async () => {
    if (otp.length !== 6) { setError('Please enter all 6 digits'); return; }
    if (!email) { setError('Session expired. Please go back and register again.'); return; }

    setSubmitting(true);
    const result = await verifyOTP(email, otp);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Invalid or expired OTP. Please try again.');
      return;
    }

    toast.success('Email verified successfully!');

    sessionStorage.setItem('trumarkz_verified_email', email);
    sessionStorage.removeItem('trumarkz_otp_email');
    navigate('/login', { replace: true });
  };

  const handleResend = async () => {
    if (!canResend || resending || !email) return;
    setResending(true);
    const result = await resendOTP(email);
    setResending(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to resend OTP');
      return;
    }

    toast.success('OTP resent to your email');
    setOtp('');
    setTimer(60);
    setCanResend(false);
    setError('');
  };

  const backRoute = isOrg ? '/org-registration' : '/register/individual';

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <StepWizard
            steps={isOrg ? ['Registration', 'OTP Verification', 'Onboarding'] : ['Registration', 'OTP', 'Welcome']}
            currentStep={1}
          />

          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <Mail size={22} />
            </div>
            <h2 className="font-sora font-bold text-xl text-brand-dark mb-1">Verify Your Email</h2>
            {email ? (
              <p className="text-sm text-gray-500 font-inter">
                Enter the 6-digit OTP sent to your email<br />
                <span className="font-semibold text-brand-dark">{email}</span>
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
              onChange={val => { setOtp(val); setError(''); }}
              error={!!error}
              disabled={!email}
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
            disabled={submitting || !email || otp.length !== 6}
          >
            {submitting ? 'Verifying...' : 'Verify OTP'}
          </Button>

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 text-sm text-brand-blue font-inter hover:underline disabled:opacity-60"
              >
                <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Resending...' : 'Resend OTP'}
              </button>
            ) : (
              <p className="text-sm text-gray-500 font-inter">
                Resend OTP in{' '}
                <span className="font-semibold text-brand-dark">
                  00:{timer.toString().padStart(2, '0')}
                </span>
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
