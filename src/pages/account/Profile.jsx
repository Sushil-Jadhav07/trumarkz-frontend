import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { BrowserNotifications } from '@/components/shared/BrowserNotifications';
import { SuperAdminProfile } from '@/pages/account/SuperAdminProfile';
import { Button } from '@/components/ui/Button';
import { PageIntro } from '@/components/shared/AdminPageParts';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useIndustryTypes, loadIndustryTypes } from '@/hooks/useIndustryTypes';
import { industrySelectOptions } from '@/utils/industryTypes';
import { setBatchIndustry } from '@/utils/batchIndustry';
import { matchProfileIndustry } from '@/utils/industry';
import { authAPI, adminAPI, getApiError } from '@/services/api';
import {
  Mail, Phone, Save, CheckCircle2, Calendar, RefreshCw, ShieldCheck, ShieldOff, AlertTriangle,
  Pencil, X, Database, Layers, BarChart3, User, Package,
} from 'lucide-react';
import { SERVICE_TYPE_OPTIONS } from '@/data/serviceTypeOptions';
import { DhiwaysDetailsEditor } from '@/components/shared/DhiwaysDetailsEditor';
import { OrgSchemaConfigsPanel } from '@/components/shared/OrgSchemaConfigsPanel';
import { normalizeDhiwayDetails, getDhiwaySpaceTypeLabel, mergeSchemaConfigSpaces } from '@/utils/dhiway';
import toast from 'react-hot-toast';

const roleLabels = {
  organization: 'Organization',
  individual: 'Individual',
  super_admin: 'Super Admin',
  'super-admin': 'Super Admin',
};

const roleColors = {
  organization: 'bg-blue-50 text-brand-blue',
  individual: 'bg-green-50 text-green-600',
  super_admin: 'bg-purple-50 text-purple-600',
  'super-admin': 'bg-purple-50 text-purple-600',
};

const normalizeIndustryList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};


const SERVICE_TYPE_LABELS = Object.fromEntries(SERVICE_TYPE_OPTIONS.map((o) => [o.value, o.label]));

// Basic org profile fields saved via PATCH /auth/me — keys match both the
// `user` object field name and the authAPI.updateOwnProfile() payload key.
const ORG_DETAIL_FIELD_KEYS = ['gstin', 'businessRegNumber', 'addressLine1', 'addressLine2', 'addressLine3'];

