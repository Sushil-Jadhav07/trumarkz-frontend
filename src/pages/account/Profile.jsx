import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { authAPI, getApiError } from '@/services/api';
import {
  Mail, Phone, Building2, Save,
  CheckCircle, FileText, MapPin, RefreshCw, Shield, ShieldCheck, ShieldOff, AlertTriangle,
  Calendar, Hash, Briefcase, Pencil, X, Database, Layers, Star,
} from 'lucide-react';
import { SERVICE_TYPE_OPTIONS } from '@/data/serviceTypeOptions';
import { DhiwaysDetailsEditor } from '@/components/shared/DhiwaysDetailsEditor';
import { normalizeDhiwayDetails, getDhiwaySpaceTypeLabel } from '@/utils/dhiway';
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

const DetailRow = ({ icon: Icon, label, value, hint }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={14} className="text-gray-400" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] text-gray-400 font-inter uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-brand-dark font-inter break-words">{value || '—'}</p>
      {hint && <p className="text-[11px] text-gray-400 font-inter mt-0.5">{hint}</p>}
    </div>
  </div>
);

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

// One Edit button puts every editable field in this card into edit mode at
// once; it's replaced by Save/Cancel while editing, so a single Save commits
// everything changed. Service Type + Space ID(s) go through their own
// endpoints (PATCH /auth/me/service-type, PATCH /auth/me/dhiway-space);
// GSTIN/business reg number/address go through PATCH /auth/me.
const CardEditControl = ({ isEditing, saving, onEdit, onSave, onCancel }) =>
  isEditing ? (
    <div className="flex gap-2 shrink-0">
      <Button variant="primary" size="sm" icon={Save} loading={saving} onClick={onSave}>Save</Button>
      <Button variant="outline" size="sm" icon={X} disabled={saving} onClick={onCancel}>Cancel</Button>
    </div>
  ) : (
    <button
      type="button"
      onClick={onEdit}
      className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold font-inter text-brand-blue hover:bg-blue-50 transition-colors"
    >
      <Pencil size={12} /> Edit
    </button>
  );

