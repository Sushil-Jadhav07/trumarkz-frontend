import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { HeroPanel, AuthStepper, AuthTopBar } from '@/components/auth/AuthShell';
import { OTPInput } from '@/components/ui/OTPInput';
import { ArrowLeft, ArrowRight, AlertCircle, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const OTPVerification = () => {
  const navigate = useNavigate();
  const { verifyOTP, resendOTP } = useAuth();

  const [email] = useState(() => sessionStorage.getItem('trumarkz_otp_email') || '');
  const [regType] = useState(() => sessionStorage.getItem('trumarkz_reg_type') || 'org');
  const isOrg = regType === 'org' || regType === 'organization';

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [successState, setSuccessState] = useState(false);
  const timerRef = useRef(null);
  const redirectRef = useRef(null);

  useEffect(() => {
    if (successState) return;
    if (!email) {
      toast.error('Session expired. Please register again.');
      navigate(isOrg ? '/org-registration' : '/register/individual', { replace: true });
    }
  }, [email, isOrg, navigate, successState]);

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  useEffect(() => () => {
    clearTimeout(redirectRef.current);
  }, []);

  // OTPs are consumed atomically: a second submit of the same code after a success would
  // show a spurious "Invalid or expired OTP", so only one verify is ever in flight.
  const verifyingRef = useRef(false);
  const handleVerify = async () => {
    if (verifyingRef.current || successState) return;
    if (otp.length !== 6) { setError('Please enter all 6 digits'); return; }
    if (!email) { setError('Session expired. Please go back and register again.'); return; }

    verifyingRef.current = true;
    setSubmitting(true);
    const result = await verifyOTP(email, otp);
    setSubmitting(false);
    verifyingRef.current = false;

    if (!result.success) {
      setError(result.error || 'Invalid or expired OTP. Please try again.');
      return;
    }

    setSuccessState(true);
    setError('');
    toast.success(result.message || 'Email verified successfully!');
    sessionStorage.setItem('trumarkz_verified_email', email);
    redirectRef.current = setTimeout(() => {
      navigate('/welcome', { replace: true });
    }, 900);
  };

  const handleResend = async () => {
    if (!canResend || resending || !email || successState) return;
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
    <div className="flex h-[100dvh] gap-5 overflow-hidden bg-white p-3 sm:p-5">
      <HeroPanel />

      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-8">
        <AuthTopBar backLabel="Back to registration" onBack={() => navigate(backRoute, { replace: true })} />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto my-auto w-full max-w-[740px] pb-3"
        >
          <AuthStepper steps={isOrg ? ['Registration', 'OTP verification', 'Onboarding'] : ['Registration', 'OTP verification', 'Welcome']} current={1} />

          <div className="mx-auto mt-6 w-full max-w-[440px] text-center">
            <span className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#e9f1fe] text-brand-blue">
              <Mail size={24} strokeWidth={1.6} />
            </span>
            <h1 className="font-inter text-[26px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark">Verify your email</h1>
            {email ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#5b6a85] font-inter">
                Enter the 6-digit code sent to<br />
                <span className="font-semibold text-brand-dark">{email}</span>
              </p>
            ) : (
              <div role="alert" className="mt-2 flex items-center justify-center gap-2 text-[13px] text-orange-600 font-inter">
                <AlertCircle size={15} />
                <span>Session lost. Please go back and register again.</span>
              </div>
            )}
            <p className="mt-1 text-xs text-[#7b879d] font-inter">The code expires in 10 minutes.</p>

            <div className="mt-6">
              <OTPInput
                value={otp}
                onChange={val => { setOtp(val); setError(''); }}
                error={!!error}
                disabled={!email || successState}
              />
              {error && (
                <p role="alert" className="mt-2.5 flex items-center justify-center gap-1 text-xs text-red-500 font-inter">
                  <AlertCircle size={12} /> {error}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleVerify}
              disabled={submitting || successState || !email || otp.length !== 6}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {successState ? 'Verified' : submitting ? 'Verifying…' : 'Verify code'}
              {!submitting && !successState && <ArrowRight size={16} />}
            </button>

            <div className="mt-4 text-[13px] font-inter">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || successState}
                  className="inline-flex items-center gap-1.5 font-medium text-brand-blue hover:underline disabled:opacity-60"
                >
                  <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                  {resending ? 'Resending…' : 'Resend code'}
                </button>
              ) : (
                <p className="text-[#5b6a85]">
                  Resend code in{' '}
                  <span className="font-semibold text-brand-dark">00:{timer.toString().padStart(2, '0')}</span>
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-[#e1e7f0] pt-4 text-[13px] text-[#5b6a85] font-inter">
              Wrong email?{' '}
              <button type="button" onClick={() => navigate(backRoute, { replace: true })} className="font-semibold text-brand-blue hover:underline">Back to registration</button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OTPVerification;
