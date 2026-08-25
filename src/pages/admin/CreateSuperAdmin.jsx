import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adminAPI, getApiError } from '@/services/api';
import {
  ShieldCheck, Mail, User, Lock, Eye, EyeOff,
  AlertCircle, CheckCircle, History, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const validate = (fields) => {
  const errs = {};
  if (!fields.fullName.trim()) errs.fullName = 'Full name is required.';
  else if (fields.fullName.trim().length < 2) errs.fullName = 'Name must be at least 2 characters.';
  if (!fields.email.trim()) errs.email = 'Email address is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errs.email = 'Please enter a valid email address.';
  if (!fields.password) errs.password = 'Password is required.';
  else if (fields.password.length < 8) errs.password = 'Password must be at least 8 characters.';
  return errs;
};

export const CreateSuperAdmin = () => {
  const [fields, setFields] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const set = (key) => (e) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      await adminAPI.createSuperAdmin(fields);
      toast.success(`Super admin account created for ${fields.fullName.trim()}.`);
      setHistory((prev) => [
        { name: fields.fullName.trim(), email: fields.email.trim(), createdAt: new Date().toLocaleString() },
        ...prev,
      ]);
      setFields({ fullName: '', email: '', password: '' });
      setErrors({});
    } catch (err) {
      const msg = getApiError(err, 'Failed to create super admin. Please try again.');
      setErrors((prev) => ({ ...prev, _form: msg }));
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Super Admin">
      <PageHeader
        title="Create Super Admin"
        subtitle="Create a new super admin account with full platform access"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form card */}
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Card className="p-6">
              {/* Warning banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-6">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 font-inter">High-Privilege Action</p>
                  <p className="text-xs text-red-700 font-inter mt-0.5">
                    This creates a brand-new account with super admin access. Ensure the credentials
                    are shared only with the intended recipient via a secure channel.
                  </p>
                </div>
              </div>

              {/* Form-level error */}
              <AnimatePresence>
                {errors._form && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 mb-5"
                  >
                    <AlertCircle size={15} className="text-red-500 shrink-0" />
                    <p className="text-sm text-red-700 font-inter">{errors._form}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={fields.fullName}
                    onChange={set('fullName')}
                    icon={User}
                    error={errors.fullName}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={fields.email}
                    onChange={set('email')}
                    icon={Mail}
                    error={errors.email}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={fields.password}
                      onChange={set('password')}
                      icon={Lock}
                      error={errors.password}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Password strength hint */}
                  {fields.password && (
                    <div className="flex gap-1.5 mt-2">
                      {[1, 2, 3, 4].map((level) => {
                        const strength = Math.min(
                          4,
                          [fields.password.length >= 8, /[A-Z]/.test(fields.password),
                            /[0-9]/.test(fields.password), /[^A-Za-z0-9]/.test(fields.password)].filter(Boolean).length,
                        );
                        const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
                        return (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${level <= strength ? colors[strength - 1] : 'bg-gray-200'}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  icon={ShieldCheck}
                  loading={loading}
                  className="w-full sm:w-auto"
                >
                  Create Super Admin Account
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>

        {/* Info card */}
        <div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.08 }}>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-brand-blue" />
                </div>
                <h3 className="font-sora font-semibold text-brand-dark text-sm">Account Will Have</h3>
              </div>
              <ul className="space-y-2">
                {[
                  'Immediate platform access',
                  'Approve / reject organisations',
                  'Monitor all batches',
                  'Manage third-party verifiers',
                  'Configure verification pricing',
                  'Resolve disputes',
                  'View platform health',
                  'Create & promote admins',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-600 font-inter">
                    <CheckCircle size={13} className="text-green-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Session creation log */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
        >
          <Card className="p-0 overflow-hidden border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <History size={16} className="text-gray-400" />
              <h3 className="font-sora font-semibold text-brand-dark">Session Creation Log</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {history.map((entry, i) => (
                <motion.div
                  key={`${entry.email}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-sm font-sora">
                      {entry.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-dark font-inter">{entry.name}</p>
                      <p className="text-xs text-gray-400 font-inter">{entry.email} · {entry.createdAt}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-lg font-inter">
                    Created
                  </span>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Confirmation modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <ShieldCheck size={20} className="text-red-500" />
                  </div>
                  <h2 className="font-sora font-bold text-brand-dark">Confirm Creation</h2>
                </div>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm text-gray-600 font-inter mb-3">
                You are about to create a new <strong>Super Admin</strong> account:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-1 mb-5">
                <p className="text-sm font-semibold text-brand-dark font-inter">{fields.fullName.trim()}</p>
                <p className="text-xs text-gray-500 font-inter break-all">{fields.email.trim()}</p>
              </div>
              <p className="text-xs text-gray-400 font-inter mb-5">
                This account will have immediate full platform access. Share the credentials securely
                with the intended recipient only.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" icon={ShieldCheck} onClick={handleConfirm}>
                  Yes, Create Account
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};

export default CreateSuperAdmin;
