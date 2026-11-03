import { Modal } from '@/components/ui/Modal';
import { SkeletonTableRows } from '@/components/shared/LoadingSkeleton';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { StackedSheets } from '@/components/shared/KpiCard';
import {
  PageIntro, SearchField, Avatar, NumberedPager, SortLabel,
} from '@/components/shared/AdminPageParts';
import { pageRange } from '@/utils/pagination';
import { isValidEmail } from '@/utils/certificateAccess';
import { adminAPI, getApiError } from '@/services/api';
import {
  ShieldCheck,
  Mail,
  CheckCircle2,
  History,
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

const ROLE_LABELS = {
  organization: 'Organization',
  individual: 'Individual',
  super_admin: 'Super Admin',
  'super-admin': 'Super Admin',
};

const PERMISSIONS = [
  'Approve or reject organization registrations',
  'Monitor all platform batches',
  'Manage verifiers and pricing',
  'Resolve operational issues',
  'Create and promote other Super Admins',
];

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50].map((n) => ({ value: n, label: `${n} / page` }));
const muted = 'text-[#7d8aa5]';

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
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

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
    () => [
      { value: '', label: 'All organizations' },
      ...Array.from(new Set(allUsers.map((u) => u.organizationName).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map((org) => ({ value: org, label: org })),
    ],
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

  const toggleSort = (key) => setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'joined' ? 'desc' : 'asc' }));
  const sortedUsers = useMemo(() => {
    if (!sort.key) return filteredUsers;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filteredUsers].sort((a, b) => dir * (sort.key === 'joined'
      ? new Date(a.created_at || 0) - new Date(b.created_at || 0)
      : String(a.full_name || a.email || '').localeCompare(String(b.full_name || b.email || ''))));
  }, [filteredUsers, sort]);

  useEffect(() => { setPage(1); }, [search, orgFilter]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = sortedUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  const { from: startIdx, to: endIdx } = pageRange(safePage, pageSize, sortedUsers.length);

  const selectedUser = useMemo(
    () => allUsers.find((user) => user.email?.toLowerCase() === email.trim().toLowerCase()),
    [allUsers, email]
  );

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
    <AuthLayout title="Promote Super Admin" breadcrumb={['Administration', 'Promote Admin']}>
      <PageIntro
        eyebrow="Access management"
        title="Promote Super Admin"
        subtitle="Grant super-admin privileges to an existing account."
      />

      {/* What this does */}
      <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-5 py-3.5 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]">
        <StackedSheets className="pointer-events-none absolute -right-6 top-1/2 h-[110%] -translate-y-1/2" />
        <div className="relative flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15"><ShieldCheck size={22} strokeWidth={1.75} /></span>
          <div>
            <p className="text-sm font-semibold">Existing accounts only</p>
            <p className="mt-0.5 text-sm text-white/90">Select a user from the directory or enter their email.</p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <section aria-label="Promote by email" className="rounded-xl border border-gray-100 bg-white p-5">
          <h2 className="font-sora text-base font-semibold text-brand-dark">Promote by email</h2>
          <p className="mt-0.5 text-xs text-gray-500 font-inter">The account must already exist.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-4">
            <label htmlFor="promote-email" className="block text-xs font-medium text-gray-700 font-inter">User email address</label>
            <div className="relative mt-1.5">
              <Mail size={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="promote-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
                aria-invalid={!!error}
                aria-describedby={error ? 'promote-email-error' : undefined}
                className={`h-11 w-full rounded-lg border bg-white pl-10 pr-3 text-sm text-gray-700 font-inter placeholder:text-gray-500 focus:outline-none focus:ring-2 disabled:bg-gray-50 ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:border-brand-blue focus:ring-brand-blue/20'}`}
              />
            </div>
            {error && <p id="promote-email-error" role="alert" className="mt-1.5 text-xs text-red-600 font-inter">{error}</p>}

            {selectedUser && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-brand-blue/20 bg-brand-blue/[0.04] px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10"><UserRound size={16} className="text-brand-blue" /></span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-brand-dark font-inter">{selectedUser.full_name || 'Existing user'}</p>
                  <p className="truncate text-xs text-gray-500 font-inter">{selectedUser.email} · {selectedUser.organizationName}</p>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-xs text-gray-500 font-inter">Promotion grants access across the platform.</p>
              <Button type="submit" variant="primary" icon={ShieldCheck} loading={loading} disabled={!email.trim()} className="w-full sm:w-auto">
                Promote to Super Admin
              </Button>
            </div>
          </form>
        </section>

        <section aria-label="Super Admin permissions" className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e3ebf8]"><ShieldCheck size={17} className="text-brand-blue" /></span>
            <h2 className="font-sora text-base font-semibold text-brand-dark">Super Admin permissions</h2>
          </div>
          <ul className="mt-4 space-y-2.5">
            {PERMISSIONS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 font-inter">
                <CheckCircle2 size={17} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-blue" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* User directory */}
      <section aria-label="User directory" className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="flex flex-col gap-3 px-5 pb-3 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2.5 font-sora text-base font-semibold text-brand-dark">
              User directory
              {!usersLoading && <span className="rounded-full bg-[#e3ebf8] px-2.5 py-0.5 text-xs font-semibold text-brand-blue font-inter">{allUsers.length} users</span>}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 font-inter">Select an account to review before promotion.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField search={search} onSearch={setSearch} placeholder="Search name, email or organization" />
            <CustomSelect
              value={orgFilter}
              onChange={setOrgFilter}
              options={orgOptions}
              ariaLabel="Filter by organization"
              searchable
              icon={Building2}
              className="w-full sm:w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hidden">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs font-inter">
            <thead>
              <tr>
                <th aria-sort={sort.key === 'name' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className="px-4 py-2.5"><SortLabel label="User" active={sort.key === 'name'} onClick={() => toggleSort('name')} /></th>
                <th className="px-4 py-2.5">Organization</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Current role</th>
                <th aria-sort={sort.key === 'joined' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className="px-4 py-2.5"><SortLabel label="Joined" active={sort.key === 'joined'} onClick={() => toggleSort('joined')} /></th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usersLoading ? (
                <SkeletonTableRows columns={6} label="Loading users" />
              ) : pagedUsers.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-500">No users found</td></tr>
              ) : (
                pagedUsers.map((user) => {
                  const isSelected = email.trim().toLowerCase() === String(user.email || '').toLowerCase();
                  const roleLabel = ROLE_LABELS[user.user_type] || 'User';
                  return (
                    <tr key={`${user.id}-${user.email}`} className={`transition-colors ${isSelected ? 'bg-brand-blue/[0.05]' : 'hover:bg-blue-50/30'}`}>
                      <td className="px-4 py-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar name={user.full_name || user.email} />
                          <span className="truncate text-[13px] text-brand-dark">{user.full_name || 'Existing user'}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 ${muted}`}>{user.organizationName}</td>
                      <td className={`px-4 py-2.5 ${muted}`}>{user.email || '—'}</td>
                      <td className="px-4 py-2.5"><span className="inline-flex rounded-md bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">{roleLabel}</span></td>
                      <td className={`whitespace-nowrap px-4 py-2.5 ${muted}`}>{formatJoined(user.created_at)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handlePromoteRow(user.email)}
                          disabled={loading || !user.email}
                          title={user.email ? undefined : "This account has no email on file, so it can't be promoted from here"}
                          aria-label={`Promote ${user.full_name || user.email || 'user'} to Super Admin`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-blue/70 bg-white px-3 text-xs font-semibold text-brand-blue transition-colors hover:bg-blue-50 disabled:opacity-50"
                        >
                          <ShieldCheck size={14} /> Promote
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!usersLoading && sortedUsers.length > 0 && (
          <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-3 lg:flex-row lg:items-center">
            <p className="text-xs text-gray-600 font-inter">Showing {startIdx}–{endIdx} of {sortedUsers.length} users</p>
            <div className="flex flex-wrap items-center gap-3">
              <NumberedPager page={safePage} totalPages={totalPages} onPage={setPage} />
              <CustomSelect
                value={pageSize}
                onChange={(n) => { setPageSize(n); setPage(1); }}
                options={PAGE_SIZE_OPTIONS}
                ariaLabel="Rows per page"
                className="w-28"
              />
            </div>
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section aria-label="Promotions this session" className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
            <History size={16} className="text-gray-500" />
            <h2 className="font-sora text-base font-semibold text-brand-dark">Promoted this session</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {history.map((entry, i) => (
              <li key={`${entry.email}-${i}`} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-brand-dark font-inter">{entry.name}</p>
                  <p className="truncate text-xs text-gray-500 font-inter">{entry.email} · {entry.organizationName} · {entry.promotedAt}</p>
                </div>
                <span className="shrink-0 rounded-md bg-green-100 px-2.5 py-1 text-[11px] font-medium text-green-700 font-inter">Promoted</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AnimatePresence>
        {confirmOpen && (
          <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Promotion" size="md">

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
              <p className="text-xs text-gray-500 font-inter mb-5">
                This will give the user full administrative access to the platform.
              </p>

              <Modal.Footer className="flex gap-3">
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
              </Modal.Footer>
          </Modal>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};

export default PromoteSuperAdmin;
