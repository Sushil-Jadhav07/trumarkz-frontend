import { SlidingTabs } from '@/components/ui/SlidingTabs';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { IndustrySelect } from '@/components/shared/IndustrySelect';
import { DhiwaysDetailsEditor } from '@/components/shared/DhiwaysDetailsEditor';
import { SERVICE_TYPE_OPTIONS } from '@/data/serviceTypeOptions';
import { normalizeDhiwayDetails } from '@/utils/dhiway';
import { adminAPI, getApiError } from '@/services/api';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  PageIntro, OutlineButton, SolidButton, SummaryBanner, DirectoryBar, StatusText, CheckMark, Avatar, RowActionMenu, NumberedPager, SortLabel,
} from '@/components/shared/AdminPageParts';
import { pageRange } from '@/utils/pagination';
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
          .map((row) => ({
            space_id: (row.space_id || '').trim(),
            schema_id: (row.schema_id || '').trim(),
            space_type: row.space_type || undefined,
            default: !!row.default,
          }))
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Create User" size="lg" onSubmit={handleSubmit}>
      <div className="space-y-4">
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

            <IndustrySelect
              value={form.industry_type}
              onChange={(v) => setForm((f) => ({ ...f, industry_type: v }))}
              disabled={submitting}
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

        <Modal.Footer className="flex gap-3">
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
        </Modal.Footer>
      </div>
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
        dhiways_details: normalizeDhiwayDetails(user.dhiways_details || []),
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
        // Must carry `default` through — the star button (onSetDefault below)
        // already updates form.dhiways_details locally with the right row
        // marked default, but dropping it here meant every submit silently
        // overwrote whatever default the backend had.
        payload.dhiways_details = form.dhiways_details
          .map((row) => ({
            space_id: (row.space_id || '').trim(),
            schema_id: (row.schema_id || '').trim(),
            space_type: row.space_type || undefined,
            default: !!row.default,
          }))
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
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="7xl" containerClassName="w-full max-w-7xl" onSubmit={handleSubmit}>
      {user && (
        <div className="space-y-4">
          {/* User summary */}
          <div className="flex items-center gap-2.5 px-3 py-2 bg-brand-bg rounded-xl">
            <div className="w-7 h-7 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 text-xs font-bold text-brand-blue font-sora uppercase">
              {user.full_name?.[0] || user.organization_name?.[0] || user.email?.[0] || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-brand-dark font-inter truncate">
                {user.full_name || user.organization_name || '—'}
              </p>
              <p className="text-[11px] text-gray-400 font-inter truncate">{user.email}</p>
            </div>
            <UserTypeBadge type={user.user_type} />
          </div>

          {/* Name + Phone — side by side now that the modal is wide enough,
              instead of two full-width stacked rows. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isOrg ? (
              <Input
                dense
                label="Organization Name"
                value={form.organization_name}
                onChange={set('organization_name')}
                placeholder="Acme Corp"
              />
            ) : (
              <Input
                dense
                label="Full Name"
                value={form.full_name}
                onChange={set('full_name')}
                placeholder="John Doe"
              />
            )}
            <Input
              dense
              label="Phone Number"
              value={form.phone_number}
              onChange={set('phone_number')}
              placeholder="+91 98765 43210"
            />
          </div>

          {isOrg && (
            <>
              <div>
                <label className="block text-xs font-medium text-brand-dark font-inter mb-1.5">Service Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SERVICE_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                    const selected = form.service_type === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={submitting}
                        onClick={() => setForm((f) => ({ ...f, service_type: value }))}
                        className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-left transition-all duration-200 disabled:opacity-50 ${
                          selected ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={12} className={selected ? 'text-brand-blue' : 'text-gray-400'} />
                        <span className="text-[11px] font-medium font-inter text-brand-dark">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Industry Type / GSTIN / Business Reg. No. — three across
                  instead of two stacked rows, now that there's room. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <IndustrySelect
                  dense
                  value={form.industry_type}
                  onChange={(v) => setForm((f) => ({ ...f, industry_type: v }))}
                  disabled={submitting}
                />
                <Input dense label="GSTIN" value={form.gstin} onChange={set('gstin')} placeholder="27ABCDE1234F1Z5" />
                <Input
                  dense
                  label="Business Reg. No."
                  value={form.business_reg_number}
                  onChange={set('business_reg_number')}
                  placeholder="U74999MH2020PTC123456"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-brand-dark font-inter">Registered Address</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input dense placeholder="Address Line 1" value={form.address_line1} onChange={set('address_line1')} />
                  <Input dense placeholder="Address Line 2" value={form.address_line2} onChange={set('address_line2')} />
                  <Input dense placeholder="Address Line 3" value={form.address_line3} onChange={set('address_line3')} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-dark font-inter mb-1.5">Use Cases</label>
                <div className="flex flex-wrap gap-2">
                  {USE_CASE_OPTIONS.map(({ key, label }) => {
                    const selected = Boolean(form.use_cases[key]);
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={submitting}
                        onClick={() => toggleUseCase(key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold font-inter border transition-colors disabled:opacity-50 ${
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
                <label className="block text-xs font-medium text-brand-dark font-inter mb-1.5">Dhiway Spaces</label>
                <DhiwaysDetailsEditor
                  value={form.dhiways_details}
                  onChange={(rows) => setForm((f) => ({ ...f, dhiways_details: rows }))}
                  disabled={submitting}
                  onSetDefault={async (row) => {
                    try {
                      await adminAPI.setDhiwayDefault({
                        spaceId: row.space_id,
                        schemaId: row.schema_id,
                        spaceType: row.space_type,
                        orgId: user.id,
                      });
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
          <div className="space-y-2.5 p-3 bg-brand-bg rounded-xl">
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

          <Modal.Footer className="flex gap-3">
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
          </Modal.Footer>
        </div>
      )}
    </Modal>
  );
};

// ─── Edit Superadmin Modal ──────────────────────────────────────────────────────
// PATCH /auth/superadmins/{user_id} — the dedicated superadmin-detail
// editor. Distinct from EditUserModal's generic PATCH /auth/users/{id}:
// this one additionally supports editing email and setting a new password
// (never shown/sent for individual users there), and has no
// email_verified field at all — not part of this endpoint's schema.
const EditSuperAdminModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    password: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        email: user.email || '',
        password: '',
        is_active: user.is_active ?? true,
      });
    }
  }, [user]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggle = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { is_active: form.is_active };
      if (form.full_name.trim()) payload.full_name = form.full_name.trim();
      if (form.phone_number.trim()) payload.phone_number = form.phone_number.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      // Never sent as an empty string — leaving this blank means "don't
      // change the password," not "set it to blank."
      if (form.password.trim()) payload.password = form.password.trim();
      await adminAPI.updateSuperAdmin(user.id, payload);
      toast.success('Superadmin updated');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update superadmin'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Superadmin" size="lg" onSubmit={handleSubmit}>
      {user && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-brand-bg rounded-xl">
            <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-sm font-bold text-purple-600 font-sora uppercase">
              {user.full_name?.[0] || user.email?.[0] || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-dark font-inter truncate">{user.full_name || '—'}</p>
              <p className="text-xs text-gray-400 font-inter truncate">{user.email}</p>
            </div>
            <UserTypeBadge type={user.user_type} />
          </div>

          <Input label="Full Name" value={form.full_name} onChange={set('full_name')} placeholder="Jane Doe" />
          <Input label="Phone Number" value={form.phone_number} onChange={set('phone_number')} placeholder="+91 98765 43210" />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="admin@trumarkz.com" />
          <Input
            label="New Password"
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="Leave blank to keep current password"
          />

          {/* Status toggle */}
          <div className="space-y-3 p-4 bg-brand-bg rounded-xl">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide font-inter mb-1">
              Account Status
            </p>
            <Toggle
              checked={form.is_active}
              onChange={toggle('is_active')}
              label="Account Active"
              description="Disable to prevent this superadmin from logging in"
            />
          </div>

          <Modal.Footer className="flex gap-3">
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
          </Modal.Footer>
        </div>
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
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title="Revoke GST Verification?" size="sm">
      {user && (
        <div className="space-y-5 pt-2">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <ShieldOff size={22} className="text-amber-500" />
            </div>
            <div>
              
              <p className="text-sm text-gray-500 font-inter mt-1">
                <span className="font-medium text-brand-dark">
                  {user.organization_name || user.full_name || user.email}
                </span>{' '}
                will need to re-verify their GSTIN before creating new batches. Their saved GSTIN number is kept.
              </p>
            </div>
          </div>

          <Modal.Footer className="flex gap-3">
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
          </Modal.Footer>
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
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title="Deactivate User?" size="sm">
      {user && (
        <div className="space-y-5 pt-2">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              
              <p className="text-sm text-gray-500 font-inter mt-1">
                <span className="font-medium text-brand-dark">
                  {user.full_name || user.organization_name || user.email}
                </span>{' '}
                will be unable to log in. Their data is not deleted and this can be reversed via Edit.
              </p>
            </div>
          </div>

          <Modal.Footer className="flex gap-3">
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
          </Modal.Footer>
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
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title="Permanently Delete User?" size="sm">
      {user && (
        <div className="space-y-5 pt-2">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <div>
              
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

          <Modal.Footer className="flex gap-3">
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
          </Modal.Footer>
        </div>
      )}
    </Modal>
  );
};

// GET /auth/users caps `limit` at 500 (confirmed live: limit=1000 returns a
// 422 "Input should be less than or equal to 500"). That's comfortably above
// the platform's current user count, so it's used as a practical "fetch
// everything" ceiling below.
const USERS_FETCH_LIMIT = 500;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100].map((n) => ({ value: n, label: `${n} / page` }));
const muted = 'text-[#7d8aa5]';

// Verification marks per account type: an Individual has no approval or GST step and a Super
// Admin has none of the three, so those show "n/a" instead of a misleading "not confirmed".
const verificationMarks = (user) => {
  const type = user.user_type === 'super-admin' ? 'super_admin' : user.user_type;
  const yes = (v) => (v ? 'yes' : 'no');
  return {
    email: yes(user.email_verified),
    approval: type === 'organization' ? yes(user.org_approved) : 'na',
    gst: type === 'organization' ? yes(user.gst_verified) : 'na',
    setup: type === 'super_admin' ? 'na' : yes(user.onboarding_completed),
  };
};

const displayName = (u) => u.full_name || u.organization_name || '';

export const AllUsersList = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState({ key: 'joined', dir: 'desc' });

  const [createOpen, setCreateOpen] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [editSuperAdminModal, setEditSuperAdminModal] = useState({ open: false, user: null });
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

  const toggleSort = (key) => setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'joined' ? 'desc' : 'asc' }));
  const sortedUsers = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filteredUsers].sort((a, b) => dir * (sort.key === 'joined'
      ? new Date(a.created_at || 0) - new Date(b.created_at || 0)
      : (displayName(a) || a.email || '').localeCompare(displayName(b) || b.email || '')));
  }, [filteredUsers, sort]);

  // Pagination runs client-side over the full type-filtered + search-filtered list, so the page
  // count and "Showing X of Y" always match what search found.
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = sortedUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  const { from: startIdx, to: endIdx } = pageRange(safePage, pageSize, sortedUsers.length);

  const openEdit = (user) => (
    user.user_type === 'super_admin' || user.user_type === 'super-admin'
      ? setEditSuperAdminModal({ open: true, user })
      : setEditModal({ open: true, user })
  );

  const rowMenu = (user) => [
    { label: 'Mark organization approved', icon: CheckCircle, hidden: user.user_type !== 'organization' || !!user.org_approved, disabled: approvingId === user.id, onClick: () => handleApprove(user) },
    { label: 'Revoke GST verification', icon: ShieldOff, tone: 'warning', hidden: user.user_type !== 'organization' || !user.gst_verified, onClick: () => setUnverifyGstModal({ open: true, user }) },
    { label: 'Deactivate user', icon: UserX, tone: 'danger', hidden: !user.is_active || user.id === currentUser?.id, onClick: () => setDeactivateModal({ open: true, user }) },
    { label: 'Delete permanently', icon: Trash2, tone: 'danger', hidden: user.id === currentUser?.id, onClick: () => setPermanentDeleteModal({ open: true, user }) },
  ];

  return (
    <AuthLayout title="User List" breadcrumb={['Administration', 'User List']}>
      <PageIntro
        eyebrow="Account management"
        title="User list"
        subtitle="Manage platform users and account access."
        actions={(
          <>
            <OutlineButton icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</OutlineButton>
            <SolidButton icon={UserPlus} onClick={() => setCreateOpen(true)}>Create user</SolidButton>
          </>
        )}
      />

      <SummaryBanner
        icon={Users}
        label="Total users"
        value={loading ? '—' : users.length}
        segments={['All registered accounts', 'Individual · Organization · Super Admin']}
      />

      <section aria-label="Users" className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <DirectoryBar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, email or organization">
          <SlidingTabs
            variant="underline"
            ariaLabel="Account type"
            className="!border-b-0 overflow-x-auto"
            value={typeFilter}
            onChange={handleTypeChange}
            tabs={USER_TYPE_TABS.map((tab) => ({
              value: tab.value,
              label: tab.label.replace('All Users', 'All users'),
              count: typeFilter === tab.value && !loading ? users.length : null,
            }))}
          />
        </DirectoryBar>

        <div className="overflow-x-auto scrollbar-hidden">
          <table className="w-full min-w-[1040px] border-collapse text-left text-xs font-inter">
            <thead>
              <tr>
                <th rowSpan={2} aria-sort={sort.key === 'name' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className="px-4 py-2.5"><SortLabel label="User & contact" active={sort.key === 'name'} onClick={() => toggleSort('name')} /></th>
                <th rowSpan={2} className="px-3 py-2.5">Phone</th>
                <th rowSpan={2} className="px-3 py-2.5">Account type</th>
                <th rowSpan={2} className="px-3 py-2.5">Account</th>
                <th colSpan={4} className="border-b border-[#d3dcee] px-3 py-1.5 text-center">Verification</th>
                <th rowSpan={2} aria-sort={sort.key === 'joined' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className="px-3 py-2.5"><SortLabel label="Joined" active={sort.key === 'joined'} onClick={() => toggleSort('joined')} /></th>
                <th rowSpan={2} className="px-3 py-2.5 text-right">Actions</th>
              </tr>
              <tr>
                {['Email', 'Approval', 'GST', 'Setup'].map((h) => <th key={h} className="px-3 py-1.5 text-center">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} aria-hidden="true" className="motion-safe:animate-pulse">
                  {Array.from({ length: 10 }).map((__, j) => <td key={j} className="px-4 py-3.5"><div className="h-3.5 w-3/4 rounded bg-gray-100" /></td>)}
                </tr>
              ))}

              {!loading && sortedUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-14 text-center">
                    <Users size={22} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-brand-dark font-sora">No users found</p>
                    <p className="mt-1 text-xs text-gray-500">{search ? 'Try a different search term.' : 'No users match this filter.'}</p>
                  </td>
                </tr>
              )}

              {!loading && paginatedUsers.map((user) => {
                const marks = verificationMarks(user);
                const name = displayName(user);
                return (
                  <tr key={user.id} className={`transition-colors hover:bg-blue-50/30 ${!user.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={name || user.email} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] text-brand-dark">{name || '—'}</p>
                          <p className={`truncate ${muted}`}>{user.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2 ${muted}`}>{user.phone_number || '—'}</td>
                    <td className="px-3 py-2"><UserTypeBadge type={user.user_type} /></td>
                    <td className="px-3 py-2"><StatusText kind={user.is_active ? 'active' : 'inactive'}>{user.is_active ? 'Active' : 'Inactive'}</StatusText></td>
                    <td className="px-3 py-2 text-center"><CheckMark label="Email" state={marks.email} /></td>
                    <td className="px-3 py-2 text-center"><CheckMark label="Approval" state={marks.approval} /></td>
                    <td className="px-3 py-2 text-center"><CheckMark label="GST" state={marks.gst} /></td>
                    <td className="px-3 py-2 text-center"><CheckMark label="Setup" state={marks.setup} /></td>
                    <td className={`whitespace-nowrap px-3 py-2 ${muted}`}>{formatDate(user.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => openEdit(user)} aria-label={`Edit ${name || user.email || 'user'}`} className="rounded px-1 text-xs font-semibold text-brand-blue hover:underline">Edit</button>
                        <RowActionMenu label={`Actions for ${name || user.email || 'user'}`} items={rowMenu(user)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && sortedUsers.length > 0 && (
          <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-3 lg:flex-row lg:items-center">
            <div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 font-inter">
                <span className="inline-flex items-center gap-1"><CheckMark label="Legend" state="yes" /> Confirmed</span>
                <span className="inline-flex items-center gap-1"><CheckMark label="Legend" state="no" /> Not confirmed</span>
                <span className="inline-flex items-center gap-1"><span className="text-[#8895ad]">n/a</span> Not applicable</span>
              </p>
              <p className="mt-1 text-xs text-gray-600 font-inter">Showing {startIdx} to {endIdx} of {sortedUsers.length} users</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <NumberedPager page={safePage} totalPages={totalPages} onPage={setPage} />
              <CustomSelect
                value={pageSize}
                onChange={(size) => { setPageSize(size); setPage(1); }}
                ariaLabel="Rows per page"
                className="w-28"
                options={PAGE_SIZE_OPTIONS}
              />
            </div>
          </div>
        )}
      </section>

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

      <EditSuperAdminModal
        isOpen={editSuperAdminModal.open}
        onClose={() => setEditSuperAdminModal({ open: false, user: null })}
        user={editSuperAdminModal.user}
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
