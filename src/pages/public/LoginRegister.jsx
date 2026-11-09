import { Modal } from '@/components/ui/Modal';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { HeroPanel, AuthField } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import {
  Mail, Lock, Building2, User, ArrowRight, CheckCircle, Check,
  AlertCircle, Eye, EyeOff, Layers, ArrowLeft, ShieldCheck, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_CREDENTIALS_KEY = 'trumarkz_role_credentials';

// Spring presets
const spring = {
  snappy:   { type: 'spring', stiffness: 500, damping: 35 },
  smooth:   { type: 'spring', stiffness: 300, damping: 28 },
  soft:     { type: 'spring', stiffness: 250, damping: 26 },
  micro:    { type: 'spring', stiffness: 600, damping: 40 },
  entrance: { type: 'spring', stiffness: 280, damping: 30 },
};

// ── Google Icon ───────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

// ── Forgot Password Modal ─────────────────────────────────────────────────────
const ForgotPasswordModal = ({ onClose, forgotPassword }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const result = await forgotPassword(email.trim());
    setSubmitting(false);
    if (result.success) {
      sessionStorage.setItem('trumarkz_reset_email', email.trim());
      setSent(true);
    } else {
      toast.error(result.error || 'Something went wrong. Please try again.');
    }
  };

  const handleEnterOtp = () => {
    onClose();
    navigate('/reset-password');
  };

  return (
    <Modal isOpen onClose={submitting ? undefined : onClose} title={sent ? 'Check Your Email' : 'Forgot Password?'} size="sm" onSubmit={!sent ? handleSubmit : undefined}>
      {!sent ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10"><Lock size={20} className="text-brand-blue" /></div>
          <p className="text-center text-sm leading-relaxed text-gray-500 font-inter">Enter your registered email and we'll send you a reset OTP.</p>
          <Input label="Email Address" placeholder="Enter your email" name="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} icon={Mail} />
          <Modal.Footer>
            <Button type="submit" variant="primary" size="md" className="w-full" disabled={submitting || !email.trim()}>{submitting ? 'Sending...' : 'Send Reset OTP'}</Button>
          </Modal.Footer>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-green-100 bg-green-50"><CheckCircle size={28} className="text-green-500" /></div>
          <p className="text-sm leading-relaxed text-gray-500 font-inter">If an account exists for <span className="font-semibold text-brand-dark">{email}</span>, a reset OTP has been sent. It expires in 10 minutes.</p>
          <Modal.Footer className="space-y-3">
            <Button variant="primary" size="md" className="w-full" onClick={handleEnterOtp}>Enter OTP &amp; Reset Password</Button>
            <button type="button" onClick={onClose} className="w-full text-center text-sm text-gray-500 font-inter hover:text-brand-dark">Back to sign in</button>
          </Modal.Footer>
        </div>
      )}
    </Modal>
  );
};


// Only Organization and Individual are self-registerable — Super Admin
// accounts are provisioned separately and never appear as a register option.
const roles = [
  { id: 'organization', label: 'Organization', icon: Building2, description: 'Verify workers and issue credentials' },
  { id: 'individual',   label: 'Individual',   icon: User,      description: 'Build your verified profile' },
];

const registerRoutes = { organization: '/org-registration', individual: '/register/individual' };

