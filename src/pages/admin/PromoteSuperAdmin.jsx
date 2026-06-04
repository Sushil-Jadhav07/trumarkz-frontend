import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adminAPI, getApiError } from '@/services/api';
import {
  ShieldCheck,
  Mail,
  CheckCircle,
  AlertCircle,
  History,
  X,
  Search,
  RefreshCw,
  Building2,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';

const flattenUsers = (groups = []) =>
  groups.flatMap((group) =>
    (group.users || []).map((user) => ({
      ...user,
      orgId: group.org_id,
      organizationName: group.organization_name || 'Organization',
    }))
  );

export const PromoteSuperAdmin = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [groupedUsers, setGroupedUsers] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const { data } = await adminAPI.getUsersGrouped();
        if (mounted) setGroupedUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) {
          toast.error(getApiError(err, 'Failed to load users'));
        }
      } finally {
        if (mounted) setUsersLoading(false);
      }
    };

    loadUsers();
    return () => { mounted = false; };
  }, []);

  const allUsers = useMemo(() => flattenUsers(groupedUsers), [groupedUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allUsers.slice(0, 12);
    return allUsers
      .filter((user) =>
        [user.full_name, user.email, user.organizationName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      )
      .slice(0, 12);
  }, [allUsers, search]);

  const selectedUser = useMemo(
    () => allUsers.find((user) => user.email?.toLowerCase() === email.trim().toLowerCase()),
    [allUsers, email]
  );

  const handleSelectUser = (userEmail) => {
    const normalizedCurrent = email.trim().toLowerCase();
    const normalizedNext = String(userEmail || '').trim().toLowerCase();

    if (normalizedCurrent === normalizedNext) {
      setEmail('');
      setError('');
      return;
    }

    setEmail(userEmail || '');
    setError('');
  };

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
      const { data } = await adminAPI.promoteSuperAdmin(email.trim());
      const message = typeof data === 'string' ? data : `${email.trim()} has been promoted to Super Admin.`;
      toast.success(message);
      setHistory((prev) => [
        {
          email: email.trim(),
          name: selectedUser?.full_name || 'Existing user',
          organizationName: selectedUser?.organizationName || 'Organization',
          promotedAt: new Date().toLocaleString(),
        },
        ...prev,
      ]);
      setEmail('');
      setSearch('');
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
        subtitle="Grant super-admin privileges to an existing user account"
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] gap-6">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Card className="p-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 font-inter">Existing account only</p>
                  <p className="text-xs text-amber-700 font-inter mt-0.5">
                    This action elevates an existing user. Pick from the live user list below or enter
                    the email manually if you already know it.
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
                    The account should already exist before promotion.
                  </p>
                </div>

                {selectedUser && (
                  <div className="rounded-2xl border border-brand-blue/20 bg-brand-blue/[0.04] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">Selected account</p>
                    <div className="mt-3 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                        <UserRound size={18} className="text-brand-blue" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950 font-inter">
                          {selectedUser.full_name || 'Existing user'}
                        </p>
                        <p className="text-xs text-slate-500 font-inter">{selectedUser.email}</p>
                        <p className="text-xs text-slate-400 font-inter mt-1">{selectedUser.organizationName}</p>
                      </div>
                    </div>
                  </div>
                )}

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

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-sora font-semibold text-brand-dark">User directory</h3>
                  <p className="text-xs text-gray-500 font-inter mt-1">
                    Search existing users and click one to prefill the promotion form, or type an email manually.
                  </p>
                </div>
                {usersLoading && <RefreshCw size={16} className="animate-spin text-gray-400" />}
              </div>

              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Search by name, email, or organization"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={Search}
                />
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {usersLoading ? (
                  <div className="py-10 text-center text-sm text-gray-400 font-inter">Loading users…</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400 font-inter">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={`${user.id}-${user.email}`}
                      type="button"
                      onClick={() => handleSelectUser(user.email || '')}
                      className={`
                        w-full rounded-2xl border p-4 text-left transition-all
                        ${email.trim().toLowerCase() === String(user.email || '').toLowerCase()
                          ? 'border-brand-blue/30 bg-brand-blue/[0.04]'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}
                      `}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950 font-inter truncate">
                            {user.full_name || 'Existing user'}
                          </p>
                          <p className="text-xs text-slate-500 font-inter truncate mt-1">{user.email}</p>
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 font-inter">
                            <Building2 size={12} />
                            {user.organizationName}
                          </div>
                        </div>
                        {email.trim().toLowerCase() === String(user.email || '').toLowerCase() && (
                          <CheckCircle size={16} className="text-brand-blue shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-6">
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
                  'Approve or reject organisation registrations',
                  'Monitor all platform batches',
                  'Manage verifiers and pricing',
                  'Resolve disputes and operational issues',
                  'Create and promote other super admins',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-600 font-inter">
                    <CheckCircle size={13} className="text-green-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {history.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
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
                      <div>
                        <p className="text-sm font-medium text-brand-dark font-inter">{entry.name}</p>
                        <p className="text-xs text-gray-500 font-inter">{entry.email}</p>
                        <p className="text-xs text-gray-400 font-inter mt-0.5">
                          {entry.organizationName} · {entry.promotedAt}
                        </p>
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
        </div>
      </div>

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
                {selectedUser?.full_name && (
                  <p className="text-xs text-gray-500 font-inter mt-1">
                    {selectedUser.full_name} · {selectedUser.organizationName}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-400 font-inter mb-5">
                This will give the user full administrative access to the platform.
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
