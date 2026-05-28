import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Mail, Lock, Building2, User, ArrowRight, CheckCircle,
  Shield, X, AlertCircle, Fingerprint, Globe2, Zap
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={spring.smooth}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 relative"
      >
        <motion.button
          whileHover={{ scale: 1.08, backgroundColor: '#f3f4f6' }}
          whileTap={{ scale: 0.92 }}
          transition={spring.micro}
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X size={16} />
        </motion.button>
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring.smooth}
            >
              <div className="w-11 h-11 bg-brand-blue/10 rounded-xl flex items-center justify-center mb-4">
                <Lock size={20} className="text-brand-blue" />
              </div>
              <h3 className="font-sora font-bold text-xl text-brand-dark mb-1">Forgot Password?</h3>
              <p className="text-sm text-gray-500 font-inter mb-6 leading-relaxed">No worries. Enter your registered email and we'll send you a reset OTP.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Email Address" placeholder="Enter your email" name="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} icon={Mail} />
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={spring.snappy}>
                  <Button type="submit" variant="primary" size="md" className="w-full" disabled={submitting || !email.trim()}>
                    {submitting ? 'Sending…' : 'Send Reset OTP'}
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={spring.smooth}
              className="text-center py-2"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...spring.snappy, delay: 0.1 }}
                className="w-14 h-14 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle size={28} className="text-green-500" />
              </motion.div>
              <h3 className="font-sora font-bold text-xl text-brand-dark mb-2">Check Your Email</h3>
              <p className="text-sm text-gray-500 font-inter mb-6 leading-relaxed">
                If an account exists for <span className="font-semibold text-brand-dark">{email}</span>, a reset OTP has been sent. It expires in 30 minutes.
              </p>
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={spring.snappy}>
                <Button variant="outline" size="md" className="w-full" onClick={onClose}>Back to Sign In</Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// ── Left panel data ───────────────────────────────────────────────────────────
const trustStats = [
  { value: '10M+',   label: 'Verifications Done', icon: Fingerprint },
  { value: '99.99%', label: 'Uptime SLA',          icon: Zap },
  { value: '50+',    label: 'Countries Served',    icon: Globe2 },
];

const featureList = [
  { icon: Shield,      text: 'Blockchain-secured credential records' },
  { icon: CheckCircle, text: 'Instant identity verification' },
  { icon: Fingerprint, text: 'Tamper-proof digital credentials' },
];

const roles = [
  { id: 'organization', label: 'Organization', icon: Building2, description: 'Verify workers & issue credentials' },
  { id: 'individual',   label: 'Individual',   icon: User,      description: 'Build your verified Skill Tree' },
  { id: 'super-admin',  label: 'Super Admin',  icon: Shield,    description: 'Platform control & monitoring' },
];

const registerRoutes = { organization: '/org-registration', individual: '/register/individual' };

// Container variant for stagger
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: spring.soft },
};

const statVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring.smooth },
};

