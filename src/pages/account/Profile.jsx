import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';
import {
  User, Camera, Mail, Phone, Building2, Save,
  CheckCircle, FileText, MapPin, RefreshCw, Shield,
  Calendar, Hash, Briefcase, Edit3, X, Database,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Dhiway Space ID currently has no dedicated update endpoint — the backend
// only accepts it at org signup. Persist locally per-account so the field
// survives refreshes; swap this for a real PATCH call once one exists.
const SPACE_ID_PREFIX = 'dhiway_space_id_';

const loadLocalSpaceId = (userId) => {
  if (!userId) return '';
  try {
    return localStorage.getItem(`${SPACE_ID_PREFIX}${userId}`) || '';
  } catch {
    return '';
  }
};

const saveLocalSpaceId = (userId, value) => {
  if (!userId) return;
  try {
    if (value) localStorage.setItem(`${SPACE_ID_PREFIX}${userId}`, value);
    else localStorage.removeItem(`${SPACE_ID_PREFIX}${userId}`);
  } catch {
    // localStorage unavailable — field simply won't persist across reloads
  }
};

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

const normalizeForm = (user) => ({
  name: user?.name || '',
  email: user?.email || '',
  phoneNumber: user?.phoneNumber || '',
  avatarUrl: user?.avatarUrl || '',
  dhiwaySpaceId: user?.dhiwaySpaceId || loadLocalSpaceId(user?.id) || '',
});

const normalizeIndustryList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={14} className="text-gray-400" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] text-gray-400 font-inter uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-brand-dark font-inter break-words">{value || '—'}</p>
    </div>
  </div>
);

export const Profile = () => {
  const { user, loading, updateUserProfile, refreshUser, role } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(normalizeForm(user));
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [organizationIndustry, setOrganizationIndustry] = useState(() => normalizeIndustryList(user?.industryType));

  useEffect(() => { setForm(normalizeForm(user)); }, [user]);

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

  const displayName = form.name.trim() || 'User';
  const avatarInitial = displayName[0]?.toUpperCase() || 'U';
  const roleLabel = roleLabels[user?.role] || user?.role || 'Account';
  const roleColor = roleColors[user?.role] || 'bg-gray-100 text-gray-600';
  const isOrg = role === 'organization';

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 1024 * 1024) { toast.error('Photo must be under 1 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => { setField('avatarUrl', reader.result); toast.success('Photo ready — save to apply'); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Full name is required'); return; }
    setSaving(true);
    const dhiwaySpaceId = form.dhiwaySpaceId.trim();
    if (isOrg) saveLocalSpaceId(user?.id, dhiwaySpaceId);
    updateUserProfile({
      name: form.name.trim(),
      phoneNumber: form.phoneNumber.trim(),
      avatarUrl: form.avatarUrl,
      ...(isOrg ? { dhiwaySpaceId } : {}),
    });
    setSaving(false);
    setEditing(false);
    toast.success('Profile updated');
  };

  const handleCancel = () => {
    setForm(normalizeForm(user));
    setEditing(false);
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

  return (
    <AuthLayout title="Profile">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

        {/* Profile hero card */}
        <Card className="mb-5 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            {/* Left: avatar + info */}
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-[72px] h-[72px] rounded-full bg-brand-blue ring-4 ring-brand-blue/15 flex items-center justify-center overflow-hidden text-white text-2xl font-bold font-sora shadow-md">
                  {form.avatarUrl
                    ? <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : avatarInitial}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-brand-blue hover:border-brand-blue transition-colors shadow-sm"
                >
                  <Camera size={11} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
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
                  <span className="text-sm text-gray-500 font-inter">{form.email || '—'}</span>
                </div>
                {user?.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-400 font-inter uppercase tracking-widest shrink-0">Account ID</span>
                    <span className="text-xs text-gray-500 font-mono truncate">{user.id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 font-inter hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              {!editing ? (
                <Button variant="primary" size="sm" icon={Edit3} onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 font-inter hover:bg-gray-50 transition-colors"
                >
                  <X size={13} /> Cancel
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

          {/* Left — editable fields */}
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-sora font-bold text-brand-dark">Personal Information</h3>
                {editing && (
                  <span className="text-xs text-brand-blue bg-blue-50 px-2.5 py-1 rounded-lg font-inter font-medium">Editing</span>
                )}
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Full Name', value: form.name, icon: User, onChange: (e) => setField('name', e.target.value), disabled: !editing || loading || refreshing, placeholder: 'Your full name' },
                  { label: 'Email Address', value: form.email, icon: Mail, disabled: true, hint: 'Cannot be changed' },
                  { label: 'Phone Number', value: form.phoneNumber, icon: Phone, onChange: (e) => setField('phoneNumber', e.target.value), disabled: !editing || loading || refreshing, placeholder: '+91 00000 00000' },
                ].map(({ label, value, icon: Icon, onChange, disabled: dis, placeholder: ph, hint }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-gray-500 font-inter mb-1">{label}</label>
                    <div className="relative">
                      <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={value}
                        onChange={onChange}
                        disabled={dis}
                        placeholder={ph}
                        className="w-full h-9 rounded-lg border border-gray-200 pl-8 pr-3 text-sm font-inter text-brand-dark bg-white disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                      />
                    </div>
                    {hint && <p className="text-[11px] text-gray-400 font-inter mt-0.5">{hint}</p>}
                  </div>
                ))}
              </div>

              {editing && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex gap-2">
                  <Button variant="primary" icon={Save} loading={saving} disabled={loading || refreshing} onClick={handleSave}>
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                </motion.div>
              )}
            </Card>

            {/* Organization details */}
            {isOrg && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 size={15} className="text-brand-blue" />
                  </div>
                  <div>
                    <h3 className="font-sora font-bold text-brand-dark">Organization Details</h3>
                    <p className="text-xs text-gray-400 font-inter mt-0.5">Registered business information</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <DetailRow icon={Building2} label="Organization Name" value={user?.organization} />
                  <div className="border-t border-gray-50" />

                  {editing ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 font-inter mb-1">Dhiway Space ID</label>
                      <div className="relative">
                        <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={form.dhiwaySpaceId}
                          onChange={(e) => setField('dhiwaySpaceId', e.target.value)}
                          disabled={loading || refreshing}
                          placeholder="Leave blank unless your organization already has one"
                          className="w-full h-9 rounded-lg border border-gray-200 pl-8 pr-3 text-sm font-inter text-brand-dark bg-white disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 font-inter mt-0.5">
                        Scopes this organization's SDC certificates on Dhiway. Optional.
                      </p>
                    </div>
                  ) : (
                    <DetailRow icon={Database} label="Dhiway Space ID" value={form.dhiwaySpaceId || 'Not set'} />
                  )}
                  <div className="border-t border-gray-50" />

                  <DetailRow icon={FileText} label="GSTIN" value={user?.gstin} />
                  <div className="border-t border-gray-50" />
                  <DetailRow icon={Hash} label="Business Registration No." value={user?.businessRegNumber} />

                  {(user?.addressLine1 || user?.addressLine2 || user?.addressLine3) && (
                    <>
                      <div className="border-t border-gray-50" />
                      <DetailRow
                        icon={MapPin}
                        label="Registered Address"
                        value={[user.addressLine1, user.addressLine2, user.addressLine3].filter(Boolean).join(', ')}
                      />
                    </>
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
