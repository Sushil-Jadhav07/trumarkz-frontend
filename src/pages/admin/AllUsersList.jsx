import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { adminAPI, getApiError } from '@/services/api';
import {
  Search,
  Users,
  UserRound,
  ShieldCheck,
  Briefcase,
  RefreshCw,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 100;

const USER_TYPE_TABS = [
  { value: '', label: 'All Users' },
  { value: 'individual', label: 'Individual' },
  { value: 'organization', label: 'Organization' },
  { value: 'super_admin', label: 'Super Admin' },
];

const userTypeMeta = {
  organization: { label: 'Organization', bg: 'bg-blue-50', text: 'text-brand-blue', icon: Briefcase },
  individual: { label: 'Individual', bg: 'bg-green-50', text: 'text-green-600', icon: UserRound },
  super_admin: { label: 'Super Admin', bg: 'bg-purple-50', text: 'text-purple-600', icon: ShieldCheck },
  'super-admin': { label: 'Super Admin', bg: 'bg-purple-50', text: 'text-purple-600', icon: ShieldCheck },
};

const UserTypeBadge = ({ type }) => {
  const meta = userTypeMeta[type] || {
    label: type || 'Unknown',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: UserRound,
  };
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium font-inter ${meta.bg} ${meta.text}`}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  );
};

const StatusPill = ({ active, label }) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] font-inter font-medium ${
      active ? 'text-green-600' : 'text-gray-400'
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-green-500' : 'bg-gray-300'}`}
    />
    {label}
  </span>
);

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const AllUsersList = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const fetchUsers = useCallback(async (type, pageIdx) => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: pageIdx * PAGE_SIZE };
      if (type) params.user_type = type;
      const { data } = await adminAPI.getAllUsers(params);
      setUsers(Array.isArray(data.users) ? data.users : []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(typeFilter, page);
  }, [page, typeFilter, fetchUsers]);

  const handleTypeChange = (type) => {
    setTypeFilter(type);
    setPage(0);
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.full_name, u.email, u.organization_name, u.phone_number]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, total);

  const activeTabLabel =
    USER_TYPE_TABS.find((t) => t.value === typeFilter)?.label || 'All Users';

  return (
    <AuthLayout title="User List">
      <PageHeader
        title="User List"
        subtitle="All platform users — filter by type, search by name or email"
        action={
          <button
            type="button"
            onClick={() => fetchUsers(typeFilter, page)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Total count card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="mb-5"
      >
        <Card className="px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Users size={17} className="text-brand-blue" />
          </div>
          <div>
            <p className="text-2xl font-bold text-brand-dark font-sora leading-none">
              {loading ? '—' : total}
            </p>
            <p className="text-xs text-gray-400 font-inter mt-1">{activeTabLabel}</p>
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.04 }}
        className="flex flex-col sm:flex-row gap-3 mb-5"
      >
        <div className="flex-1 max-w-sm">
          <Input
            type="text"
            placeholder="Search by name, email, or org…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {USER_TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTypeChange(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium font-inter whitespace-nowrap transition-colors ${
                typeFilter === tab.value
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.08 }}
      >
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              {/* Header */}
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.5fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1.2fr)] gap-3 px-5 py-3 bg-brand-bg border-b border-gray-100">
                {['User', 'Email', 'Phone', 'Type', 'Status', 'Joined'].map((h) => (
                  <span
                    key={h}
                    className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide font-inter"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Skeleton */}
              {loading && (
                <div className="divide-y divide-gray-50">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.5fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1.2fr)] gap-3 px-5 py-4 animate-pulse items-center"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
                        <div className="h-3.5 bg-gray-100 rounded w-24" />
                      </div>
                      <div className="h-3.5 bg-gray-100 rounded w-36" />
                      <div className="h-3.5 bg-gray-100 rounded w-24" />
                      <div className="h-6 bg-gray-100 rounded-full w-20" />
                      <div className="space-y-1.5">
                        <div className="h-3 bg-gray-100 rounded w-24" />
                        <div className="h-3 bg-gray-100 rounded w-16" />
                        <div className="h-3 bg-gray-100 rounded w-20" />
                      </div>
                      <div className="h-3.5 bg-gray-100 rounded w-20" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty */}
              {!loading && filteredUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <Users size={20} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-brand-dark font-sora">No users found</p>
                  <p className="text-xs text-gray-400 font-inter mt-1">
                    {search
                      ? 'Try a different search term.'
                      : 'No users match this filter.'}
                  </p>
                </div>
              )}

              {/* Rows */}
              {!loading && filteredUsers.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {filteredUsers.map((user, i) => (
                    <motion.div
                      key={user.id || i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.015 }}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.5fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1.2fr)] gap-3 px-5 py-3.5 items-center hover:bg-gray-50/60 transition-colors"
                    >
                      {/* User */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-brand-blue font-sora uppercase">
                          {user.full_name?.[0] || user.organization_name?.[0] || user.email?.[0] || '?'}
                        </div>
                        <span className="text-sm font-medium text-brand-dark font-inter truncate">
                          {user.full_name || user.organization_name || '—'}
                        </span>
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail size={11} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-500 font-inter truncate">
                          {user.email || '—'}
                        </span>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Phone size={11} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-500 font-inter truncate">
                          {user.phone_number || '—'}
                        </span>
                      </div>

                      {/* Type */}
                      <div>
                        <UserTypeBadge type={user.user_type} />
                      </div>

                      {/* Status */}
                      <div className="flex flex-col gap-1">
                        <StatusPill active={user.email_verified} label="Email verified" />
                        <StatusPill active={user.is_active} label="Active" />
                        <StatusPill active={user.onboarding_completed} label="Onboarded" />
                      </div>

                      {/* Joined */}
                      <span className="text-xs text-gray-400 font-inter">
                        {formatDate(user.created_at)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {!loading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-brand-bg">
              <p className="text-xs text-gray-400 font-inter">
                Showing {startIdx}–{endIdx} of {total} users
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-inter"
                >
                  <ChevronLeft size={13} />
                  Prev
                </button>
                <span className="text-xs text-gray-500 font-inter px-1">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-inter"
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </AuthLayout>
  );
};

export default AllUsersList;