const FieldInput = ({ icon: Icon, label, value, onChange, placeholder, disabled }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 font-inter mb-1">{label}</label>
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full h-9 rounded-lg border border-gray-200 ${Icon ? 'pl-8' : 'pl-3'} pr-3 text-sm font-inter text-brand-dark bg-white disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all`}
      />
    </div>
  </div>
);

const EditButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[#c7d8f5] bg-white px-4 text-[13px] font-semibold text-brand-blue transition-colors hover:bg-blue-50"
  >
    <Pencil size={14} /> Edit
  </button>
);

const EditActions = ({ saving, onSave, onCancel }) => (
  <div className="flex shrink-0 gap-2">
    <Button variant="primary" size="sm" icon={Save} loading={saving} onClick={onSave}>Save</Button>
    <Button variant="outline" size="sm" icon={X} disabled={saving} onClick={onCancel}>Cancel</Button>
  </div>
);

const Cell = ({ label, hint, children, className = '' }) => (
  <div className={`min-w-0 px-5 py-3.5 ${className}`}>
    <p className="text-xs text-gray-500 font-inter">{label}</p>
    <div className="mt-1 break-words text-[15px] font-semibold text-brand-dark font-inter">{children || <span className="font-medium text-gray-400">—</span>}</div>
    {hint && <p className="mt-0.5 text-xs text-gray-500 font-inter">{hint}</p>}
  </div>
);

const StatusPill = ({ ok, children, icon: Icon = CheckCircle2 }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium font-inter ${ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
    <Icon size={13} />{children}
  </span>
);

// Long ids are shown shortened, like "f77d19f8...0315ccae".
const shortId = (value) => (value && value.length > 20 ? `${value.slice(0, 8)}...${value.slice(-8)}` : value || '—');
const SPACE_ICONS = { human: User, product: Package, warranty: ShieldCheck, '': User };

export const Profile = () => {
  const { user, loading, updateUserProfile, refreshUser, role } = useAuth();
  const { setSelectedIndustry, setSelectedVerifications } = useApp();
  // PATCH /auth/me checks the industry against the organization list. A value saved earlier that is
  // no longer on it stays selectable, and resending it unchanged still saves.
  const { names: organizationIndustryNames } = useIndustryTypes('organization');
  const [refreshing, setRefreshing] = useState(false);
  const [organizationIndustry, setOrganizationIndustry] = useState(() => normalizeIndustryList(user?.industryType));

  const isOrg = role === 'organization';
  // AuthContext normalizes the backend's `super_admin` to `'super-admin'`,
  // but this file's own roleLabels/roleColors maps already defend against
  // either spelling reaching here — match both the same way.
  const isSuperAdmin = role === 'super-admin' || role === 'super_admin';

  // Personal Information card — editable for org (Organization Name + Phone
  // Number, via PATCH /auth/me) and superadmin (Full Name + Phone + Email,
  // via the dedicated PATCH /auth/superadmins/{user_id} — the same endpoint
  // used to manage OTHER superadmins from User List, here targeting the
  // logged-in superadmin's own id). Individual accounts have no edit
  // control on this card — unchanged, pre-existing scope.
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalDraft, setPersonalDraft] = useState({ organizationName: '', phoneNumber: '', email: '' });
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Organization Details card — Service Type, Dhiway spaces, GSTIN, business
  // reg number and address are all editable together in one Save.
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgDraft, setOrgDraft] = useState({
    serviceType: '', industryType: '', dhiwaysDetails: [],
    gstin: '', businessRegNumber: '', addressLine1: '', addressLine2: '', addressLine3: '',
  });
  const [savingOrg, setSavingOrg] = useState(false);

  // GSTIN verification (POST /auth/me/verify-gst) — separate from the
  // Organization Details save above, since it hits its own endpoint and can
  // run independently of editing the rest of the card.
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [gstMismatch, setGstMismatch] = useState(null); // { legal_name, trade_name } when the registry name didn't match
  const [unverifyingGst, setUnverifyingGst] = useState(false);
  const [confirmingUnverifyGst, setConfirmingUnverifyGst] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadOrgIndustry = async () => {
      if (role !== 'organization') { if (mounted) setOrganizationIndustry([]); return; }
      const fallback = normalizeIndustryList(user?.industryType);
      if (mounted) setOrganizationIndustry(fallback);
      if (!user?.organizationId) return;
      try {
        const { data } = await authAPI.getOrganizationIndustryType(user.organizationId);
        if (mounted) setOrganizationIndustry(normalizeIndustryList(data));
      } catch {
        if (mounted) setOrganizationIndustry(fallback);
      }
    };
    loadOrgIndustry();
    return () => { mounted = false; };
  }, [role, user?.industryType, user?.organizationId]);

  useEffect(() => {
    let mounted = true;
    if (refreshUser) {
      setRefreshing(true);
      refreshUser().finally(() => { if (mounted) setRefreshing(false); });
    }
    return () => { mounted = false; };
  }, []);

  const displayName = user?.name?.trim() || 'User';
  const avatarInitial = displayName[0]?.toUpperCase() || 'U';
  const roleLabel = roleLabels[user?.role] || user?.role || 'Account';
  const roleColor = roleColors[user?.role] || 'bg-gray-100 text-gray-600';

  // Same rule as the SuperAdmin editor: a Schema Configuration's space/schema is added to this org's
  // Dhiway Spaces (saved at once), and to the open edit draft so its Save doesn't drop it.
  const syncingSchemaSpaces = useRef(false);
  const syncSchemaSpaces = useCallback(async (configs) => {
    if (syncingSchemaSpaces.current || !user) return;
    const { rows, changed } = mergeSchemaConfigSpaces(user.dhiwaysDetails || [], configs);
    if (!changed) return;
    syncingSchemaSpaces.current = true;
    try {
      await authAPI.updateOwnProfile({ dhiwaysDetails: rows });
      updateUserProfile({ dhiwaysDetails: rows });
      setOrgDraft((d) => ({ ...d, dhiwaysDetails: mergeSchemaConfigSpaces(d.dhiwaysDetails || [], configs).rows }));
      toast.success('Dhiway Spaces updated from Schema Configurations');
      await refreshUser?.();
    } catch (err) {
      toast.error(getApiError(err, 'Could not add the schema configuration’s space to Dhiway Spaces'));
    } finally {
      syncingSchemaSpaces.current = false;
    }
  }, [user, updateUserProfile, refreshUser]);

  const startEditOrg = () => {
    setOrgDraft({
      serviceType: user?.serviceType || '',
      industryType: organizationIndustry[0] || '',
      dhiwaysDetails: (user?.dhiwaysDetails || []).map((row) => ({ ...row })),
      gstin: user?.gstin || '',
      businessRegNumber: user?.businessRegNumber || '',
      addressLine1: user?.addressLine1 || '',
      addressLine2: user?.addressLine2 || '',
      addressLine3: user?.addressLine3 || '',
    });
    setGstMismatch(null);
    setEditingOrg(true);
  };
  const cancelOrg = () => setEditingOrg(false);
  const updateOrgDraft = (key, value) => setOrgDraft((prev) => ({ ...prev, [key]: value }));

  const startEditPersonal = () => {
    setPersonalDraft({
      organizationName: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
      email: user?.email || '',
    });
    setEditingPersonal(true);
  };
  const cancelPersonal = () => setEditingPersonal(false);
  const updatePersonalDraft = (key, value) => setPersonalDraft((prev) => ({ ...prev, [key]: value }));

  const savePersonal = async () => {
    setSavingPersonal(true);
    try {
      const trimmedName = personalDraft.organizationName.trim();
      const trimmedPhone = personalDraft.phoneNumber.trim();
      const updates = {};
      let hasChanges = false;

      if (isSuperAdmin) {
        // Own-account edit through the same superadmin-management endpoint
        // used for other superadmins — self-targeted via `user.id`. Email
        // is editable here (unlike the org path below); there's no
        // password field on this card — that stays in the dedicated
        // superadmin-management modal in User List, to keep this page's
        // single "Edit" toggle from also doubling as a password-change form.
        const payload = {};
        if (trimmedName !== (user?.name || '')) { payload.full_name = trimmedName; updates.name = trimmedName; }
        if (trimmedPhone !== (user?.phoneNumber || '')) { payload.phone_number = trimmedPhone; updates.phoneNumber = trimmedPhone; }
        const trimmedEmail = personalDraft.email.trim();
        if (trimmedEmail !== (user?.email || '')) { payload.email = trimmedEmail; updates.email = trimmedEmail; }
        hasChanges = Object.keys(payload).length > 0;
        if (hasChanges) await adminAPI.updateSuperAdmin(user.id, payload);
      } else {
        const payload = {};
        if (trimmedName !== (user?.name || '')) { payload.organizationName = trimmedName; updates.name = trimmedName; }
        if (trimmedPhone !== (user?.phoneNumber || '')) { payload.phoneNumber = trimmedPhone; updates.phoneNumber = trimmedPhone; }
        hasChanges = Object.keys(payload).length > 0;
        if (hasChanges) await authAPI.updateOwnProfile(payload);
      }

      if (hasChanges) {
        updateUserProfile(updates);
        await refreshUser();
        toast.success('Profile updated');
      }
      setEditingPersonal(false);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save changes'));
    } finally {
      setSavingPersonal(false);
    }
  };

  const saveOrg = async () => {
    setSavingOrg(true);
    try {
      const updates = {};
      const profilePayload = {};

      if (orgDraft.serviceType && orgDraft.serviceType !== user?.serviceType) {
        profilePayload.serviceType = orgDraft.serviceType;
        updates.serviceType = orgDraft.serviceType;
      }

      // Industry decides which verification types a new batch offers. It is changed here only —
      // the batch wizard no longer asks for it.
      const industryChanged = !!orgDraft.industryType && orgDraft.industryType !== (organizationIndustry[0] || '');
      if (industryChanged) {
        profilePayload.industryType = orgDraft.industryType;
        updates.industryType = orgDraft.industryType;
      }

      ORG_DETAIL_FIELD_KEYS.forEach((key) => {
        const value = orgDraft[key].trim();
        if (value !== (user?.[key] || '')) {
          profilePayload[key] = value;
          updates[key] = value;
        }
      });

      // Must carry `default` through — the star button (onSetDefault below)
      // already updates orgDraft.dhiwaysDetails locally with the right row
      // marked default, but dropping that field here meant every Save
      // silently overwrote whatever default the backend had.
      // normalizeDhiwayDetails carries space_id/schema_id/default AND
      // space_type through — hand-mapping just the first three (like this
      // used to) would silently drop space_type on every save, the same
      // class of bug that used to drop `default`.
      const cleanedDhiwaysDetails = normalizeDhiwayDetails(orgDraft.dhiwaysDetails)
        .filter((row) => row.space_id || row.schema_id);
      if (JSON.stringify(cleanedDhiwaysDetails) !== JSON.stringify(user?.dhiwaysDetails || [])) {
        profilePayload.dhiwaysDetails = cleanedDhiwaysDetails;
        updates.dhiwaysDetails = cleanedDhiwaysDetails;
      }

      const hasChanges = Object.keys(profilePayload).length > 0;
      if (hasChanges) {
        await authAPI.updateOwnProfile(profilePayload);
        updateUserProfile(updates);
        await refreshUser();
      }
      if (industryChanged) {
        setOrganizationIndustry([orgDraft.industryType]);
        // A batch started from here on uses the new industry; checks picked for the old one no longer apply.
        const { items: humanList } = await loadIndustryTypes('human');
        const match = matchProfileIndustry(orgDraft.industryType, humanList);
        // A pick remembered from the batch picker would now override the profile's choice.
        setBatchIndustry(user?.id, '');
        setSelectedIndustry(match ? [match] : null);
        setSelectedVerifications([]);
      }
      setEditingOrg(false);
      toast.success('Organization details updated');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save changes'));
    } finally {
      setSavingOrg(false);
    }
  };

  // The information card and the Dhiway card edit one shared draft; either Save commits everything.
  const editing = editingPersonal || editingOrg;
  const saving = savingPersonal || savingOrg;
  const startEditInfo = () => {
    startEditPersonal();
    if (isOrg && !editingOrg) startEditOrg();
  };
  const startEditSpaces = () => { if (!editingOrg) startEditOrg(); };
  const cancelAll = () => { setEditingPersonal(false); setEditingOrg(false); };
  const saveAll = async () => {
    if (editingPersonal) await savePersonal();
    if (editingOrg) await saveOrg();
  };

  const handleVerifyGst = async () => {
    if (!user?.gstin) { toast.error('Add a GSTIN before verifying'); return; }
    setVerifyingGst(true);
    setGstMismatch(null);
    try {
      const { data } = await authAPI.verifyGst();
      if (data.gst_verified) {
        updateUserProfile({ gstVerified: true });
        toast.success(data.message || 'GSTIN verified successfully');
        await refreshUser();
      } else {
        // 200 but not a match — not an error, show what the registry has on file.
        setGstMismatch({
          legalName: data.legal_name,
          tradeName: data.trade_name,
          message: data.message,
        });
        toast.error(data.message || "GSTIN registry name doesn't match your organization name");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 502) {
        // Documented behavior: 502 means the GST registry/provider itself is
        // unreachable, not a problem with the GSTIN or our request.
        toast.error(
          `${getApiError(err, 'GST verification service failed')} — the GST registry is temporarily unreachable. Please try again in a few minutes.`,
          { duration: 6000 }
        );
      } else {
        toast.error(getApiError(err, 'Failed to verify GSTIN. Please try again.'));
      }
    } finally {
      setVerifyingGst(false);
    }
  };

  const handleUnverifyGst = async () => {
    setUnverifyingGst(true);
    try {
      await authAPI.unverifyGst();
      updateUserProfile({ gstVerified: false });
      await refreshUser();
      toast.success('GST verification revoked');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to revoke GST verification'));
    } finally {
      setUnverifyingGst(false);
      setConfirmingUnverifyGst(false);
    }
  };

  const handleRefresh = async () => {
    if (!refreshUser) return;
    setRefreshing(true);
    const result = await refreshUser();
    setRefreshing(false);
    if (result?.success) toast.success('Profile refreshed');
    else toast.error(result?.error || 'Refresh failed');
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const addressValue = [user?.addressLine1, user?.addressLine2, user?.addressLine3].filter(Boolean).join(', ');

  // Every hook above runs for all roles; only what is drawn differs.
  if (isSuperAdmin) return <SuperAdminProfile />;

  const spaces = user?.dhiwaysDetails || [];
  const memberLabel = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const roleText = roleLabel;
  const infoHeaderIcon = isOrg ? BarChart3 : User;
  const InfoIcon = infoHeaderIcon;
  const input = 'h-9 w-full rounded-lg border border-[#d9e1ee] bg-white px-3 text-sm font-medium text-brand-dark font-inter focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:bg-gray-50';

  return (
    <AuthLayout title="Profile" breadcrumb={['Workspace', 'Profile']}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full mx-auto lg:max-w-none">
        <PageIntro
          title={isOrg ? 'Organization profile' : 'My profile'}
          subtitle={isOrg ? 'Your organization, account and verification settings.' : 'Your account details and settings.'}
          actions={(
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-600 font-inter transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          )}
        />

        {/* Hero */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-7 py-5 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]">
          <svg aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[55%]" viewBox="0 0 600 140" preserveAspectRatio="none" fill="none">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <path key={i} d={`M${200 + i * 10} -10 C ${300 + i * 6} ${30 + i * 8}, ${380 - i * 4} ${10 + i * 12}, ${470 + i * 8} ${50 + i * 10} S ${580} ${100 + i * 4}, 620 ${60 + i * 14}`} stroke="#fff" strokeOpacity="0.13" strokeWidth="1.2" />
            ))}
          </svg>
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:gap-7">
            <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-white font-sora text-3xl font-bold text-brand-blue">{avatarInitial}</span>
            <span aria-hidden="true" className="hidden h-[72px] w-px bg-white/25 md:block" />
            <div className="min-w-0">
              <h2 className="font-sora text-xl font-semibold leading-tight">{displayName}</h2>
              <p className="mt-1 flex items-center gap-2 text-[13px] text-white/90 font-inter"><Mail size={14} />{user?.email || '—'}</p>
              <p className="mt-1 text-xs text-white/75 font-inter">{roleText}</p>
            </div>
            <div className="min-w-0 md:ml-2">
              <div className="flex flex-wrap items-center gap-2">
                {user?.emailVerified && <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/60 px-3 text-xs font-medium font-inter"><Mail size={13} />Email verified</span>}
                {user?.isActive && <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/60 px-3 text-xs font-medium font-inter"><CheckCircle2 size={13} />Active</span>}
              </div>
              {user?.id && <p className="mt-2.5 break-all font-mono text-xs text-white/85">Account ID: {user.id}</p>}
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.42fr)]">
          {/* Information */}
          <section aria-label={isOrg ? 'Organization information' : 'Account information'} className="min-w-0 rounded-xl border border-gray-100 bg-white">
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
              <div className="flex items-center gap-3.5">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><InfoIcon size={20} strokeWidth={1.6} /></span>
                <h2 className="font-sora text-base font-semibold text-brand-dark">{isOrg ? 'Organization information' : 'Account information'}</h2>
              </div>
              {isOrg && (editing ? <EditActions saving={saving} onSave={saveAll} onCancel={cancelAll} /> : <EditButton onClick={startEditInfo} />)}
            </div>

            <div className="divide-y divide-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-gray-100">
                <Cell label={isOrg ? 'Organization name' : 'Full name'}>
                  {editingPersonal
                    ? <input aria-label="Organization name" className={input} value={personalDraft.organizationName} disabled={savingPersonal} onChange={(e) => updatePersonalDraft('organizationName', e.target.value)} />
                    : user?.name}
                </Cell>
                <Cell label="Official email" hint="Cannot be changed">{user?.email}</Cell>
                <Cell label="Phone">
                  {editingPersonal
                    ? <input aria-label="Phone number" className={input} value={personalDraft.phoneNumber} disabled={savingPersonal} onChange={(e) => updatePersonalDraft('phoneNumber', e.target.value)} />
                    : user?.phoneNumber}
                </Cell>
              </div>

              {isOrg && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-gray-100">
                    <Cell label="Service type">
                      {editingOrg ? (
                        <div className="flex flex-wrap gap-1.5">
                          {SERVICE_TYPE_OPTIONS.map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              disabled={savingOrg}
                              aria-pressed={orgDraft.serviceType === value}
                              onClick={() => updateOrgDraft('serviceType', value)}
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium font-inter transition-colors disabled:opacity-50 ${orgDraft.serviceType === value ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >{label}</button>
                          ))}
                        </div>
                      ) : (SERVICE_TYPE_LABELS[user?.serviceType] || 'Not set')}
                    </Cell>
                    <Cell label="Industry" hint={editingOrg ? 'Decides which verification types a new batch offers.' : undefined}>
                      {editingOrg ? (
                        <CustomSelect
                          value={orgDraft.industryType}
                          onChange={(v) => updateOrgDraft('industryType', v)}
                          ariaLabel="Industry type"
                          placeholder="Select your industry"
                          disabled={savingOrg}
                          options={industrySelectOptions(organizationIndustryNames, organizationIndustry[0])}
                        />
                      ) : organizationIndustry.join(', ')}
                    </Cell>
                    <Cell label="GSTIN">
                      {editingOrg ? (
                        <input aria-label="GSTIN" className={input} value={orgDraft.gstin} disabled={savingOrg} onChange={(e) => updateOrgDraft('gstin', e.target.value)} />
                      ) : user?.gstin ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{user.gstin}</span>
                          {user.gstVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700"><ShieldCheck size={12} />Verified</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600"><AlertTriangle size={12} />Not verified</span>
                          )}
                          {!user.gstVerified && (
                            <button type="button" disabled={verifyingGst} onClick={handleVerifyGst} className="text-[13px] font-medium text-brand-blue hover:underline disabled:opacity-60">{verifyingGst ? 'Verifying…' : 'Verify GSTIN'}</button>
                          )}
                          {user.gstVerified && !confirmingUnverifyGst && (
                            <button type="button" onClick={() => setConfirmingUnverifyGst(true)} className="text-[13px] font-medium text-brand-blue hover:underline">Unverify</button>
                          )}
                          {user.gstVerified && confirmingUnverifyGst && (
                            <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-gray-600">
                              Revoke verification?
                              <Button variant="danger" size="sm" loading={unverifyingGst} onClick={handleUnverifyGst}>Yes, revoke</Button>
                              <Button variant="outline" size="sm" disabled={unverifyingGst} onClick={() => setConfirmingUnverifyGst(false)}>Cancel</Button>
                            </span>
                          )}
                        </div>
                      ) : null}
                    </Cell>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] sm:divide-x sm:divide-gray-100">
                    <Cell label="Business registration no.">
                      {editingOrg
                        ? <input aria-label="Business registration number" className={input} value={orgDraft.businessRegNumber} disabled={savingOrg} onChange={(e) => updateOrgDraft('businessRegNumber', e.target.value)} />
                        : user?.businessRegNumber || <span className="font-medium text-gray-700">Not provided</span>}
                    </Cell>
                    <Cell label="Registered address">
                      {editingOrg ? (
                        <div className="space-y-2">
                          {['addressLine1', 'addressLine2', 'addressLine3'].map((key, i) => (
                            <input key={key} aria-label={`Address line ${i + 1}`} placeholder={`Address line ${i + 1}`} className={input} value={orgDraft[key]} disabled={savingOrg} onChange={(e) => updateOrgDraft(key, e.target.value)} />
                          ))}
                        </div>
                      ) : addressValue || <span className="font-medium text-gray-700">Not provided</span>}
                    </Cell>
                  </div>
                </>
              )}
            </div>

            {gstMismatch && (
              <div className="mx-5 mb-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-red-700 font-inter">{gstMismatch.message || 'This GSTIN is invalid for your organization'}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-red-600 font-inter">
                    The GST registry has this number registered under{' '}
                    <strong>{[gstMismatch.legalName, gstMismatch.tradeName].filter(Boolean).join(' / ') || 'a different name'}</strong>
                    {user?.name ? ` — it doesn't match your organization name ("${user.name}").` : ', which does not match your organization name.'}
                    {' '}Double-check the GSTIN, or update your organization name, then verify again.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Account overview + notifications */}
          <div className="min-w-0 space-y-4">
            <section aria-label="Account overview" className="rounded-xl border border-gray-100 bg-white p-5">
              <h2 className="flex items-center gap-3.5 font-sora text-base font-semibold text-brand-dark">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><Layers size={20} strokeWidth={1.6} /></span>
                Account overview
              </h2>
              <dl className="mt-3 divide-y divide-gray-100 text-[13px] font-inter">
                <div className="flex items-center justify-between py-2"><dt className="text-gray-600">Account status</dt><dd><StatusPill ok={user?.isActive}>{user?.isActive ? 'Active' : 'Inactive'}</StatusPill></dd></div>
                <div className="flex items-center justify-between py-2"><dt className="text-gray-600">Email</dt><dd><StatusPill ok={user?.emailVerified}>{user?.emailVerified ? 'Verified' : 'Unverified'}</StatusPill></dd></div>
                {isOrg && <div className="flex items-center justify-between py-2"><dt className="text-gray-600">Onboarding</dt><dd><StatusPill ok={user?.onboardingCompleted}>{user?.onboardingCompleted ? 'Complete' : 'Pending'}</StatusPill></dd></div>}
                {memberLabel && <div className="flex items-center justify-between py-2"><dt className="text-gray-600">Member since</dt><dd className="flex items-center gap-2 font-medium text-brand-dark"><Calendar size={15} className="text-gray-500" />{memberLabel}</dd></div>}
              </dl>
            </section>
            <BrowserNotifications className="mb-0" />
          </div>
        </div>

        {isOrg && (
          <>
            {/* Dhiway spaces */}
            <section aria-label="Dhiway spaces" className="mb-4 rounded-xl border border-gray-100 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><Database size={20} strokeWidth={1.6} /></span>
                  <h2 className="font-sora text-base font-semibold text-brand-dark">Dhiway spaces</h2>
                  <span className="border-l border-gray-200 pl-3.5 text-[13px] text-gray-600 font-inter">{spaces.length} {spaces.length === 1 ? 'space' : 'spaces'}</span>
                </div>
                {editingOrg ? <EditActions saving={saving} onSave={saveAll} onCancel={cancelAll} /> : <EditButton onClick={startEditSpaces} />}
              </div>

              {editingOrg ? (
                <div className="mt-4">
                  <DhiwaysDetailsEditor
                    value={orgDraft.dhiwaysDetails}
                    onChange={(rows) => updateOrgDraft('dhiwaysDetails', rows)}
                    disabled={savingOrg}
                    onSetDefault={async (row) => {
                      try {
                        await authAPI.setDhiwayDefault({ spaceId: row.space_id, schemaId: row.schema_id, spaceType: row.space_type });
                        toast.success('Default Dhiway space updated');
                        refreshUser();
                      } catch (err) {
                        toast.error(getApiError(err, 'Failed to set default'));
                        throw err;
                      }
                    }}
                  />
                </div>
              ) : spaces.length === 0 ? (
                <p className="mt-4 rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 font-inter">No Dhiway spaces are set up yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto scrollbar-hidden">
                  <table className="w-full min-w-[640px] border-collapse text-left text-xs font-inter">
                    <thead>
                      <tr>
                        <th className="rounded-l-lg px-4 py-2.5">Verification type</th>
                        <th className="px-4 py-2.5">Space ID</th>
                        <th className="px-4 py-2.5">Schema ID</th>
                        <th className="rounded-r-lg px-4 py-2.5">Default</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {spaces.map((row, i) => {
                        const label = getDhiwaySpaceTypeLabel(row.space_type).replace('Legacy / ', '');
                        const Icon = SPACE_ICONS[row.space_type || ''] || User;
                        return (
                          <tr key={`${row.space_id}-${i}`}>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-3 text-[13px] text-brand-dark">
                                <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8f0fe] text-brand-blue"><Icon size={14} strokeWidth={1.7} /></span>{label}
                              </div>
                            </td>
                            <td className="px-4 py-2 font-mono text-[13px] text-[#2f3b52]" title={row.space_id}>{shortId(row.space_id)}</td>
                            <td className="px-4 py-2 font-mono text-[13px] text-[#2f3b52]" title={row.schema_id}>{shortId(row.schema_id)}</td>
                            <td className="px-4 py-2">{row.default ? <span className="rounded-full bg-[#e3ebf8] px-2.5 py-0.5 text-[11px] font-semibold text-brand-blue">Default</span> : <span className="text-gray-500">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Schema configurations: each action is its own immediate API call, independent of the Edit above. */}
            <section aria-label="Schema configurations" className="mb-4 rounded-xl border border-gray-100 bg-white p-5">
              <OrgSchemaConfigsPanel orgId={user?.id} onConfigsChange={syncSchemaSpaces} layout="columns" />
            </section>
          </>
        )}

        <p className="mt-6 text-center text-[13px] text-gray-500 font-inter">
          <Link to="/privacy-policy" className="hover:text-brand-blue hover:underline transition-colors">Privacy Policy</Link>
          <span className="mx-3">/</span>
          <Link to="/terms-of-service" className="hover:text-brand-blue hover:underline transition-colors">Terms of Service</Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
};

export default Profile;
