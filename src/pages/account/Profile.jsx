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
  CheckCircle, FileText, MapPin, RefreshCw, Shield,
  Calendar, Hash, Briefcase, Pencil, X, Database, Layers,
} from 'lucide-react';
import { SERVICE_TYPE_OPTIONS } from '@/data/serviceTypeOptions';
import { ID_FIELDS_BY_SERVICE_TYPE } from '@/data/spaceSchemaFields';
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
// everything changed. Only Service Type + Space ID(s) are wired to a real
// backend endpoint (PATCH /auth/me/service-type, PATCH /auth/me/dhiway-space)
// — there is currently no endpoint to save name/phone/GSTIN/business reg
// number/address, so those stay read-only. Don't add editing for them
// without a confirmed live endpoint (PATCH /auth/me does not exist yet).
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

  // Organization Details card — Service Type + Space ID(s) are the only
  // fields with a real backend endpoint, so they're the only editable ones.
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgDraft, setOrgDraft] = useState({ serviceType: '', humanSpaceId: '', productSpaceId: '', warrantySpaceId: '' });
  const [savingOrg, setSavingOrg] = useState(false);

  const idFields = ID_FIELDS_BY_SERVICE_TYPE[editingOrg ? orgDraft.serviceType : user?.serviceType] || [];

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
      humanSpaceId: user?.humanSpaceId || '',
      productSpaceId: user?.productSpaceId || '',
      warrantySpaceId: user?.warrantySpaceId || '',
    });
    setEditingOrg(true);
  };
  const cancelOrg = () => setEditingOrg(false);
  const updateOrgDraft = (key, value) => setOrgDraft((prev) => ({ ...prev, [key]: value }));

  const saveOrg = async () => {
    setSavingOrg(true);
    try {
      const calls = [];
      const updates = {};

      if (orgDraft.serviceType && orgDraft.serviceType !== user?.serviceType) {
        calls.push(authAPI.updateServiceType(orgDraft.serviceType));
        updates.serviceType = orgDraft.serviceType;
      }

      const idFieldsForDraft = ID_FIELDS_BY_SERVICE_TYPE[orgDraft.serviceType] || [];
      if (idFieldsForDraft.length) {
        const idPayload = {};
        idFieldsForDraft.forEach(({ key }) => {
          const value = orgDraft[key].trim();
          idPayload[key] = value;
          updates[key] = value;
        });
        calls.push(authAPI.updateSpaceIds(idPayload));
      }

      await Promise.all(calls);
      updateUserProfile(updates);
      setEditingOrg(false);
      toast.success('Organization details updated');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save changes'));
    } finally {
      setSavingOrg(false);
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
              <h3 className="font-sora font-bold text-brand-dark mb-4">Personal Information</h3>
              <div className="space-y-4">
                <DetailRow icon={Building2} label={isOrg ? 'Organization Name' : 'Full Name'} value={user?.name} />
                <div className="border-t border-gray-50" />
                <DetailRow icon={Mail} label="Email Address" value={user?.email} hint="Cannot be changed" />
                <div className="border-t border-gray-50" />
                <DetailRow icon={Phone} label="Phone Number" value={user?.phoneNumber} />
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

                  {idFields.map((field) => (
                    <React.Fragment key={field.key}>
                      {editingOrg ? (
                        <FieldInput
                          icon={Database}
                          label={field.label}
                          value={orgDraft[field.key]}
                          onChange={(v) => updateOrgDraft(field.key, v)}
                          disabled={savingOrg}
                          placeholder="Leave blank unless your organization already has one"
                        />
                      ) : (
                        <DetailRow icon={Database} label={field.label} value={user?.[field.key]} />
                      )}
                      <div className="border-t border-gray-50" />
                    </React.Fragment>
                  ))}

                  <DetailRow icon={FileText} label="GSTIN" value={user?.gstin} />
                  <div className="border-t border-gray-50" />
                  <DetailRow icon={Hash} label="Business Registration No." value={user?.businessRegNumber} />
                  <div className="border-t border-gray-50" />
                  <DetailRow icon={MapPin} label="Registered Address" value={addressValue} />

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