// ── Main Component ────────────────────────────────────────────────────────────
export const LoginRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, forgotPassword, getGoogleAuthUrl } = useAuth();
  const shouldReduceMotion = useReducedMotion();

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

  useEffect(() => {
    const t = searchParams.get('role') || searchParams.get('type');
    if (validTypes.includes(t) && t !== userType) setUserType(t);
    if (searchParams.get('error') === 'auth_failed') setErrors({ form: 'Authentication failed. Please sign in again.' });
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
    const result = await login(email.trim(), password, userType, rememberMe);
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
    try {
      const raw = localStorage.getItem(ROLE_CREDENTIALS_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      if (rememberMe) saved[userType] = { email: email.trim() };
      else delete saved[userType];
      localStorage.setItem(ROLE_CREDENTIALS_KEY, JSON.stringify(saved));
      sessionStorage.removeItem('trumarkz_login_identifier');
      sessionStorage.removeItem('trumarkz_login_role');
    } catch {}
    if (result.userType === 'super-admin')                                  navigate('/admin/dashboard');
    else if (result.requiresOnboarding)                                     navigate('/org/onboarding');
    else if (result.userType === 'individual' || userType === 'individual') navigate('/individual/dashboard');
    else                                                                    navigate('/dashboard');
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

      <div className="min-h-screen flex bg-brand-bg">

        {/* ── Left Panel ───────────────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-[52%] bg-brand-dark flex-col relative overflow-hidden">
          {/* Background layers */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 via-brand-dark to-brand-dark" />
            <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-brand-blue/5 blur-3xl -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-brand-blue/8 blur-3xl translate-y-1/3 -translate-x-1/3" />
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          </div>

          <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.smooth, delay: 0.05 }}
            >
              <Logo size="md" dark showTagline />
            </motion.div>

            {/* Main content */}
            <div className="flex-1 flex flex-col justify-center py-10">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.entrance, delay: 0.12 }}
                className="mb-10"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...spring.snappy, delay: 0.18 }}
                  className="inline-flex items-center gap-2 bg-brand-blue/15 border border-brand-blue/20 rounded-full px-3.5 py-1.5 mb-6"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                  <span className="text-xs font-inter font-medium text-brand-blue">Trusted by 500+ enterprises</span>
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.entrance, delay: 0.22 }}
                  className="font-sora font-bold text-4xl xl:text-5xl text-white leading-tight mb-4"
                >
                  The Global Trust<br />
                  <span className="text-brand-blue">Infrastructure</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.soft, delay: 0.28 }}
                  className="text-gray-400 font-inter text-base leading-relaxed max-w-sm"
                >
                  Verify identities, issue blockchain-secured credentials, and build a tamper-proof record of trust.
                </motion.p>
              </motion.div>

              {/* Feature list */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3 mb-10"
                style={{ transitionDelay: shouldReduceMotion ? '0ms' : '320ms' }}
              >
                {featureList.map((f, i) => (
                  <motion.div
                    key={i}
                    variants={itemVariants}
                    custom={i}
                    className="flex items-center gap-3"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(37,99,235,0.22)' }}
                      transition={spring.micro}
                      className="w-8 h-8 rounded-lg bg-brand-blue/15 border border-brand-blue/20 flex items-center justify-center shrink-0"
                    >
                      <f.icon size={15} className="text-brand-blue" />
                    </motion.div>
                    <span className="text-sm font-inter text-gray-300">{f.text}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Stats */}
              <motion.div
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: 0.48 } } }}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-3 gap-3"
              >
                {trustStats.map((stat, i) => (
                  <motion.div
                    key={i}
                    variants={statVariants}
                    whileHover={{ scale: 1.04, borderColor: 'rgba(255,255,255,0.16)' }}
                    transition={spring.snappy}
                    className="bg-white/5 border border-white/8 rounded-xl p-3.5 text-center backdrop-blur-sm cursor-default"
                  >
                    <stat.icon size={16} className="text-brand-blue mx-auto mb-2 opacity-80" />
                    <p className="font-sora font-bold text-white text-lg leading-none mb-1">{stat.value}</p>
                    <p className="text-gray-500 text-xs font-inter leading-tight">{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...spring.soft, delay: 0.75 }}
            >
              <p className="text-gray-600 text-xs font-inter">© 2024 TruMarkZ. All rights reserved.</p>
            </motion.div>
          </div>
        </div>

        {/* ── Right Panel ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center items-center p-5 sm:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring.smooth, delay: 0.08 }}
            className="w-full max-w-[420px] bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center mb-8">
              <Logo size="lg" />
            </div>

            {/* Header */}
            <div className="mb-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.smooth, delay: 0.16 }}
                className="flex items-center justify-center gap-2 mb-3"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring.snappy, delay: 0.2 }}
                  className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center shrink-0"
                >
                  <Shield size={15} className="text-white" />
                </motion.div>
                <span className="text-xs font-inter font-medium text-gray-400 tracking-wide uppercase">Secure Sign In</span>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.entrance, delay: 0.22 }}
                className="font-sora font-bold text-[28px] text-brand-dark leading-tight mb-1.5"
              >
                {tab === 'login' ? 'Welcome back' : 'Get started'}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...spring.soft, delay: 0.28 }}
                className="text-sm text-gray-400 font-inter"
              >
                {tab === 'login'
                  ? 'Sign in to your TruMarkZ account'
                  : `Create your ${userType === 'organization' ? 'organization' : 'individual'} account`}
              </motion.p>
            </div>

            {/* Role selector */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.smooth, delay: 0.3 }}
              className="mb-7"
            >
              <p className="text-[11px] font-semibold font-inter text-gray-400 uppercase tracking-widest mb-3 text-center">Sign in as</p>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((role) => {
                  const isActive = userType === role.id;
                  return (
                    <motion.button
                      key={role.id}
                      type="button"
                      whileHover={!isActive ? { borderColor: '#d1d5db', scale: 1.02 } : {}}
                      whileTap={{ scale: 0.95 }}
                      transition={spring.snappy}
                      onClick={() => { setUserType(role.id); setErrors({}); if (role.id === 'super-admin') setTab('login'); }}
                      className={`relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border-2 cursor-pointer overflow-hidden ${
                        isActive
                          ? 'border-brand-blue shadow-lg shadow-brand-blue/20'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Shared animated fill — slides between cards */}
                      {isActive && (
                        <motion.div
                          layoutId="roleActivePill"
                          className="absolute inset-0 bg-brand-blue"
                          transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                        />
                      )}

                      {/* Icon */}
                      <motion.div
                        className="relative z-10"
                        animate={{ scale: isActive ? 1.12 : 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      >
                        <role.icon size={20} className={isActive ? 'text-white' : 'text-gray-400'} />
                      </motion.div>

                      {/* Label */}
                      <motion.span
                        className="relative z-10 text-xs font-semibold font-inter text-center leading-tight"
                        animate={{ color: isActive ? '#ffffff' : '#6b7280' }}
                        transition={{ duration: 0.15 }}
                      >
                        {role.label}
                      </motion.span>
                    </motion.button>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={userType}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="text-xs text-gray-400 font-inter text-center mt-2.5"
                >
                  {activeRole?.description}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            {/* Form area */}
            <AnimatePresence mode="wait">
              {tab === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 18 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                >
                  <form onSubmit={handleLogin} autoComplete="on" className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring.smooth, delay: 0.04 }}
                    >
                      <Input label="Email Address" placeholder="you@company.com" name="username" autoComplete="username"
                        value={email} onChange={e => setEmail(e.target.value)} error={errors.email} icon={Mail} />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring.smooth, delay: 0.1 }}
                      className="relative"
                    >
                      <Input label="Password" type="password" placeholder="Enter your password"
                        name="password" autoComplete="current-password" value={password}
                        onChange={e => setPassword(e.target.value)} error={errors.password} icon={Lock} />
                    </motion.div>

                    <AnimatePresence>
                      {errors.form && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={spring.snappy}
                          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 font-inter"
                        >
                          <AlertCircle size={15} className="mt-0.5 shrink-0" />
                          <span>{errors.form}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring.soft, delay: 0.16 }}
                      className="flex items-center justify-between"
                    >
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue focus:ring-offset-0" />
                        <span className="text-sm text-gray-500 font-inter group-hover:text-gray-700 transition-colors">Remember me</span>
                      </label>
                      <motion.button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        transition={spring.micro}
                        className="text-sm text-brand-blue font-inter hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </motion.button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring.smooth, delay: 0.2 }}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.975 }}
                    >
                      <Button type="submit" variant="primary" size="lg" className="w-full mt-1" disabled={submitting}>
                        {submitting
                          ? <span className="flex items-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Signing in…</span>
                          : <><span>Sign In</span><ArrowRight size={17} /></>
                        }
                      </Button>
                    </motion.div>
                  </form>

                  {userType !== 'super-admin' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring.soft, delay: 0.26 }}
                      className="mt-5 space-y-4"
                    >
                      <div className="relative flex items-center">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="mx-3 text-xs text-gray-400 font-inter bg-white px-1">or continue with</span>
                        <div className="flex-1 border-t border-gray-200" />
                      </div>
                      <motion.button
                        type="button"
                        onClick={handleGoogle}
                        disabled={googleLoading}
                        whileHover={{ scale: 1.015, y: -1, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                        whileTap={{ scale: 0.975, y: 0 }}
                        transition={spring.snappy}
                        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-brand-dark font-inter text-sm font-medium disabled:opacity-60 cursor-pointer shadow-sm"
                      >
                        <GoogleIcon />
                        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                      </motion.button>
                      <p className="text-center text-sm text-gray-500 font-inter">
                        {userType === 'individual' ? "Don't have an account? " : 'New organization? '}
                        <motion.button
                          type="button"
                          onClick={() => setTab('register')}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          transition={spring.micro}
                          className="text-brand-blue font-semibold hover:underline cursor-pointer"
                        >
                          {userType === 'individual' ? 'Register here' : 'Register organization'}
                        </motion.button>
                      </p>
                    </motion.div>
                  )}

                  {userType === 'super-admin' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring.smooth, delay: 0.24 }}
                      className="mt-5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3"
                    >
                      <Shield size={14} className="text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 font-inter leading-relaxed">
                        Restricted access. Sign in from an authorized, secure network only.
                      </p>
                    </motion.div>
                  )}
                </motion.div>

              ) : (
                <motion.div
                  key={`register-${userType}`}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 18 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="space-y-5"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.smooth, delay: 0.06 }}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4"
                  >
                    <p className="text-sm text-gray-600 font-inter leading-relaxed">
                      {userType === 'organization'
                        ? 'Register your organization to start verifying identities and issuing blockchain-secured digital credentials.'
                        : 'Create your individual account to build a verified Skill Tree profile and showcase your credentials.'}
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.smooth, delay: 0.12 }}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.975 }}
                  >
                    <Button variant="primary" size="lg" className="w-full" onClick={() => navigate(registerRoutes[userType])}>
                      {userType === 'organization' ? 'Register Organization' : 'Register as Individual'}
                      <ArrowRight size={17} />
                    </Button>
                  </motion.div>
                  <div className="relative flex items-center">
                    <div className="flex-1 border-t border-gray-200" />
                    <span className="mx-3 text-xs text-gray-400 font-inter bg-white px-1">or sign up with</span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>
                  <motion.button
                    type="button"
                    onClick={handleGoogle}
                    disabled={googleLoading}
                    whileHover={{ scale: 1.015, y: -1, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    whileTap={{ scale: 0.975, y: 0 }}
                    transition={spring.snappy}
                    className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-brand-dark font-inter text-sm font-medium disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    <GoogleIcon />
                    {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                  </motion.button>
                  <p className="text-center text-sm text-gray-500 font-inter">
                    Already have an account?{' '}
                    <motion.button
                      type="button"
                      onClick={() => setTab('login')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.micro}
                      className="text-brand-blue font-semibold hover:underline cursor-pointer"
                    >
                      Sign In
                    </motion.button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default LoginRegister;