// ── Main Component ────────────────────────────────────────────────────────────
export const LoginRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, forgotPassword, getGoogleAuthUrl } = useAuth();

  const typeFromUrl = searchParams.get('role') || searchParams.get('type');
  const validTypes  = ['organization', 'individual', 'super-admin'];

  const [userType,     setUserType]     = useState(() => {
    const pendingRole = sessionStorage.getItem('trumarkz_login_role');
    if (validTypes.includes(typeFromUrl)) return typeFromUrl;
    if (validTypes.includes(pendingRole)) return pendingRole;
    return 'organization';
  });
  const [tab,          setTab]          = useState(location.pathname === '/signup' ? 'register' : 'login');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [rememberMe,   setRememberMe]   = useState(true);
  const [errors,       setErrors]       = useState({});
  const [submitting,   setSubmitting]   = useState(false);
  const [googleLoading,setGoogleLoading]= useState(false);
  const [showForgot,   setShowForgot]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const t = searchParams.get('role') || searchParams.get('type');
    if (validTypes.includes(t) && t !== userType) setUserType(t);
    if (searchParams.get('error') === 'auth_failed') setErrors({ form: 'Authentication failed. Please sign in again.' });
    if (searchParams.get('error') === 'cancelled') setErrors({ form: 'Google sign-in was cancelled. You can try again or sign in with your email.' });
  }, [searchParams]);

  useEffect(() => {
    if (userType === 'super-admin' && tab === 'register') setTab('login');
  }, [userType, tab]);

  const validate = () => {
    const e = {};
    if (!email.trim())                    e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Invalid email address';
    if (!password)                        e.password = 'Password is required';
    else if (password.length < 8)         e.password = 'Minimum 8 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleLogin = async (ev) => {
    ev.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    setErrors({});
    // Role is never sent by the frontend — the backend's user_type on the
    // login response is the single source of truth for redirect/session role.
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (!result.success) {
      if (result.requiresVerification) {
        sessionStorage.setItem('trumarkz_otp_email', email.trim());
        sessionStorage.setItem('trumarkz_reg_type', userType === 'individual' ? 'individual' : 'org');
        toast.error('Please verify your email OTP before signing in.');
        navigate('/verify-otp');
        return;
      }
      // Login is now only blocked by is_active=false (a real admin
      // deactivation) — a pending, not-yet-approved org (org_approved=false)
      // logs in fine, so "deactivated" no longer needs to hedge about approval.
      const message = result.error || 'Login failed';
      setErrors({ form: message });
      toast.error(message);
      return;
    }
    toast.success('Welcome back!');
    try {
      const raw = localStorage.getItem(ROLE_CREDENTIALS_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      if (rememberMe) saved[result.userType] = { email: email.trim() };
      else delete saved[result.userType];
      localStorage.setItem(ROLE_CREDENTIALS_KEY, JSON.stringify(saved));
      sessionStorage.removeItem('trumarkz_login_identifier');
      sessionStorage.removeItem('trumarkz_login_role');
    } catch {}
    if (result.userType === 'super-admin')     navigate('/admin/dashboard');
    else if (result.requiresOnboarding)        navigate('/org/onboarding');
    // A pending (not-yet-approved) org goes straight to the normal dashboard
    // like any other org — org_approved only gates batch creation (see the
    // in-app gate on /org/create-batch), not general access.
    else if (result.userType === 'individual') navigate('/individual/dashboard');
    else                                        navigate('/dashboard');
  };

  const handleGoogle = async () => {
    if (userType === 'super-admin' || googleLoading) return;
    setGoogleLoading(true);
    setErrors({});
    const result = await getGoogleAuthUrl(userType);
    setGoogleLoading(false);
    if (!result.success) { toast.error(result.error || 'Failed to initiate Google login'); return; }
    sessionStorage.setItem('trumarkz_google_user_type', userType);
    window.location.assign(result.authUrl);
  };

  const activeRole = roles.find(r => r.id === userType);

  return (
    <>
      <AnimatePresence>
        {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} forgotPassword={forgotPassword} />}
      </AnimatePresence>

      <div className={`flex h-[100dvh] gap-5 overflow-hidden p-3 sm:p-5 ${tab === 'login' ? 'bg-gradient-to-br from-[#eef4fc] to-[#e7eefa]' : 'bg-white'}`}>
        <HeroPanel />

        {/* ── Right panel ─────────────────────────────────────────────────── */}
        {tab === 'login' ? (
        <div className="relative flex h-full min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-2 sm:px-8">
          <div className="my-auto flex w-full flex-col items-center">
            <div className="mb-3"><Logo size="md" showTagline /></div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.smooth, delay: 0.05 }}
              className="w-full max-w-[460px] rounded-2xl border border-[#e6ecf5] bg-white px-6 pb-5 pt-5 shadow-[0_18px_50px_-26px_rgba(20,60,140,0.28)] sm:px-8"
            >
              <div className="mb-4 text-center">
                <span aria-hidden="true" className="relative mx-auto mb-3 flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#e9f1fe] ring-8 ring-[#f3f7ff]">
                  <span className="flex h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-brand-blue shadow-[0_10px_22px_-8px_rgba(37,99,235,0.7)] rotate-[-6deg]">
                    {tab === 'login'
                      ? <ShieldCheck size={26} strokeWidth={1.8} className="text-white rotate-[6deg]" />
                      : <UserPlus size={25} strokeWidth={1.8} className="text-white rotate-[6deg]" />}
                  </span>
                  <span className="absolute -right-0.5 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                    <Check size={13} strokeWidth={3} className="text-white" />
                  </span>
                </span>
                <h2 className="font-inter text-[22px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark">
                  {tab === 'login' ? 'Sign in to TruMarkZ' : 'Create your account'}
                </h2>
                <p className="mt-1 text-[13px] text-[#5b6a85] font-inter">
                  {tab === 'login'
                    ? 'Welcome back. Let’s get you signed in.'
                    : `Create your ${userType === 'organization' ? 'organization' : 'individual'} account`}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {tab === 'login' ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  >
                    <form onSubmit={handleLogin} autoComplete="on" className="space-y-3.5" noValidate>
                      <AuthField
                        id="login-email" label="Email address" icon={Mail} type="email" placeholder="you@company.com"
                        name="username" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email}
                      />
                      <AuthField
                        id="login-password" label="Password" icon={Lock} type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                        name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password}
                        action={<button type="button" onClick={() => setShowForgot(true)} className="text-[13px] font-medium text-brand-blue font-inter hover:underline">Forgot password?</button>}
                        trailing={(
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#5b6a85] hover:text-brand-dark"
                          >
                            {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                          </button>
                        )}
                      />

                      <AnimatePresence>
                        {errors.form && (
                          <motion.div
                            role="alert"
                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                            transition={spring.snappy}
                            className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 font-inter"
                          >
                            <AlertCircle size={15} className="mt-0.5 shrink-0" />
                            <span>{errors.form}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <label className="flex w-fit cursor-pointer items-center gap-2.5">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer sr-only" />
                        <span className="flex h-[18px] w-[18px] items-center justify-center rounded border border-[#cdd7e6] bg-white text-white transition-colors peer-checked:border-brand-blue peer-checked:bg-brand-blue peer-focus-visible:ring-2 peer-focus-visible:ring-brand-blue/30 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
                          <Check size={13} strokeWidth={2.5} />
                        </span>
                        <span className="text-[13px] text-brand-dark font-inter">Remember me</span>
                      </label>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover disabled:opacity-70"
                      >
                        {submitting
                          ? <span className="flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Signing in…</span>
                          : <><span>Sign in</span><ArrowRight size={16} /></>}
                      </button>
                    </form>

                    <div className="mt-3.5 space-y-3.5">
                      <div className="flex items-center gap-4 text-[13px] text-[#5b6a85] font-inter">
                        <span className="h-px flex-1 bg-[#e1e7f0]" />or<span className="h-px flex-1 bg-[#e1e7f0]" />
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogle}
                        disabled={googleLoading}
                        className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#d9e1ee] bg-white text-sm font-medium text-brand-dark font-inter transition-colors hover:bg-gray-50 disabled:opacity-60"
                      >
                        <GoogleIcon />
                        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                      </button>
                      <p className="text-center text-[13px] text-[#5b6a85] font-inter">
                        Don’t have an account?{' '}
                        <button type="button" onClick={() => setTab('register')} className="font-semibold text-brand-blue hover:underline">Create an account</button>
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>

            <p className="mt-4 flex items-center gap-2 text-xs text-[#5b6a85] font-inter">
              <Lock size={14} strokeWidth={1.5} /> Secure access to your workspace
            </p>
            <p className="mt-2.5 text-xs text-[#5b6a85] font-inter">
              <Link to="/privacy-policy" className="hover:text-brand-blue hover:underline">Privacy Policy</Link>
              <span className="mx-3">·</span>
              <Link to="/terms-of-service" className="hover:text-brand-blue hover:underline">Terms of Service</Link>
            </p>
          </div>
        </div>
        ) : (
        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-4 py-2 sm:px-8">
          <button
            type="button"
            onClick={() => setTab('login')}
            className="absolute right-6 top-5 inline-flex items-center gap-2 text-[13px] text-[#3d4b66] font-inter transition-colors hover:text-brand-blue"
          >
            <ArrowLeft size={16} strokeWidth={1.75} /> Back to home
          </button>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.smooth, delay: 0.05 }}
            className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-2"
          >
            <div className="flex justify-start"><Logo size="md" showTagline /></div>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5b6a85] font-inter">Get started</p>
            <h2 className="mt-1.5 font-inter text-[26px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark">Create your account</h2>
            <p className="mt-1 text-[13px] text-[#5b6a85] font-inter">Choose how you’ll use TruMarkZ.</p>

            <fieldset className="mt-5">
              <legend className="mb-2 text-[13px] font-medium text-brand-dark font-inter">Register as</legend>
              <div role="radiogroup" className="space-y-2.5">
                {roles.map((role) => {
                  const selected = userType === role.id;
                  return (
                    <label
                      key={role.id}
                      className={`flex cursor-pointer items-center gap-3.5 rounded-xl border px-3.5 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-blue/30 ${
                        selected ? 'border-2 border-brand-blue bg-[#f3f7fe]' : 'border-[#dfe6f1] bg-white hover:border-[#c5d1e4]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="register-role"
                        value={role.id}
                        checked={selected}
                        onChange={() => { setUserType(role.id); setErrors({}); }}
                        className="sr-only"
                      />
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-[#e6eefb]' : 'bg-[#eef3fb]'} text-brand-blue`}>
                        <role.icon size={22} strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-brand-dark font-inter">{role.label}</span>
                        <span className="mt-0.5 block text-xs text-[#5b6a85] font-inter">{role.description}</span>
                      </span>
                      <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-brand-blue' : 'border-[#c5d1e4]'}`}>
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <p className="mt-4 max-w-[380px] text-[13px] leading-relaxed text-[#5b6a85] font-inter">
              {userType === 'organization'
                ? 'Register your organization to verify identities and issue digital credentials.'
                : 'Create your individual account to build a verified profile and showcase your credentials.'}
            </p>

            <button
              type="button"
              onClick={() => navigate(registerRoutes[userType])}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover"
            >
              {userType === 'organization' ? 'Register organization' : 'Register as individual'}
              <ArrowRight size={16} />
            </button>

            <div className="mt-4 flex items-center gap-4 text-[13px] text-[#5b6a85] font-inter">
              <span className="h-px flex-1 bg-[#e1e7f0]" />or sign up with<span className="h-px flex-1 bg-[#e1e7f0]" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="mt-4 flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#d9e1ee] bg-white text-sm font-medium text-brand-dark font-inter transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              <GoogleIcon />
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>
            <p className="mt-4 text-center text-[13px] text-[#5b6a85] font-inter">
              Already have an account?{' '}
              <button type="button" onClick={() => setTab('login')} className="font-semibold text-brand-blue hover:underline">Sign in</button>
            </p>

            <div className="mt-4 border-t border-[#e1e7f0] pt-4 text-center text-xs text-[#5b6a85] font-inter">
              <Link to="/privacy-policy" className="hover:text-brand-blue hover:underline">Privacy Policy</Link>
              <span className="mx-3">·</span>
              <Link to="/terms-of-service" className="hover:text-brand-blue hover:underline">Terms of Service</Link>
            </div>
          </motion.div>
        </div>
        )}
      </div>
    </>
  );
};

export default LoginRegister;
