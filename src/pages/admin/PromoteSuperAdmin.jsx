import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
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

const ROLE_LABELS = {
  organization: 'Organization',
  individual: 'Individual',
  super_admin: 'Super Admin',
  'super-admin': 'Super Admin',
};

const formatJoined = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const PromoteSuperAdmin = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [groupedUsers, setGroupedUsers] = useState([]);
  const [orgFilter, setOrgFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data } = await adminAPI.getUsersGrouped();
      setGroupedUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load users'));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const allUsers = useMemo(() => flattenUsers(groupedUsers), [groupedUsers]);

  const orgOptions = useMemo(
    () => Array.from(new Set(allUsers.map((u) => u.organizationName).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [allUsers]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allUsers.filter((user) => {
      if (orgFilter && user.organizationName !== orgFilter) return false;
      if (!query) return true;
      return [user.full_name, user.email, user.organizationName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [allUsers, search, orgFilter]);

  useEffect(() => { setPage(1); }, [search, orgFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedUser = useMemo(
    () => allUsers.find((user) => user.email?.toLowerCase() === email.trim().toLowerCase()),
    [allUsers, email]
  );

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email address is required.'); return; }
    if (!isValidEmail(email)) { setError('Please enter a valid email address.'); return; }
    setConfirmOpen(true);
  };

  const handlePromoteRow = (userEmail) => {
    if (!userEmail) return;
    setEmail(userEmail);
    setError('');
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="p-6 h-full">
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

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.08 }}>
          <Card className="p-5 h-full">
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
      </div>

      {/* User Directory */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.12 }} className="mt-6">
        <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/70">
            <h3 className="font-sora font-semibold text-brand-dark text-lg">User Directory</h3>
            <p className="text-sm text-gray-500 font-inter mt-1">
              Search existing users and click promote to grant super-admin privileges.
            </p>
          </div>

          <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by name, email, or organization"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
              />
            </div>
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-gray-400 shrink-0" />
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold font-inter text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 min-w-[200px]"
              >
                <option value="">All Organizations</option>
                {orgOptions.map((org) => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
              {usersLoading && <RefreshCw size={16} className="animate-spin text-gray-400 shrink-0" />}
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-hidden">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['User', 'Organization', 'Email', 'Role', 'Joined', 'Action'].map((h) => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter ${h === 'Action' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {usersLoading ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400 font-inter">Loading users…</td></tr>
                ) : pagedUsers.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400 font-inter">No users found</td></tr>
                ) : (
                  pagedUsers.map((user) => {
                    const isSelected = email.trim().toLowerCase() === String(user.email || '').toLowerCase();
                    const roleLabel = ROLE_LABELS[user.user_type] || 'User';
                    return (
                      <tr key={`${user.id}-${user.email}`} className={`transition-colors ${isSelected ? 'bg-brand-blue/[0.04]' : 'hover:bg-gray-50/70'}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0 text-xs font-semibold font-inter">
                              {(user.full_name || 'U').slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-brand-dark font-inter truncate">{user.full_name || 'Existing user'}</p>
                              <p className="text-xs text-gray-400 font-inter truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 font-inter">
                            <Building2 size={11} />
                            {user.organizationName}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500 font-inter">{user.email}</td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-600 font-inter border border-gray-200">{roleLabel}</span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500 font-inter whitespace-nowrap">{formatJoined(user.created_at)}</td>
                        <td className="px-5 py-4 text-right">
                          <Button variant="outline" size="sm" icon={ShieldCheck} onClick={() => handlePromoteRow(user.email)} disabled={loading}>
                            Promote
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!usersLoading && filteredUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-inter">
                Showing {(safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold font-inter ${
                          safePage === pageNum ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold font-inter text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
                </select>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {history.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-6">
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
