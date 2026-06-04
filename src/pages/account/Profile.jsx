import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';
import {
  User, Camera, Mail, Phone, Building2, Save,
  CheckCircle, FileText, MapPin, RefreshCw, Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

const roleLabels = {
  organization: 'Organization Admin',
  individual: 'Individual',
  super_admin: 'Super Admin',
  'super-admin': 'Super Admin',
};

const normalizeForm = (user) => ({
  name: user?.name || '',
  email: user?.email || '',
  phoneNumber: user?.phoneNumber || '',
  organization: user?.organization || '',
  avatarUrl: user?.avatarUrl || '',
});

const normalizeIndustryList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
    {Icon && <Icon size={16} className="text-gray-400 mt-0.5 shrink-0" />}
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-400 font-inter mb-0.5">{label}</p>
      <p className="text-sm font-medium text-brand-dark font-inter truncate">{value || '—'}</p>
    </div>
  </div>
);

export const Profile = () => {
  const { user, loading, updateUserProfile, refreshUser, role } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(normalizeForm(user));
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [organizationIndustry, setOrganizationIndustry] = useState(() => normalizeIndustryList(user?.industryType));

  useEffect(() => {
    setForm(normalizeForm(user));
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const loadOrganizationIndustry = async () => {
      if (role !== 'organization') {
        if (mounted) setOrganizationIndustry([]);
        return;
      }

      const fallback = normalizeIndustryList(user?.industryType);
      if (mounted) setOrganizationIndustry(fallback);

      if (!user?.organizationId) return;

      try {
        const { data } = await authAPI.getOrganizationIndustryType(user.organizationId);
        const next = normalizeIndustryList(data);
        if (mounted) setOrganizationIndustry(next);
      } catch {
        if (mounted) setOrganizationIndustry(fallback);
      }
    };

    loadOrganizationIndustry();
    return () => { mounted = false; };
  }, [role, user?.industryType, user?.organizationId]);

  // Load fresh data from /auth/me on mount
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
  const isOrg = role === 'organization';

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 1024 * 1024) { toast.error('Profile photo must be under 1 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => { setField('avatarUrl', reader.result); toast.success('Photo ready to save'); };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Full name is required'); return; }
    setSaving(true);
    updateUserProfile({
      name: form.name.trim(),
      phoneNumber: form.phoneNumber.trim(),
      avatarUrl: form.avatarUrl,
    });
    setSaving(false);
    toast.success('Profile updated');
  };

  const handleRefresh = async () => {
    if (!refreshUser) return;
    setRefreshing(true);
    const result = await refreshUser();
    setRefreshing(false);
    if (result.success) toast.success('Profile refreshed');
    else toast.error(result.error || 'Refresh failed');
  };

  return (
    <AuthLayout title="Profile">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader
          title="Profile"
          subtitle="Your account details from the B-Smart platform"
          action={
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 text-sm text-gray-500 font-inter hover:text-brand-blue transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Avatar + editable fields */}
          <Card className="p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-brand-blue flex items-center justify-center overflow-hidden text-white text-3xl font-bold font-sora">
                  {form.avatarUrl
                    ? <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : avatarInitial}
                </div>
                <button
                  type="button"
                  aria-label="Change profile photo"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-brand-dark rounded-full text-white hover:bg-brand-blue transition-colors"
                >
                  <Camera size={14} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
              </div>
              <h2 className="font-sora font-bold text-xl text-brand-dark text-center">{displayName}</h2>
              <p className="text-sm text-gray-500 font-inter">{roleLabel}</p>
              <div className="mt-2 flex items-center gap-2">
                {user?.emailVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded-full px-2 py-1 font-inter">
                    <CheckCircle size={11} /> Email verified
                  </span>
                )}
                {user?.isActive && (
                  <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 rounded-full px-2 py-1 font-inter">
                    <Shield size={11} /> Active
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={loading || refreshing}
                icon={User}
              />
              <Input
                label="Email Address"
                value={form.email}
                disabled
                icon={Mail}
                hint="Email cannot be changed"
              />
              <Input
                label="Phone Number"
                value={form.phoneNumber}
                onChange={(e) => setField('phoneNumber', e.target.value)}
                disabled={loading || refreshing}
                icon={Phone}
              />
            </div>

            <div className="mt-6">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                icon={Save}
                loading={saving}
                disabled={loading || refreshing}
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </div>
          </Card>

          {/* Organization details — shown only for org users */}
          {isOrg && (
            <Card className="p-5">
              <h3 className="font-sora font-semibold text-brand-dark mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-brand-blue" /> Organization Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow label="Organization Name" value={user?.organization} icon={Building2} />
                <InfoRow label="GSTIN" value={user?.gstin} icon={FileText} />
                <InfoRow label="Business Reg. No." value={user?.businessRegNumber} icon={FileText} />
                {organizationIndustry.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-xl sm:col-span-2">
                    <p className="text-xs text-gray-400 font-inter mb-2">Industry Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {organizationIndustry.map((ind) => (
                        <Badge key={ind} status="info">{ind}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(user?.addressLine1 || user?.addressLine2 || user?.addressLine3) && (
                  <div className="p-3 bg-gray-50 rounded-xl sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-inter mb-0.5">Registered Address</p>
                        <p className="text-sm font-medium text-brand-dark font-inter">
                          {[user.addressLine1, user.addressLine2, user.addressLine3].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-500 font-inter">Onboarding</span>
                  <Badge status={user?.onboardingCompleted ? 'success' : 'pending'}>
                    {user?.onboardingCompleted ? 'Complete' : 'Pending'}
                  </Badge>
                </div>
                {user?.createdAt && (
                  <InfoRow
                    label="Member Since"
                    value={new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  />
                )}
              </div>
            </Card>
          )}

          {/* Individual user details */}
          {!isOrg && role !== 'super-admin' && (
            <Card className="p-5">
              <h3 className="font-sora font-semibold text-brand-dark mb-4 flex items-center gap-2">
                <User size={16} className="text-brand-blue" /> Account Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-500 font-inter">Account Status</span>
                  <Badge status={user?.isActive ? 'success' : 'error'}>
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {user?.createdAt && (
                  <InfoRow
                    label="Member Since"
                    value={new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  />
                )}
              </div>
            </Card>
          )}

        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default Profile;
