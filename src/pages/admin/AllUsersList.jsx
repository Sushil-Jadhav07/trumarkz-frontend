import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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
  ChevronDown,
  UserPlus,
  Pencil,
  UserX,
  AlertTriangle,
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
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
    {label}
  </span>
);

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between py-0.5">
    <div className="min-w-0 mr-4">
      <p className="text-sm font-medium text-brand-dark font-inter">{label}</p>
      {description && <p className="text-xs text-gray-400 font-inter mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-brand-blue' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
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

// ─── Custom User Type Select ─────────────────────────────────────────────────

const USER_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual', icon: UserRound, bg: 'bg-green-50', text: 'text-green-600' },
  { value: 'organization', label: 'Organization', icon: Briefcase, bg: 'bg-blue-50', text: 'text-brand-blue' },
  { value: 'super_admin', label: 'Super Admin', icon: ShieldCheck, bg: 'bg-purple-50', text: 'text-purple-600' },
];

const UserTypeSelect = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  const selected = USER_TYPE_OPTIONS.find((o) => o.value === value) || USER_TYPE_OPTIONS[0];
  const SelectedIcon = selected.icon;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 font-inter text-sm bg-white ${
          open
            ? 'border-brand-blue ring-4 ring-brand-blue/10'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${selected.bg}`}>
            <SelectedIcon size={13} className={selected.text} />
          </div>
          <span className="text-brand-dark font-medium">{selected.label}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.14 }}
          className="absolute z-20 top-full mt-1.5 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {USER_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                  isSelected
                    ? 'bg-brand-blue/5'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${opt.bg}`}>
                  <Icon size={14} className={opt.text} />
                </div>
                <span className={`text-sm font-inter font-medium ${isSelected ? 'text-brand-blue' : 'text-brand-dark'}`}>
                  {opt.label}
                </span>
                {isSelected && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-blue" />
                )}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

// ─── Create User Modal ────────────────────────────────────────────────────────

const BLANK_CREATE = {
  user_type: 'individual',
  email: '',
  password: '',
  full_name: '',
  organization_name: '',
  phone_number: '',
};

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState(BLANK_CREATE);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Required';
    if (!form.password) errs.password = 'Required';
    if (form.user_type === 'organization' && !form.organization_name.trim())
      errs.organization_name = 'Required for organization accounts';
    if (form.user_type !== 'organization' && !form.full_name.trim())
      errs.full_name = 'Required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const payload = {
        user_type: form.user_type,
        email: form.email.trim(),
        password: form.password,
      };
      if (form.user_type === 'organization') {
        payload.organization_name = form.organization_name.trim();
      } else {
        payload.full_name = form.full_name.trim();
      }
      if (form.phone_number.trim()) payload.phone_number = form.phone_number.trim();
      await adminAPI.createUser(payload);
      toast.success('User created successfully');
      setForm(BLANK_CREATE);
      setErrors({});
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to create user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setForm(BLANK_CREATE);
    setErrors({});
    onClose();
  };

  const isOrg = form.user_type === 'organization';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create User" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Type */}
        <div>
          <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
            User Type <span className="text-red-500">*</span>
          </label>
          <UserTypeSelect
            value={form.user_type}
            onChange={(val) => {
              setForm((f) => ({ ...f, user_type: val, full_name: '', organization_name: '' }));
              setErrors((prev) => ({ ...prev, full_name: undefined, organization_name: undefined }));
            }}
          />
        </div>

        {/* Email */}
        <Input
          label={<>Email <span className="text-red-500">*</span></>}
          type="email"
          placeholder="user@example.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />

        {/* Password */}
        <Input
          label={<>Password <span className="text-red-500">*</span></>}
          type="password"
          placeholder="Set a strong password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />

        {/* Name — conditional */}
        {isOrg ? (
          <Input
            label={<>Organization Name <span className="text-red-500">*</span></>}
            placeholder="Acme Corp"
            value={form.organization_name}
            onChange={set('organization_name')}
            error={errors.organization_name}
          />
        ) : (
          <Input
            label={<>Full Name <span className="text-red-500">*</span></>}
            placeholder="John Doe"
            value={form.full_name}
            onChange={set('full_name')}
            error={errors.full_name}
          />
        )}

        {/* Phone (optional) */}
        <Input
          label="Phone Number"
          placeholder="+91 98765 43210"
          value={form.phone_number}
          onChange={set('phone_number')}
        />

        <p className="text-xs text-gray-400 font-inter">
          The account will be created as email verified and active — no OTP flow required.
        </p>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-medium font-inter hover:bg-brand-blue/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Edit User Modal ──────────────────────────────────────────────────────────

const EditUserModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    organization_name: '',
    dhiway_space_id: '',
    is_active: true,
    email_verified: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        organization_name: user.organization_name || '',
        dhiway_space_id: user.dhiway_space_id || '',
        is_active: user.is_active ?? true,
        email_verified: user.email_verified ?? true,
      });
    }
  }, [user]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggle = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        is_active: form.is_active,
        email_verified: form.email_verified,
      };
      if (form.full_name.trim()) payload.full_name = form.full_name.trim();
      if (form.phone_number.trim()) payload.phone_number = form.phone_number.trim();
      if (form.organization_name.trim()) payload.organization_name = form.organization_name.trim();
      if (isOrg) payload.dhiway_space_id = form.dhiway_space_id.trim();
      await adminAPI.updateUser(user.id, payload);
      toast.success('User updated');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update user'));
    } finally {
      setSubmitting(false);
    }
  };

  const isOrg = user?.user_type === 'organization';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="md">
      {user && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User summary */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-brand-bg rounded-xl">
            <div className="w-9 h-9 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 text-sm font-bold text-brand-blue font-sora uppercase">
              {user.full_name?.[0] || user.organization_name?.[0] || user.email?.[0] || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-dark font-inter truncate">
                {user.full_name || user.organization_name || '—'}
              </p>
              <p className="text-xs text-gray-400 font-inter truncate">{user.email}</p>
            </div>
            <UserTypeBadge type={user.user_type} />
          </div>

          {/* Name field (conditional by type) */}
          {isOrg ? (
            <Input
              label="Organization Name"
              value={form.organization_name}
              onChange={set('organization_name')}
              placeholder="Acme Corp"
            />
          ) : (
            <Input
              label="Full Name"
              value={form.full_name}
              onChange={set('full_name')}
              placeholder="John Doe"
            />
          )}

          <Input
            label="Phone Number"
            value={form.phone_number}
            onChange={set('phone_number')}
            placeholder="+91 98765 43210"
          />

          {isOrg && (
            <Input
              label="Dhiway Space ID"
              value={form.dhiway_space_id}
              onChange={set('dhiway_space_id')}
              placeholder="Leave blank to use the config default"
            />
          )}

          {/* Status toggles */}
          <div className="space-y-3 p-4 bg-brand-bg rounded-xl">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide font-inter mb-1">
              Account Status
            </p>
            <Toggle
              checked={form.is_active}
              onChange={toggle('is_active')}
              label="Account Active"
              description="Disable to prevent this user from logging in"
            />
            <div className="border-t border-gray-100" />
            <Toggle
              checked={form.email_verified}
              onChange={toggle('email_verified')}
              label="Email Verified"
              description="Override the email verification status"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-medium font-inter hover:bg-brand-blue/90 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

// ─── Deactivate Confirmation Modal ────────────────────────────────────────────

const DeactivateModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleDeactivate = async () => {
    setSubmitting(true);
    try {
      await adminAPI.deactivateUser(user.id);
      toast.success('User deactivated');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to deactivate user'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title="" size="sm">
      {user && (
        <div className="space-y-5 pt-2">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-brand-dark font-sora">Deactivate User?</p>
              <p className="text-sm text-gray-500 font-inter mt-1">
                <span className="font-medium text-brand-dark">
                  {user.full_name || user.organization_name || user.email}
                </span>{' '}
                will be unable to log in. Their data is not deleted and this can be reversed via Edit.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium font-inter hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Deactivating…' : 'Deactivate'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─── Grid template (7 columns) ────────────────────────────────────────────────
const GRID = 'grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1.8fr)_minmax(0,0.9fr)_80px]';

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AllUsersList = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [deactivateModal, setDeactivateModal] = useState({ open: false, user: null });

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

  const refresh = () => fetchUsers(typeFilter, page);

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
  const activeTabLabel = USER_TYPE_TABS.find((t) => t.value === typeFilter)?.label || 'All Users';

  return (
    <AuthLayout title="User List">
      <PageHeader
        title="User List"
        subtitle="Manage all platform users — create, edit, or deactivate accounts"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-blue text-white text-sm font-medium font-inter hover:bg-brand-blue/90 transition-colors shadow-sm"
            >
              <UserPlus size={14} />
              Create User
            </button>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Stats */}
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
            <div className="min-w-[880px]">
              {/* Header */}
              <div className={`grid ${GRID} gap-3 px-5 py-3 bg-brand-bg border-b border-gray-100`}>
                {['User', 'Email', 'Phone', 'Type', 'Status', 'Joined', 'Actions'].map((h) => (
                  <span
                    key={h}
                    className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wide font-inter ${h === 'Actions' ? 'text-right' : ''}`}
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Skeleton */}
              {loading && (
                <div className="divide-y divide-gray-50">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`grid ${GRID} gap-3 px-5 py-4 animate-pulse items-center`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
                        <div className="h-3.5 bg-gray-100 rounded w-24" />
                      </div>
                      <div className="h-3.5 bg-gray-100 rounded w-36" />
                      <div className="h-3.5 bg-gray-100 rounded w-20" />
                      <div className="h-6 bg-gray-100 rounded-full w-20" />
                      <div className="space-y-1.5">
                        <div className="h-3 bg-gray-100 rounded w-24" />
                        <div className="h-3 bg-gray-100 rounded w-14" />
                        <div className="h-3 bg-gray-100 rounded w-18" />
                      </div>
                      <div className="h-3.5 bg-gray-100 rounded w-16" />
                      <div className="flex gap-1 justify-end">
                        <div className="w-7 h-7 bg-gray-100 rounded-lg" />
                        <div className="w-7 h-7 bg-gray-100 rounded-lg" />
                      </div>
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
                    {search ? 'Try a different search term.' : 'No users match this filter.'}
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
                      transition={{ delay: i * 0.012 }}
                      className={`grid ${GRID} gap-3 px-5 py-3.5 items-center hover:bg-gray-50/60 transition-colors ${!user.is_active ? 'opacity-60' : ''}`}
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
                        <span className="text-sm text-gray-500 font-inter truncate">{user.email || '—'}</span>
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
                      <span className="text-xs text-gray-400 font-inter">{formatDate(user.created_at)}</span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditModal({ open: true, user })}
                          title="Edit user"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        {user.is_active && (
                          <button
                            type="button"
                            onClick={() => setDeactivateModal({ open: true, user })}
                            title="Deactivate user"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <UserX size={14} />
                          </button>
                        )}
                      </div>
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

      {/* Modals */}
      <CreateUserModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={refresh}
      />

      <EditUserModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, user: null })}
        user={editModal.user}
        onSuccess={refresh}
      />

      <DeactivateModal
        isOpen={deactivateModal.open}
        onClose={() => setDeactivateModal({ open: false, user: null })}
        user={deactivateModal.user}
        onSuccess={refresh}
      />
    </AuthLayout>
  );
};

export default AllUsersList;
