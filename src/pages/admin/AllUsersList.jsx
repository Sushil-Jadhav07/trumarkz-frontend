import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DhiwaysDetailsEditor } from '@/components/shared/DhiwaysDetailsEditor';
import { SERVICE_TYPE_OPTIONS } from '@/data/serviceTypeOptions';
import { adminAPI, getApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
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
  Trash2,
  ShieldOff,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

// Same two use-case options / key shape as OrgOnboarding.jsx's self-service
// onboarding form, so the `use_cases` object this admin form sends matches
// what the backend already receives from that flow.
const USE_CASE_OPTIONS = [
  { key: 'primary', label: 'Product verification' },
  { key: 'secondary', label: 'Human verification' },
];

const BLANK_CREATE = {
  user_type: 'individual',
  email: '',
  password: '',
  full_name: '',
  organization_name: '',
  phone_number: '',
  service_type: '',
  industry_type: '',
  gstin: '',
  business_reg_number: '',
  address_line1: '',
  address_line2: '',
  address_line3: '',
  use_cases: {},
  dhiways_details: [],
};

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState(BLANK_CREATE);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleUseCase = (key) => {
    setForm((f) => {
      const next = { ...f.use_cases };
      if (next[key]) delete next[key];
      else next[key] = true;
      return { ...f, use_cases: next };
    });
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
        if (form.service_type) payload.service_type = form.service_type;
        if (form.industry_type.trim()) payload.industry_type = form.industry_type.trim();
        if (form.gstin.trim()) payload.gstin = form.gstin.trim();
        if (form.business_reg_number.trim()) payload.business_reg_number = form.business_reg_number.trim();
        if (form.address_line1.trim()) payload.address_line1 = form.address_line1.trim();
        if (form.address_line2.trim()) payload.address_line2 = form.address_line2.trim();
        if (form.address_line3.trim()) payload.address_line3 = form.address_line3.trim();
        if (Object.keys(form.use_cases).length) payload.use_cases = form.use_cases;
        const cleanedDhiways = form.dhiways_details
          .map((row) => ({ space_id: (row.space_id || '').trim(), schema_id: (row.schema_id || '').trim() }))
          .filter((row) => row.space_id || row.schema_id);
        if (cleanedDhiways.length) payload.dhiways_details = cleanedDhiways;
      } else {
        payload.full_name = form.full_name.trim();
      }
      if (form.phone_number.trim()) payload.phone_number = form.phone_number.trim();
      // TODO: confirm exact endpoint for full-schema org creation with backend
      // dev — the backend summary doesn't clearly confirm whether this posts
      // to /auth/users or a new dedicated route, so this stays wired to the
      // existing adminAPI.createUser() (POST /auth/users) with the expanded
      // payload rather than guessing at a new URL.
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Create User" size="lg">
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

        {/* Organization-only fields */}
        {isOrg && (
          <>
            <div>
              <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Service Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SERVICE_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const selected = form.service_type === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, service_type: value }))}
                      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left transition-all duration-200 ${
                        selected ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={14} className={selected ? 'text-brand-blue' : 'text-gray-400'} />
                      <span className="text-xs font-medium font-inter text-brand-dark">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Industry Type"
              placeholder="e.g. Healthcare"
              value={form.industry_type}
              onChange={set('industry_type')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="GSTIN" placeholder="27ABCDE1234F1Z5" value={form.gstin} onChange={set('gstin')} />
              <Input
                label="Business Reg. No."
                placeholder="U74999MH2020PTC123456"
                value={form.business_reg_number}
                onChange={set('business_reg_number')}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-brand-dark font-inter">Registered Address</label>
              <Input placeholder="Address Line 1" value={form.address_line1} onChange={set('address_line1')} />
              <Input placeholder="Address Line 2" value={form.address_line2} onChange={set('address_line2')} />
              <Input placeholder="Address Line 3" value={form.address_line3} onChange={set('address_line3')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Use Cases</label>
              <div className="flex flex-wrap gap-2">
                {USE_CASE_OPTIONS.map(({ key, label }) => {
                  const selected = Boolean(form.use_cases[key]);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleUseCase(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-inter border transition-colors ${
                        selected ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Dhiway Spaces</label>
              <DhiwaysDetailsEditor
                value={form.dhiways_details}
                onChange={(rows) => setForm((f) => ({ ...f, dhiways_details: rows }))}
                disabled={submitting}
              />
            </div>
          </>
        )}

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
    service_type: '',
    industry_type: '',
    gstin: '',
    business_reg_number: '',
    address_line1: '',
    address_line2: '',
    address_line3: '',
    use_cases: {},
    dhiways_details: [],
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
        service_type: user.service_type || '',
        industry_type: user.industry_type || '',
        gstin: user.gstin || '',
        business_reg_number: user.business_reg_number || '',
        address_line1: user.address_line1 || '',
        address_line2: user.address_line2 || '',
        address_line3: user.address_line3 || '',
        use_cases: user.use_cases || {},
        dhiways_details: (user.dhiways_details || []).map((row) => ({ ...row })),
        is_active: user.is_active ?? true,
        email_verified: user.email_verified ?? true,
      });
    }
  }, [user]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggle = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));
  const toggleUseCase = (key) => {
    setForm((f) => {
      const next = { ...f.use_cases };
      if (next[key]) delete next[key];
      else next[key] = true;
      return { ...f, use_cases: next };
    });
  };

  const isOrg = user?.user_type === 'organization';

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
      if (isOrg) {
        if (form.service_type) payload.service_type = form.service_type;
        if (form.industry_type.trim()) payload.industry_type = form.industry_type.trim();
        if (form.gstin.trim()) payload.gstin = form.gstin.trim();
        if (form.business_reg_number.trim()) payload.business_reg_number = form.business_reg_number.trim();
        if (form.address_line1.trim()) payload.address_line1 = form.address_line1.trim();
        if (form.address_line2.trim()) payload.address_line2 = form.address_line2.trim();
        if (form.address_line3.trim()) payload.address_line3 = form.address_line3.trim();
        payload.use_cases = form.use_cases;
        payload.dhiways_details = form.dhiways_details
          .map((row) => ({ space_id: (row.space_id || '').trim(), schema_id: (row.schema_id || '').trim() }))
          .filter((row) => row.space_id || row.schema_id);
      }
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="lg">
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
            <>
              <div>
                <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Service Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SERVICE_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                    const selected = form.service_type === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={submitting}
                        onClick={() => setForm((f) => ({ ...f, service_type: value }))}
                        className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left transition-all duration-200 disabled:opacity-50 ${
                          selected ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={14} className={selected ? 'text-brand-blue' : 'text-gray-400'} />
                        <span className="text-xs font-medium font-inter text-brand-dark">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Industry Type"
                placeholder="e.g. Healthcare"
                value={form.industry_type}
                onChange={set('industry_type')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="GSTIN" value={form.gstin} onChange={set('gstin')} placeholder="27ABCDE1234F1Z5" />
                <Input
                  label="Business Reg. No."
                  value={form.business_reg_number}
                  onChange={set('business_reg_number')}
                  placeholder="U74999MH2020PTC123456"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-brand-dark font-inter">Registered Address</label>
                <Input placeholder="Address Line 1" value={form.address_line1} onChange={set('address_line1')} />
                <Input placeholder="Address Line 2" value={form.address_line2} onChange={set('address_line2')} />
                <Input placeholder="Address Line 3" value={form.address_line3} onChange={set('address_line3')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Use Cases</label>
                <div className="flex flex-wrap gap-2">
                  {USE_CASE_OPTIONS.map(({ key, label }) => {
                    const selected = Boolean(form.use_cases[key]);
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={submitting}
                        onClick={() => toggleUseCase(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-inter border transition-colors disabled:opacity-50 ${
                          selected ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Dhiway Spaces</label>
                <DhiwaysDetailsEditor
                  value={form.dhiways_details}
                  onChange={(rows) => setForm((f) => ({ ...f, dhiways_details: rows }))}
                  disabled={submitting}
                  onSetDefault={async (row) => {
                    try {
                      await adminAPI.setDhiwayDefault({ spaceId: row.space_id, schemaId: row.schema_id, orgId: user.id });
                      toast.success('Default Dhiway space updated');
                    } catch (err) {
                      toast.error(getApiError(err, 'Failed to set default'));
                      throw err;
                    }
                  }}
                />
              </div>
            </>
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

// ─── Unverify GST Confirmation Modal ──────────────────────────────────────────

const UnverifyGstModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleUnverify = async () => {
    setSubmitting(true);
    try {
      await adminAPI.unverifyGstForOrg(user.id);
      toast.success('GST verification revoked');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to revoke GST verification'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title="" size="sm">
      {user && (
        <div className="space-y-5 pt-2">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <ShieldOff size={22} className="text-amber-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-brand-dark font-sora">Revoke GST Verification?</p>
              <p className="text-sm text-gray-500 font-inter mt-1">
                <span className="font-medium text-brand-dark">
                  {user.organization_name || user.full_name || user.email}
                </span>{' '}
                will need to re-verify their GSTIN before creating new batches. Their saved GSTIN number is kept.
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
              onClick={handleUnverify}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium font-inter hover:bg-amber-600 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Revoking…' : 'Revoke'}
            </button>
          </div>
        </div>
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

// Requires typing the account's exact email before the destructive action
// unlocks — DELETE /auth/users/{id}/permanent is irreversible (unlike the
// soft DeactivateModal above), so a single click isn't enough friction here.
const PermanentDeleteModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setConfirmText('');
  }, [isOpen]);

  const expected = user?.email || '';
  const isConfirmed = expected.length > 0 && confirmText.trim().toLowerCase() === expected.toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setSubmitting(true);
    try {
      await adminAPI.permanentlyDeleteUser(user.id);
      toast.success('User permanently deleted');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to permanently delete user'));
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
              <Trash2 size={22} className="text-red-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-brand-dark font-sora">Permanently Delete User?</p>
              <p className="text-sm text-gray-500 font-inter mt-1">
                This will permanently remove{' '}
                <span className="font-medium text-brand-dark">
                  {user.full_name || user.organization_name || user.email}
                </span>{' '}
                and all their data. This action <span className="font-semibold text-red-500">cannot be undone</span>.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 font-inter">
              Type <span className="font-semibold text-brand-dark">{expected}</span> to confirm
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expected}
              className="mt-1.5"
              autoFocus
            />
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
              onClick={handleDelete}
              disabled={submitting || !isConfirmed}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium font-inter hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Deleting…' : 'Delete permanently'}
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

// GET /auth/users caps `limit` at 500 (confirmed live: limit=1000 returns a
// 422 "Input should be less than or equal to 500"). That's comfortably above
// the platform's current user count, so it's used as a practical "fetch
// everything" ceiling below.
const USERS_FETCH_LIMIT = 500;

export const AllUsersList = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [deactivateModal, setDeactivateModal] = useState({ open: false, user: null });
  const [permanentDeleteModal, setPermanentDeleteModal] = useState({ open: false, user: null });
  const [unverifyGstModal, setUnverifyGstModal] = useState({ open: false, user: null });
  const [approvingId, setApprovingId] = useState(null);

  // Search has to work across every user, not just whichever server page is
  // currently loaded — so fetch the full type-filtered list once (up to the
  // API's 500 cap) and do search + pagination entirely client-side, the same
  // way BatchMonitor does for /verification/batches. GET /auth/users' own
  // `total` field also isn't reliable for driving pagination (it mirrors the
  // requested page size rather than the real dataset size), which this
  // sidesteps too.
  const fetchUsers = useCallback(async (type) => {
    setLoading(true);
    try {
      const params = { limit: USERS_FETCH_LIMIT, offset: 0 };
      if (type) params.user_type = type;
      const { data } = await adminAPI.getAllUsers(params);
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(typeFilter);
  }, [typeFilter, fetchUsers]);

  const handleTypeChange = (type) => {
    setTypeFilter(type);
    setPage(1);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const refresh = () => fetchUsers(typeFilter);

  const handleApprove = async (user) => {
    setApprovingId(user.id);
    try {
      await adminAPI.approveOrganization(user.id);
      toast.success(`${user.organization_name || 'Organization'} approved`);
      refresh();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to approve organization'));
    } finally {
      setApprovingId(null);
    }
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

  // Real join trend for the full type-filtered user list, bucketed by day
  // over the last 7 days.
  const sparkData = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d;
    });
    return days.map((day, i) => {
      const next = new Date(day); next.setDate(day.getDate() + 1);
      const value = users.filter((u) => {
        if (!u.created_at) return false;
        const t = new Date(u.created_at).getTime();
        return t >= day.getTime() && t < next.getTime();
      }).length;
      return { i, value };
    });
  }, [users]);

  // Pagination runs client-side over filteredUsers (the full type-filtered +
  // search-filtered list), so the page count and "Showing X of Y" always
  // match what search actually found, and paging never depends on which
  // server page happens to be loaded.
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startIdx = filteredUsers.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, filteredUsers.length);
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
        <Card className="px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Users size={20} className="text-brand-blue" />
          </div>
          <div className="min-w-[140px]">
            <p className="text-xs text-gray-500 font-inter">Total Users</p>
            <p className="text-2xl font-bold text-brand-dark font-sora leading-none mt-1">
              {loading ? '—' : users.length}
            </p>
            <p className="text-xs text-gray-400 font-inter mt-1">{activeTabLabel}</p>
          </div>
          <div className="w-36 h-12 ml-auto shrink-0 hidden sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="spark-users" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={1.75} fill="url(#spark-users)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
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
                  {paginatedUsers.map((user, i) => (
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
                        {user.user_type === 'organization' && (
                          <>
                            <StatusPill active={user.org_approved} label="Approved" />
                            <StatusPill active={user.gst_verified} label="GST verified" />
                          </>
                        )}
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
                        {user.user_type === 'organization' && !user.org_approved && (
                          <button
                            type="button"
                            onClick={() => handleApprove(user)}
                            disabled={approvingId === user.id}
                            title="Mark organization as approved (informational only — no longer required for access)"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            {approvingId === user.id
                              ? <RefreshCw size={14} className="animate-spin" />
                              : <CheckCircle size={14} />}
                          </button>
                        )}
                        {user.user_type === 'organization' && user.gst_verified && (
                          <button
                            type="button"
                            onClick={() => setUnverifyGstModal({ open: true, user })}
                            title="Revoke GST verification"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <ShieldOff size={14} />
                          </button>
                        )}
                        {user.is_active && user.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => setDeactivateModal({ open: true, user })}
                            title="Deactivate user"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <UserX size={14} />
                          </button>
                        )}
                        {user.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => setPermanentDeleteModal({ open: true, user })}
                            title="Permanently delete user"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
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
          {!loading && filteredUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-brand-bg">
              <p className="text-xs text-gray-400 font-inter">
                Showing {startIdx}–{endIdx} of {filteredUsers.length} users
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPage(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold font-inter ${
                        safePage === i + 1 ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-white border border-gray-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold font-inter text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
                </select>
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

      <PermanentDeleteModal
        isOpen={permanentDeleteModal.open}
        onClose={() => setPermanentDeleteModal({ open: false, user: null })}
        user={permanentDeleteModal.user}
        onSuccess={refresh}
      />

      <UnverifyGstModal
        isOpen={unverifyGstModal.open}
        onClose={() => setUnverifyGstModal({ open: false, user: null })}
        user={unverifyGstModal.user}
        onSuccess={refresh}
      />
    </AuthLayout>
  );
};

export default AllUsersList;
