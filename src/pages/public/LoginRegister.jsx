import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, Building2, Users, Globe, ArrowRight, CheckCircle, Shield, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_CREDENTIALS_KEY = 'trumarkz_role_credentials';

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
    if (result.success) {
      setSent(true);
    } else {
      // API always returns 200 per docs, so errors are network-level only
      toast.error(result.error || 'Something went wrong. Please try again.');
    }
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
            <p className="text-sm text-gray-500 font-inter mb-5">
              Enter your registered email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                placeholder="Enter your email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                icon={Mail}
              />
              <Button type="submit" variant="primary" size="md" className="w-full" disabled={submitting || !email.trim()}>
                {submitting ? 'Sending…' : 'Send Reset Link'}
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
              If an account exists for <span className="font-medium text-brand-dark">{email}</span>, a password reset link has been sent. It expires in 30 minutes.
            </p>
            <Button variant="outline" size="md" className="w-full" onClick={onClose}>Close</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
export const LoginRegister = () => {
  const validRoles = ['organization', 'individual', 'super-admin'];
  const roleDescriptions = {
    organization: 'Verify workers & products. Issue credentials.',
    individual: 'Build your verified Skill Tree resume.',
    'super-admin': 'Full platform control and monitoring.',
  };

  const registerContent = {
    organization: {
      description: 'Register your organization to start verifying identities and issuing digital credentials.',
      buttonLabel: 'Register Organization',
      route: '/register',
    },
    individual: {
      description: 'Create an individual account to build your verified Skill Tree profile and showcase your credentials.',
      buttonLabel: 'Register as Individual',
      route: '/register/individual',
    },
    'super-admin': {
      description: 'Super Admin accounts are provisioned by the platform. Please contact support if you need access.',
      buttonLabel: null,
      route: null,
    },
  };

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, forgotPassword } = useAuth();

  const [tab, setTab] = useState('login');
  const [role, setRole] = useState(() => {
    const roleFromUrl = searchParams.get('role');
    const roleFromSession = sessionStorage.getItem('trumarkz_login_role');
    return validRoles.includes(roleFromUrl) ? roleFromUrl : validRoles.includes(roleFromSession) ? roleFromSession : 'organization';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const applyCredentialsForRole = (selectedRole) => {
    try {
      const raw = localStorage.getItem(ROLE_CREDENTIALS_KEY);
      const savedByRole = raw ? JSON.parse(raw) : {};
      const saved = savedByRole?.[selectedRole];
      if (saved?.password) {
        savedByRole[selectedRole] = { email: saved.email || '' };
        localStorage.setItem(ROLE_CREDENTIALS_KEY, JSON.stringify(savedByRole));
      }
      const pendingRole = sessionStorage.getItem('trumarkz_login_role');
      const pendingIdentifier = sessionStorage.getItem('trumarkz_login_identifier');
      setEmail(pendingRole === selectedRole && pendingIdentifier ? pendingIdentifier : saved?.email || '');
      setPassword('');
    } catch {
      setEmail('');
      setPassword('');
    }
  };

  useEffect(() => { applyCredentialsForRole(role); }, [role]);

  useEffect(() => {
    const roleFromUrl = searchParams.get('role');
    if (validRoles.includes(roleFromUrl) && roleFromUrl !== role) {
      setRole(roleFromUrl);
      setTab('login');
    }
  }, [searchParams, role]);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    applyCredentialsForRole(selectedRole);
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email or mobile is required';
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
    const result = await login(email.trim(), password, role, rememberMe);
    setSubmitting(false);

    if (!result.success) {
      if (result.requiresVerification) {
        toast.error('Please verify your email OTP before signing in.');
        navigate('/verify-otp');
        return;
      }
      setErrors({ form: result.error || 'Login failed' });
      toast.error(result.error || 'Login failed');
      return;
    }

    try {
      const raw = localStorage.getItem(ROLE_CREDENTIALS_KEY);
      const savedByRole = raw ? JSON.parse(raw) : {};
      if (rememberMe) {
        savedByRole[role] = { email: email.trim() };
      } else {
        delete savedByRole[role];
      }
      localStorage.setItem(ROLE_CREDENTIALS_KEY, JSON.stringify(savedByRole));
      sessionStorage.removeItem('trumarkz_login_identifier');
      sessionStorage.removeItem('trumarkz_login_role');
    } catch {}

    toast.success('Welcome back!');
    if (role === 'organization') navigate('/org/dashboard');
    else if (role === 'individual') navigate('/individual/dashboard');
    else if (role === 'super-admin') navigate('/admin/dashboard');
  };

  const roles = [
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'individual', label: 'Individual', icon: Globe },
    { id: 'super-admin', label: 'Super Admin', icon: Users },
  ];

  const regContent = registerContent[role];

  return (
    <>
      <AnimatePresence>
        {showForgotPassword && (
          <ForgotPasswordModal
            onClose={() => setShowForgotPassword(false)}
            forgotPassword={forgotPassword}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen flex bg-brand-bg">
        {/* Left decorative panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-brand-dark flex-col justify-between p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 via-transparent to-transparent" />
          <div className="relative z-10"><Logo size="md" dark showTagline /></div>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3"><div className="p-2 bg-white/10 rounded-lg"><Shield size={24} className="text-brand-blue" /></div><div><p className="text-white font-sora font-bold text-lg">10M+</p><p className="text-gray-400 text-sm font-inter">Verifications Done</p></div></div>
            <div className="flex items-center gap-3"><div className="p-2 bg-white/10 rounded-lg"><CheckCircle size={24} className="text-green-400" /></div><div><p className="text-white font-sora font-bold text-lg">99.99%</p><p className="text-gray-400 text-sm font-inter">Uptime SLA</p></div></div>
            <div className="flex items-center gap-3"><div className="p-2 bg-white/10 rounded-lg"><Globe size={24} className="text-brand-blue" /></div><div><p className="text-white font-sora font-bold text-lg">50+</p><p className="text-gray-400 text-sm font-inter">Countries Served</p></div></div>
          </div>
          <div className="relative z-10"><p className="text-gray-500 text-xs font-inter">© 2024 TruMarkZ. All rights reserved.</p></div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex flex-col justify-center p-4 sm:p-8 lg:p-12">
          <div className="max-w-xl w-full mx-auto">
            <div className="lg:hidden mb-6 text-center"><Logo size="lg" /></div>
            <h2 className="font-sora font-bold text-2xl text-center text-brand-dark mb-2">
              {tab === 'login' ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-sm text-gray-500 text-center font-inter mb-6">
              {tab === 'login' ? 'Sign in to your account' : `Create your ${role === 'individual' ? 'individual' : 'organization'} account`}
            </p>

            {/* Role selector */}
            <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-gray-200 rounded-xl">
              {roles.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleSelect(r.id)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-sm font-medium font-inter transition-all min-h-[46px] ${
                    role === r.id ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <r.icon size={16} className="shrink-0" />
                  <span className="text-xs sm:text-sm leading-tight text-center whitespace-nowrap">{r.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 font-inter text-center mb-4 -mt-2">{roleDescriptions[role]}</p>

            {/* Sign In / Register tabs */}
            <div className="flex gap-6 mb-6 border-b border-gray-200">
              <button onClick={() => setTab('login')} className={`pb-3 text-sm font-medium font-inter border-b-2 transition-colors ${tab === 'login' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Sign In</button>
              {role !== 'super-admin' && (
                <button onClick={() => setTab('register')} className={`pb-3 text-sm font-medium font-inter border-b-2 transition-colors ${tab === 'register' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Register</button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {tab === 'login' ? (
                <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleLogin} autoComplete="on" className="space-y-4">
                  <Input label="Email or Mobile" placeholder="Enter email or mobile" name="username" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} icon={Mail} />
                  <Input label="Password" type="password" placeholder="Enter password" name="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} error={errors.password} icon={Lock} />
                  {errors.form && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 font-inter">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{errors.form}</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
                      <span className="text-sm text-gray-500 font-inter">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-brand-blue font-inter hover:underline sm:text-right"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? 'Signing in…' : 'Sign In'} <ArrowRight size={18} />
                  </Button>
                  {role !== 'super-admin' && (
                    <p className="text-center text-sm text-gray-500 font-inter">
                      {role === 'individual' ? 'New here?' : 'New Organization?'}{' '}
                      <button type="button" onClick={() => setTab('register')} className="text-brand-blue font-medium hover:underline">
                        {role === 'individual' ? 'Register as Individual' : 'Register Organization'}
                      </button>
                    </p>
                  )}
                </motion.form>
              ) : (
                <motion.div key={`register-${role}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  <p className="text-sm text-gray-500 font-inter mb-4">{regContent.description}</p>
                  {regContent.buttonLabel && regContent.route && (
                    <Button variant="primary" size="lg" className="w-full" onClick={() => navigate(regContent.route)}>
                      {regContent.buttonLabel} <ArrowRight size={18} />
                    </Button>
                  )}
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
