import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { OTPInput } from '@/components/ui/OTPInput';
import { Logo } from '@/components/ui/Logo';

const spring = { type: 'spring', stiffness: 300, damping: 28 };

export const ResetPassword = () => {
  const navigate = useNavigate();
  const { resetPassword, forgotPassword } = useAuth();

  // Step 1: verify OTP — Step 2: set new password
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState(sessionStorage.getItem('trumarkz_reset_email') || '');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [emailError, setEmailError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [formError, setFormError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  // ── Step 1: validate and proceed to password step ──────────────────────────
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    let valid = true;
    if (!email.trim()) { setEmailError('Email is required'); valid = false; }
    else if (!/\S+@\S+\.\S+/.test(email.trim())) { setEmailError('Invalid email address'); valid = false; }
    else setEmailError('');
    if (otp.length < 6) { setOtpError('Enter all 6 digits of the OTP'); valid = false; }
    else setOtpError('');
    if (!valid) return;
    // OTP is captured — move to password step immediately
    setStep(2);
  };

  // ── Step 2: submit everything to the API ───────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (!password) e2.password = 'New password is required';
    else if (password.length < 8) e2.password = 'Minimum 8 characters required';
    if (!confirmPassword) e2.confirmPassword = 'Please confirm your password';
    else if (confirmPassword !== password) e2.confirmPassword = 'Passwords do not match';
    setPasswordErrors(e2);
    if (Object.keys(e2).length) return;

    setSubmitting(true);
    const result = await resetPassword(email.trim(), otp, password);
    setSubmitting(false);

    if (!result.success) {
      const msg = result.error || 'Reset failed. Please try again.';
      // If OTP is invalid/expired, send user back to step 1
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setFormError('');
        setOtp('');
        setOtpError(msg);
        setStep(1);
        toast.error(msg);
      } else {
        setFormError(msg);
        toast.error(msg);
      }
      return;
    }

    sessionStorage.removeItem('trumarkz_reset_email');
    setSuccess(true);
    toast.success('Password reset successfully!');
    setTimeout(() => navigate('/login', { replace: true }), 2500);
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailError('Enter a valid email to resend OTP');
      return;
    }
    setResending(true);
    const result = await forgotPassword(email.trim());
    setResending(false);
    if (!result.success) {
      toast.error(result.error || 'Could not resend OTP. Please try again.');
      return;
    }
    sessionStorage.setItem('trumarkz_reset_email', email.trim());
    toast.success('New OTP sent! Check your email.');
    setOtp('');
    setOtpError('');
    setCanResend(false);
    setTimer(60);
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={spring}
          className="w-full max-w-md"
        >
          <Card className="p-8 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring, delay: 0.15 }}
              className="w-16 h-16 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5"
            >
              <CheckCircle size={32} className="text-green-500" />
            </motion.div>
            <h2 className="font-sora font-bold text-2xl text-brand-dark mb-2">Password Reset!</h2>
            <p className="text-sm text-gray-500 font-inter mb-6 leading-relaxed">
              Your password has been reset successfully. Redirecting you to sign in…
            </p>
            <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/login', { replace: true })}>
              Go to Sign In
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="w-full max-w-md"
      >
        <Card className="p-6 sm:p-8">
          <div className="mb-6 flex justify-center">
            <Logo size="md" />
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-7">
            {[1, 2].map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-sora transition-all duration-300 ${
                    step > s
                      ? 'bg-green-500 text-white'
                      : step === s
                        ? 'bg-brand-blue text-white'
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step > s ? <CheckCircle size={14} /> : s}
                  </div>
                  <span className={`text-xs font-inter font-medium ${step === s ? 'text-brand-dark' : 'text-gray-400'}`}>
                    {s === 1 ? 'Verify OTP' : 'New Password'}
                  </span>
                </div>
                {s < 2 && <div className={`flex-1 h-px transition-all duration-300 ${step > 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Step 1: Enter OTP ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={spring}
              >
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10">
                    <ShieldCheck size={22} className="text-brand-blue" />
                  </div>
                  <h1 className="font-sora font-bold text-xl text-brand-dark mb-1">Enter Your OTP</h1>
                  <p className="text-sm text-gray-500 font-inter leading-relaxed">
                    Check your email for the 6-digit OTP and enter it below.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <Input
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                    error={emailError}
                    icon={Mail}
                  />

                  <div>
                    <p className="text-sm font-medium font-inter text-brand-dark mb-3">6-Digit OTP</p>
                    <OTPInput
                      value={otp}
                      onChange={(val) => { setOtp(val); setOtpError(''); }}
                      error={!!otpError}
                    />
                    <AnimatePresence>
                      {otpError && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-center text-xs text-red-500 font-inter mt-2"
                        >
                          {otpError}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Resend OTP */}
                    <div className="text-center mt-3">
                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={resending}
                          className="inline-flex items-center gap-1.5 text-sm text-brand-blue font-inter hover:underline disabled:opacity-60 cursor-pointer"
                        >
                          <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                          {resending ? 'Sending…' : 'Resend OTP'}
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
                  </div>

                  <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }} transition={spring}>
                    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={otp.length < 6}>
                      Continue to Reset Password
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            )}

            {/* ── Step 2: Set new password ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={spring}
              >
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10">
                    <Lock size={22} className="text-brand-blue" />
                  </div>
                  <h1 className="font-sora font-bold text-xl text-brand-dark mb-1">Set New Password</h1>
                  <p className="text-sm text-gray-500 font-inter leading-relaxed">
                    Choose a strong password for your account.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <Input
                    label="New Password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a new password (min. 8 chars)"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordErrors(p => ({ ...p, password: '' })); setFormError(''); }}
                    error={passwordErrors.password}
                    icon={Lock}
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors(p => ({ ...p, confirmPassword: '' })); setFormError(''); }}
                    error={passwordErrors.confirmPassword}
                    icon={Lock}
                  />

                  <AnimatePresence>
                    {formError && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 font-inter"
                      >
                        {formError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }} transition={spring}>
                    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                      {submitting
                        ? <span className="flex items-center gap-2">
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Resetting Password…
                          </span>
                        : 'Reset Password'
                      }
                    </Button>
                  </motion.div>

                  <button
                    type="button"
                    onClick={() => { setStep(1); setFormError(''); }}
                    className="w-full text-center text-sm text-gray-500 font-inter hover:text-brand-dark transition-colors inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={13} /> Back to OTP entry
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1 text-sm text-brand-blue font-inter hover:underline cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