export const Profile = () => {
  const { user, loading, updateUserProfile, refreshUser, role } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [organizationIndustry, setOrganizationIndustry] = useState(() => normalizeIndustryList(user?.industryType));

  const isOrg = role === 'organization';

  // Personal Information card — Organization Name + Phone Number, org users only.
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalDraft, setPersonalDraft] = useState({ organizationName: '', phoneNumber: '' });
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Organization Details card — Service Type, Dhiway spaces, GSTIN, business
  // reg number and address are all editable together in one Save.
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgDraft, setOrgDraft] = useState({
    serviceType: '', dhiwaysDetails: [],
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

  const startEditOrg = () => {
    setOrgDraft({
      serviceType: user?.serviceType || '',
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
    });
    setEditingPersonal(true);
  };
  const cancelPersonal = () => setEditingPersonal(false);
  const updatePersonalDraft = (key, value) => setPersonalDraft((prev) => ({ ...prev, [key]: value }));

  const savePersonal = async () => {
    setSavingPersonal(true);
    try {
      const payload = {};
      const updates = {};

      const trimmedName = personalDraft.organizationName.trim();
      if (trimmedName !== (user?.name || '')) {
        payload.organizationName = trimmedName;
        updates.name = trimmedName;
      }

      const trimmedPhone = personalDraft.phoneNumber.trim();
      if (trimmedPhone !== (user?.phoneNumber || '')) {
        payload.phoneNumber = trimmedPhone;
        updates.phoneNumber = trimmedPhone;
      }

      if (Object.keys(payload).length > 0) {
        await authAPI.updateOwnProfile(payload);
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
      setEditingOrg(false);
      toast.success('Organization details updated');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save changes'));
    } finally {
      setSavingOrg(false);
    }
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

  return (
    <AuthLayout title="Profile">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

        {/* Profile hero card */}
        <Card className="mb-5 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            {/* Left: avatar + info */}
            <div className="flex items-center gap-5">
              <div className="w-[72px] h-[72px] rounded-full bg-brand-blue ring-4 ring-brand-blue/15 flex items-center justify-center shrink-0 text-white text-2xl font-bold font-sora shadow-md">
                {avatarInitial}
              </div>

              {/* Name + badges + email */}
              <div>
                <h2 className="text-[22px] font-bold text-brand-dark font-sora leading-tight">{displayName}</h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full font-inter ${roleColor}`}>{roleLabel}</span>
                  {user?.emailVerified && (
                    <span className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 rounded-full px-2.5 py-0.5 font-inter font-medium">
                      <CheckCircle size={10} /> Verified
                    </span>
                  )}
                  {user?.isActive && (
                    <span className="flex items-center gap-1 text-[11px] text-brand-blue bg-blue-50 rounded-full px-2.5 py-0.5 font-inter font-medium">
                      <Shield size={10} /> Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Mail size={12} className="text-gray-400" />
                  <span className="text-sm text-gray-500 font-inter">{user?.email || '—'}</span>
                </div>
                {user?.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-400 font-inter uppercase tracking-widest shrink-0">Account ID</span>
                    <span className="text-xs text-gray-500 font-mono truncate">{user.id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 font-inter hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </Card>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

          {/* Left — info */}
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-sora font-bold text-brand-dark">Personal Information</h3>
                {isOrg && (
                  <CardEditControl
                    isEditing={editingPersonal}
                    saving={savingPersonal}
                    onEdit={startEditPersonal}
                    onSave={savePersonal}
                    onCancel={cancelPersonal}
                  />
                )}
              </div>
              <div className="space-y-4">
                {editingPersonal ? (
                  <FieldInput
                    icon={Building2}
                    label="Organization Name"
                    value={personalDraft.organizationName}
                    onChange={(v) => updatePersonalDraft('organizationName', v)}
                    disabled={savingPersonal}
                  />
                ) : (
                  <DetailRow icon={Building2} label={isOrg ? 'Organization Name' : 'Full Name'} value={user?.name} />
                )}
                <div className="border-t border-gray-50" />
                <DetailRow icon={Mail} label="Email Address" value={user?.email} hint="Cannot be changed" />
                <div className="border-t border-gray-50" />
                {editingPersonal ? (
                  <FieldInput
                    icon={Phone}
                    label="Phone Number"
                    value={personalDraft.phoneNumber}
                    onChange={(v) => updatePersonalDraft('phoneNumber', v)}
                    disabled={savingPersonal}
                  />
                ) : (
                  <DetailRow icon={Phone} label="Phone Number" value={user?.phoneNumber} />
                )}
              </div>
            </Card>

            {/* Organization details */}
            {isOrg && (
              <Card className="p-6">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Building2 size={15} className="text-brand-blue" />
                    </div>
                    <div>
                      <h3 className="font-sora font-bold text-brand-dark">Organization Details</h3>
                      <p className="text-xs text-gray-400 font-inter mt-0.5">Registered business information</p>
                    </div>
                  </div>
                  <CardEditControl
                    isEditing={editingOrg}
                    saving={savingOrg}
                    onEdit={startEditOrg}
                    onSave={saveOrg}
                    onCancel={cancelOrg}
                  />
                </div>

                <div className="space-y-4">
                  {editingOrg ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 font-inter mb-1">Service Type</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SERVICE_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                          const selected = orgDraft.serviceType === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={savingOrg}
                              onClick={() => updateOrgDraft('serviceType', value)}
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
                      <p className="text-[11px] text-gray-400 font-inter mt-1.5">
                        Determines which space id field(s) below apply to your organization.
                      </p>
                    </div>
                  ) : (
                    <DetailRow
                      icon={Layers}
                      label="Service Type"
                      value={SERVICE_TYPE_LABELS[user?.serviceType] || 'Not set'}
                    />
                  )}
                  <div className="border-t border-gray-50" />

                  {editingOrg ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 font-inter mb-1.5">Dhiway Spaces</label>
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
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Database size={14} className="text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-gray-400 font-inter uppercase tracking-wide mb-1">Dhiway Spaces</p>
                        {(user?.dhiwaysDetails || []).length > 0 ? (
                          <div className="space-y-0.5">
                            {user.dhiwaysDetails.map((row, i) => (
                              <p key={i} className="text-sm font-medium text-brand-dark font-inter break-words flex items-center gap-1.5 flex-wrap">
                                {row.space_id || '—'}
                                <span className="text-gray-400 font-normal"> / schema: {row.schema_id || '—'}</span>
                                <span className="inline-flex items-center text-[10px] font-semibold text-brand-blue bg-blue-50 rounded-full px-1.5 py-0.5">
                                  {getDhiwaySpaceTypeLabel(row.space_type)}
                                </span>
                                {row.default && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">
                                    <Star size={9} className="fill-current" /> Default
                                  </span>
                                )}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-brand-dark font-inter">—</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="border-t border-gray-50" />

                  {editingOrg ? (
                    <FieldInput
                      icon={FileText}
                      label="GSTIN"
                      value={orgDraft.gstin}
                      onChange={(v) => updateOrgDraft('gstin', v)}
                      disabled={savingOrg}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText size={14} className="text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-[11px] text-gray-400 font-inter uppercase tracking-wide mb-0.5">GSTIN</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-brand-dark font-inter">{user?.gstin || '—'}</p>
                              {user?.gstin && (
                                user?.gstVerified ? (
                                  <span className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 rounded-full px-2 py-0.5 font-inter font-medium">
                                    <ShieldCheck size={11} /> Verified
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] text-orange-600 bg-orange-50 rounded-full px-2 py-0.5 font-inter font-medium">
                                    <AlertTriangle size={11} /> Not Verified
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                          {user?.gstin && !user?.gstVerified && (
                            <Button variant="outline" size="sm" icon={ShieldCheck} loading={verifyingGst} onClick={handleVerifyGst}>
                              Verify GSTIN
                            </Button>
                          )}
                          {user?.gstin && user?.gstVerified && (
                            confirmingUnverifyGst ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-inter">Revoke verification?</span>
                                <Button variant="danger" size="sm" loading={unverifyingGst} onClick={handleUnverifyGst}>
                                  Yes, revoke
                                </Button>
                                <Button variant="outline" size="sm" disabled={unverifyingGst} onClick={() => setConfirmingUnverifyGst(false)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" icon={ShieldOff} onClick={() => setConfirmingUnverifyGst(true)}>
                                Unverify
                              </Button>
                            )
                          )}
                        </div>
                        {gstMismatch && (
                          <div className="flex items-start gap-2.5 mt-2.5 p-3 rounded-xl bg-red-50 border border-red-100">
                            <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-red-700 font-inter">
                                {gstMismatch.message || 'This GSTIN is invalid for your organization'}
                              </p>
                              <p className="text-xs text-red-600 font-inter mt-0.5 leading-relaxed">
                                The GST registry has this number registered under{' '}
                                <strong>
                                  {[gstMismatch.legalName, gstMismatch.tradeName].filter(Boolean).join(' / ') || 'a different name'}
                                </strong>
                                {user?.name ? ` — it doesn't match your organization name ("${user.name}").` : ', which does not match your organization name.'}
                                {' '}Double-check the GSTIN, or update your organization name, then verify again.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="border-t border-gray-50" />
                  {editingOrg ? (
                    <FieldInput
                      icon={Hash}
                      label="Business Registration No."
                      value={orgDraft.businessRegNumber}
                      onChange={(v) => updateOrgDraft('businessRegNumber', v)}
                      disabled={savingOrg}
                    />
                  ) : (
                    <DetailRow icon={Hash} label="Business Registration No." value={user?.businessRegNumber} />
                  )}
                  <div className="border-t border-gray-50" />
                  {editingOrg ? (
                    <div className="space-y-3">
                      <FieldInput
                        icon={MapPin}
                        label="Address Line 1"
                        value={orgDraft.addressLine1}
                        onChange={(v) => updateOrgDraft('addressLine1', v)}
                        disabled={savingOrg}
                      />
                      <FieldInput
                        icon={MapPin}
                        label="Address Line 2"
                        value={orgDraft.addressLine2}
                        onChange={(v) => updateOrgDraft('addressLine2', v)}
                        disabled={savingOrg}
                      />
                      <FieldInput
                        icon={MapPin}
                        label="Address Line 3"
                        value={orgDraft.addressLine3}
                        onChange={(v) => updateOrgDraft('addressLine3', v)}
                        disabled={savingOrg}
                      />
                    </div>
                  ) : (
                    <DetailRow icon={MapPin} label="Registered Address" value={addressValue} />
                  )}

                  {organizationIndustry.length > 0 && (
                    <>
                      <div className="border-t border-gray-50" />
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Briefcase size={14} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-400 font-inter uppercase tracking-wide mb-2">Industry Type</p>
                          <div className="flex flex-wrap gap-1.5">
                            {organizationIndustry.map((ind) => (
                              <Badge key={ind} status="info">{ind}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Right sidebar — account info */}
          <div className="h-full">
            <Card className="p-5 h-full">
              <h3 className="font-sora font-semibold text-brand-dark mb-3 text-sm">Account Overview</h3>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between h-10">
                  <span className="text-sm text-gray-500 font-inter">Status</span>
                  <Badge status={user?.isActive ? 'success' : 'error'}>
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between h-10">
                  <span className="text-sm text-gray-500 font-inter">Email</span>
                  <Badge status={user?.emailVerified ? 'success' : 'warning'}>
                    {user?.emailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
                {isOrg && (
                  <div className="flex items-center justify-between h-10">
                    <span className="text-sm text-gray-500 font-inter">Onboarding</span>
                    <Badge status={user?.onboardingCompleted ? 'success' : 'pending'}>
                      {user?.onboardingCompleted ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>
                )}
                {memberSince && (
                  <div className="flex items-center justify-between h-10">
                    <span className="text-sm text-gray-500 font-inter">Member Since</span>
                    <div className="flex items-center gap-1.5 text-sm text-brand-dark font-inter font-medium">
                      <Calendar size={13} className="text-gray-400" />
                      {memberSince}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </AuthLayout>
  );
};

export default Profile;
