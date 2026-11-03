import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SuccessCheckmark } from '@/components/ui/SuccessCheckmark';
import { HeroPanel, AuthField, AuthStepper, AuthTopBar } from '@/components/auth/AuthShell';
import { OTPInput } from '@/components/ui/OTPInput';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
  // The reset OTP is single-use: block a double submit while the first is in flight.
  const resettingRef = useRef(false);
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resettingRef.current) return;
    const e2 = {};
    if (!password) e2.password = 'New password is required';
    else if (password.length < 8) e2.password = 'Minimum 8 characters required';
    if (!confirmPassword) e2.confirmPassword = 'Please confirm your password';
    else if (confirmPassword !== password) e2.confirmPassword = 'Passwords do not match';
    setPasswordErrors(e2);
    if (Object.keys(e2).length) return;

    resettingRef.current = true;
    setSubmitting(true);
    const result = await resetPassword(email.trim(), otp, password);
    setSubmitting(false);
    resettingRef.current = false;

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

  const stepCurrent = success ? 2 : step - 1;
  const goSignIn = () => navigate('/login', { replace: true });

  return (
    <div className="flex h-[100dvh] gap-5 overflow-hidden bg-white p-3 sm:p-5">
      <HeroPanel />

      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-8">
        <AuthTopBar backLabel="Back to sign in" onBack={goSignIn} />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mx-auto my-auto w-full max-w-[740px] pb-3"
        >
          <AuthStepper steps={['Verify OTP', 'New password']} current={stepCurrent} showProgress={false} />

          <div className="mx-auto mt-6 w-full max-w-[440px]">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <SuccessCheckmark size="md" />
                  <h1 className="mt-3 font-inter text-[26px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark">Password reset</h1>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#5b6a85] font-inter">Your password has been changed. Sign in with your new password.</p>
                  <button type="button" onClick={goSignIn} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60">Go to sign in <ArrowRight size={16} /></button>
                </motion.div>
              ) : step === 1 ? (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring}>
                  <div className="text-center">
                    <span className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#e9f1fe] text-brand-blue"><ShieldCheck size={24} strokeWidth={1.6} /></span>
                    <h1 className="font-inter text-[26px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark">Enter your OTP</h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#5b6a85] font-inter">Check your email for the 6-digit code and enter it below.</p>
                  </div>

                  <form onSubmit={handleVerifyOtp} noValidate className="mt-5 space-y-4">
                    <AuthField
                      id="reset-email" label="Email address" icon={Mail} type="email" name="email" autoComplete="email" placeholder="you@company.com"
                      value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(''); }} error={emailError}
                    />

                    <div>
                      <p className="mb-2 text-[13px] font-medium text-brand-dark font-inter">6-digit OTP</p>
                      <OTPInput value={otp} onChange={(val) => { setOtp(val); setOtpError(''); }} error={!!otpError} />
                      {otpError && (
                        <p role="alert" className="mt-2 flex items-center justify-center gap-1 text-xs text-red-500 font-inter"><AlertCircle size={12} /> {otpError}</p>
                      )}
                      <div className="mt-3 text-center text-[13px] font-inter">
                        {canResend ? (
                          <button type="button" onClick={handleResend} disabled={resending} className="inline-flex items-center gap-1.5 font-medium text-brand-blue hover:underline disabled:opacity-60">
                            <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                            {resending ? 'Sending…' : 'Resend OTP'}
                          </button>
                        ) : (
                          <p className="text-[#5b6a85]">Resend OTP in <span className="font-semibold text-brand-dark">00:{timer.toString().padStart(2, '0')}</span></p>
                        )}
                      </div>
                    </div>

                    <button type="submit" disabled={otp.length < 6} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60">Continue to reset password <ArrowRight size={16} /></button>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={spring}>
                  <div className="text-center">
                    <span className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#e9f1fe] text-brand-blue"><Lock size={24} strokeWidth={1.6} /></span>
                    <h1 className="font-inter text-[26px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark">Set new password</h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#5b6a85] font-inter">Choose a strong password for your account.</p>
                  </div>

                  <form onSubmit={handleResetPassword} noValidate className="mt-5 space-y-3.5">
                    <AuthField
                      id="reset-password" label="New password" icon={Lock} type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                      placeholder="Create a new password" hint="Minimum 8 characters"
                      value={password} onChange={(e) => { setPassword(e.target.value); setPasswordErrors(p => ({ ...p, password: '' })); setFormError(''); }}
                      error={passwordErrors.password}
                      trailing={<button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#5b6a85] hover:text-brand-dark">{showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}</button>}
                    />
                    <AuthField
                      id="reset-confirm" label="Confirm password" icon={Lock} type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors(p => ({ ...p, confirmPassword: '' })); setFormError(''); }}
                      error={passwordErrors.confirmPassword}
                      trailing={<button type="button" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirm} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#5b6a85] hover:text-brand-dark">{showConfirm ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}</button>}
                    />

                    {formError && (
                      <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 font-inter">
                        <AlertCircle size={15} className="mt-0.5 shrink-0" /><span>{formError}</span>
                      </div>
                    )}

                    <button type="submit" disabled={submitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60">
                      {submitting ? 'Resetting password…' : <>Reset password <ArrowRight size={16} /></>}
                    </button>
                    <button type="button" onClick={() => { setStep(1); setFormError(''); }} className="flex w-full items-center justify-center gap-1.5 text-[13px] text-[#5b6a85] font-inter transition-colors hover:text-brand-dark">
                      <ArrowLeft size={14} /> Back to OTP entry
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
