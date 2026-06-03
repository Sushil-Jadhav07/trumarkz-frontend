import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adminAPI, getApiError } from '@/services/api';
import { ShieldCheck, Mail, CheckCircle, AlertCircle, History, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const PromoteSuperAdmin = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email address is required.'); return; }
    if (!isValidEmail(email)) { setError('Please enter a valid email address.'); return; }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setError('');
    try {
      await adminAPI.promoteSuperAdmin(email.trim());
      toast.success(`${email.trim()} has been promoted to Super Admin.`);
      setHistory((prev) => [
        { email: email.trim(), promotedAt: new Date().toLocaleString() },
        ...prev,
      ]);
      setEmail('');
    } catch (err) {
      const msg = getApiError(err, 'Failed to promote user. Please try again.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Promote Super Admin">
      <PageHeader
        title="Promote Super Admin"
        subtitle="Grant super admin privileges to an existing user account"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form card */}
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Card className="p-6">
              {/* Warning banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 font-inter">Elevated Privilege Action</p>
                  <p className="text-xs text-amber-700 font-inter mt-0.5">
                    Promoting a user grants them full platform control including user management,
                    pricing configuration, and dispute resolution. This action is logged.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
                    User Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    icon={Mail}
                    error={error}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-400 font-inter mt-1.5">
                    The account must already exist and be verified.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  icon={ShieldCheck}
                  loading={loading}
                  className="w-full sm:w-auto"
                >
                  Promote to Super Admin
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
                <h3 className="font-sora font-semibold text-brand-dark text-sm">Super Admin Permissions</h3>
              </div>
              <ul className="space-y-2">
                {[
                  'Approve / reject organisation registrations',
                  'Monitor all batches across the platform',
                  'Manage third-party verifiers',
                  'Configure verification pricing',
                  'Resolve disputes',
                  'View platform health & analytics',
                  'Promote other super admins',
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

      {/* Promotion history (session only) */}
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
              <h3 className="font-sora font-semibold text-brand-dark">Session Promotion Log</h3>
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
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle size={14} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-dark font-inter">{entry.email}</p>
                      <p className="text-xs text-gray-400 font-inter">Promoted at {entry.promotedAt}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-lg font-inter">
                    Promoted
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
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <ShieldCheck size={20} className="text-amber-500" />
                  </div>
                  <h2 className="font-sora font-bold text-brand-dark">Confirm Promotion</h2>
                </div>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm text-gray-600 font-inter mb-1">
                You are about to grant <strong>Super Admin</strong> privileges to:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
                <p className="text-sm font-semibold text-brand-dark font-inter break-all">{email}</p>
              </div>
              <p className="text-xs text-gray-400 font-inter mb-5">
                This will give the user full administrative access to the platform. This action is irreversible
                without manual intervention.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  icon={ShieldCheck}
                  onClick={handleConfirm}
                >
                  Yes, Promote
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};

export default PromoteSuperAdmin;
