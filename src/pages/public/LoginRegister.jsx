import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Mail, Lock, Building2, User, Globe, ArrowRight, CheckCircle,
  Shield, X, AlertCircle, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_CREDENTIALS_KEY = 'trumarkz_role_credentials';

// ── Google Icon ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

// ── Forgot Password Modal ────────────────────────────────────────────────────
const ForgotPasswordModal = ({ onClose, forgotPassword }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const result = await forgotPassword(email.trim());
    setSubmitting(false);
    if (result.success) setSent(true);
    else toast.error(result.error || 'Something went wrong. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        {!sent ? (
          <>
            <h3 className="font-sora font-bold text-lg text-brand-dark mb-1">Forgot Password</h3>
            <p className="text-sm text-gray-500 font-inter mb-5">Enter your registered email and we'll send you a reset OTP.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email Address" placeholder="Enter your email" name="email" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)} icon={Mail} />
              <Button type="submit" variant="primary" size="md" className="w-full" disabled={submitting || !email.trim()}>
                {submitting ? 'Sending…' : 'Send Reset OTP'}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <h3 className="font-sora font-bold text-lg text-brand-dark mb-2">Check Your Email</h3>
            <p className="text-sm text-gray-500 font-inter mb-4">
              If an account exists for <span className="font-medium text-brand-dark">{email}</span>, a reset OTP has been sent. It expires in 30 minutes.
            </p>
            <Button variant="outline" size="md" className="w-full" onClick={onClose}>Close</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const LoginRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, forgotPassword, getGoogleAuthUrl } = useAuth();

  const typeFromUrl = searchParams.get('type'); // 'organization' | 'individual'
  const validTypes = ['organization', 'individual'];
  const [userType, setUserType] = useState(validTypes.includes(typeFromUrl) ? typeFromUrl : 'organization');

  const [tab, setTab] = useState(location.pathname === '/signup' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const t = searchParams.get('type');
    if (validTypes.includes(t) && t !== userType) setUserType(t);
    if (searchParams.get('error') === 'auth_failed') {
      setErrors({ form: 'Authentication failed. Please sign in again.' });
    }
  }, [searchParams]);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) newErrors.email = 'Invalid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Minimum 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    setErrors({});
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
      setErrors({ form: result.error || 'Login failed' });
      toast.error(result.error || 'Login failed');
      return;
    }

    toast.success('Welcome back!');

    // Save remembered email
    try {
      const raw = localStorage.getItem(ROLE_CREDENTIALS_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      if (rememberMe) saved[result.userType || userType] = { email: email.trim() };
      else delete saved[result.userType || userType];
      localStorage.setItem(ROLE_CREDENTIALS_KEY, JSON.stringify(saved));
    } catch {}

    if (result.requiresOnboarding) {
      navigate('/onboarding');
    } else if (result.userType === 'individual' || userType === 'individual') {
      navigate('/individual/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setErrors({});

    const result = await getGoogleAuthUrl(userType);
    setGoogleLoading(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to initiate Google login');
      return;
    }

    sessionStorage.setItem('trumarkz_google_user_type', userType);
    window.location.assign(result.authUrl);
  };

  const roleDescriptions = {
    organization: 'Sign in to manage verifications and credentials.',
    individual: 'Sign in to your verified Skill Tree profile.',
  };

  const registerRoutes = {
    organization: '/org-registration',
    individual: '/register/individual',
  };

  const types = [
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'individual', label: 'Individual', icon: User },
  ];

  return (
    <>
      <AnimatePresence>
        {showForgotPassword && (
          <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} forgotPassword={forgotPassword} />
        )}
      </AnimatePresence>

      <div className="min-h-screen flex bg-brand-bg">
        {/* Left decorative panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-brand-dark flex-col justify-between p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 via-transparent to-transparent" />
          <div className="relative z-10"><Logo size="md" dark showTagline /></div>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg"><Shield size={24} className="text-brand-blue" /></div>
              <div><p className="text-white font-sora font-bold text-lg">10M+</p><p className="text-gray-400 text-sm font-inter">Verifications Done</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg"><CheckCircle size={24} className="text-green-400" /></div>
              <div><p className="text-white font-sora font-bold text-lg">99.99%</p><p className="text-gray-400 text-sm font-inter">Uptime SLA</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg"><Globe size={24} className="text-brand-blue" /></div>
              <div><p className="text-white font-sora font-bold text-lg">50+</p><p className="text-gray-400 text-sm font-inter">Countries Served</p></div>
            </div>
          </div>
          <div className="relative z-10"><p className="text-gray-500 text-xs font-inter">© 2024 TruMarkZ. All rights reserved.</p></div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex flex-col justify-center p-4 sm:p-8 lg:p-12">
          <div className="max-w-md w-full mx-auto">
            <div className="lg:hidden mb-6 text-center"><Logo size="lg" /></div>

            {/* Back button */}
            <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-brand-blue font-inter mb-6 transition-colors">
              <ArrowLeft size={14} /> Back
            </button>

            <h2 className="font-sora font-bold text-2xl text-center text-brand-dark mb-2">
              {tab === 'login' ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-sm text-gray-500 text-center font-inter mb-6">
              {tab === 'login' ? 'Sign in to your account' : `Create your ${userType} account`}
            </p>

            {/* User type selector — 2 options only */}
            <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-gray-200 rounded-xl">
              {types.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setUserType(t.id); setErrors({}); }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium font-inter transition-all min-h-[46px] ${
                    userType === t.id ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <t.icon size={16} className="shrink-0" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 font-inter text-center mb-5 -mt-2">{roleDescriptions[userType]}</p>

            {/* Tabs */}
            <div className="flex gap-6 mb-6 border-b border-gray-200">
              <button onClick={() => setTab('login')} className={`pb-3 text-sm font-medium font-inter border-b-2 transition-colors ${tab === 'login' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                Sign In
              </button>
              <button onClick={() => setTab('register')} className={`pb-3 text-sm font-medium font-inter border-b-2 transition-colors ${tab === 'register' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                Register
              </button>
            </div>

            <AnimatePresence mode="wait">
              {tab === 'login' ? (
                <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  <form onSubmit={handleLogin} autoComplete="on" className="space-y-4">
                    <Input label="Email Address" placeholder="Enter your email" name="username" autoComplete="username"
                      value={email} onChange={e => setEmail(e.target.value)} error={errors.email} icon={Mail} />
                    <Input label="Password" type="password" placeholder="Enter your password" name="password" autoComplete="current-password"
                      value={password} onChange={e => setPassword(e.target.value)} error={errors.password} icon={Lock} />
                    {errors.form && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 font-inter">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{errors.form}</span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                          className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
                        <span className="text-sm text-gray-500 font-inter">Remember me</span>
                      </label>
                      <button type="button" onClick={() => navigate('/forgot-password')}
                        className="text-sm text-brand-blue font-inter hover:underline sm:text-right">
                        Forgot Password?
                      </button>
                    </div>
                    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                      {submitting ? 'Signing in…' : 'Sign In'} <ArrowRight size={18} />
                    </Button>
                  </form>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-brand-bg px-3 text-xs text-gray-400 font-inter">or continue with</span></div>
                  </div>

                  {/* Google Login */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-brand-blue/40 hover:bg-gray-50 text-brand-dark font-inter text-sm font-medium transition-all disabled:opacity-60"
                  >
                    <GoogleIcon />
                    {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                  </button>

                  <p className="text-center text-sm text-gray-500 font-inter">
                    {userType === 'individual' ? 'New here? ' : 'New Organization? '}
                    <button type="button" onClick={() => setTab('register')} className="text-brand-blue font-medium hover:underline">
                      {userType === 'individual' ? 'Register as Individual' : 'Register Organization'}
                    </button>
                  </p>
                </motion.div>
              ) : (
                <motion.div key={`register-${userType}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  <p className="text-sm text-gray-500 font-inter mb-4">
                    {userType === 'organization'
                      ? 'Register your organization to start verifying identities and issuing digital credentials.'
                      : 'Create an individual account to build your verified Skill Tree profile and showcase your credentials.'}
                  </p>
                  <Button variant="primary" size="lg" className="w-full" onClick={() => navigate(registerRoutes[userType])}>
                    {userType === 'organization' ? 'Register Organization' : 'Register as Individual'} <ArrowRight size={18} />
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-brand-bg px-3 text-xs text-gray-400 font-inter">or sign up with</span></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-brand-blue/40 hover:bg-gray-50 text-brand-dark font-inter text-sm font-medium transition-all disabled:opacity-60"
                  >
                    <GoogleIcon />
                    {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                  </button>

                  <p className="text-center text-sm text-gray-500 font-inter">
                    Already have an account?{' '}
                    <button type="button" onClick={() => setTab('login')} className="text-brand-blue font-medium hover:underline">Sign In</button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginRegister;
