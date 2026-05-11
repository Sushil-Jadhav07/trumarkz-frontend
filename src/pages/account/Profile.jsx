import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { User, Camera, Mail, Phone, Building2, Save, CheckCircle, FileText, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = {
  name: '',
  email: '',
  mobile: '',
  organization: '',
  avatarUrl: '',
};

const notificationStyles = {
  blue: 'bg-blue-50 text-blue-500',
  green: 'bg-green-50 text-green-500',
  orange: 'bg-orange-50 text-orange-500',
};

const roleLabels = {
  organization: 'Organization Admin',
  individual: 'Individual',
  super_admin: 'Super Admin',
  'super-admin': 'Super Admin',
};

const normalizeForm = (user) => ({
  name: user?.name || '',
  email: user?.email || '',
  mobile: user?.mobile || '',
  organization: user?.organization || '',
  avatarUrl: user?.avatarUrl || '',
});

export const Profile = () => {
  const { user, loading, updateUserProfile } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(normalizeForm(user));
    setErrors({});
  }, [user]);

  const savedForm = useMemo(() => normalizeForm(user), [user]);
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const displayName = form.name.trim() || 'User';
  const avatarInitial = displayName[0]?.toUpperCase() || 'U';
  const roleLabel = roleLabels[user?.role] || user?.role || 'Account';

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Full name is required';
    if (!form.email.trim()) {
      nextErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (form.mobile.trim() && !/^\+?[0-9\s-]{8,15}$/.test(form.mobile.trim())) {
      nextErrors.mobile = 'Enter a valid mobile number';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('Profile photo must be under 1 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setField('avatarUrl', reader.result);
      toast.success('Profile photo ready to save');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSave = () => {
    if (!validate()) return;
    setSaving(true);
    updateUserProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      organization: form.organization.trim(),
      avatarUrl: form.avatarUrl,
    });
    setSaving(false);
    toast.success('Profile updated successfully');
  };

  const notifications = [
    { id: 1, title: 'New report generated', time: '2 min ago', icon: FileText, color: 'blue' },
    { id: 2, title: 'Profile details reviewed', time: '1 hour ago', icon: CheckCircle, color: 'green' },
    { id: 3, title: 'Payment received', time: '3 hours ago', icon: Wallet, color: 'orange' },
  ];

  return (
    <AuthLayout title="Profile">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader title="Profile" subtitle="Manage your account details" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 mb-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-brand-blue flex items-center justify-center overflow-hidden text-white text-3xl font-bold font-sora">
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    avatarInitial
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Change profile photo"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-brand-dark rounded-full text-white hover:bg-brand-blue transition-colors"
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>
              <h2 className="font-sora font-bold text-xl text-brand-dark text-center">{displayName}</h2>
              <p className="text-sm text-gray-500 font-inter">{roleLabel}</p>
              {form.organization && (
                <p className="text-sm text-gray-500 font-inter text-center">{form.organization}</p>
              )}
            </div>

            <div className="space-y-4">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                error={errors.name}
                disabled={loading}
                icon={User}
              />
              <Input
                label="Email Address"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                error={errors.email}
                disabled={loading}
                icon={Mail}
              />
              <Input
                label="Mobile Number"
                value={form.mobile}
                onChange={(e) => setField('mobile', e.target.value)}
                error={errors.mobile}
                disabled={loading}
                icon={Phone}
              />
              <Input
                label="Organization"
                value={form.organization}
                onChange={(e) => setField('organization', e.target.value)}
                disabled={loading || user?.role === 'individual'}
                icon={Building2}
              />
            </div>

            <div className="mt-6">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                icon={Save}
                loading={saving}
                disabled={loading || !isDirty}
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </div>
          </Card>

          <h3 className="font-sora font-semibold text-brand-dark mb-3">Recent Notifications</h3>
          <div className="space-y-3">
            {notifications.map((n, i) => {
              const Icon = n.icon;
              const colorClass = notificationStyles[n.color] || notificationStyles.blue;

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-brand-dark font-inter">{n.title}</p>
                        <p className="text-xs text-gray-500 font-inter">{n.time}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default Profile;
