import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase, Building2, Calendar, CheckCircle2, ChevronRight, FileText, LayoutGrid, Layers, Mail, Pencil, Phone,
  RefreshCw, Save, ShieldCheck, User, UserCog, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { BrowserNotifications } from '@/components/shared/BrowserNotifications';
import { OutlineButton, PageIntro } from '@/components/shared/AdminPageParts';
import { StackedSheets } from '@/components/shared/KpiCard';
import { useAuth } from '@/context/AuthContext';
import { adminAPI, getApiError } from '@/services/api';
import { isValidEmail } from '@/utils/certificateAccess';

// The Super Admin's own profile: identity, account facts and quick links to the admin areas.
// Personal details are edited through the same self-targeted endpoint used to manage other
// Super Admins (PATCH /auth/superadmins/{id}); a password change stays in User List's modal.

const IconTile = ({ icon: Icon, children }) => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3fb] text-[#7d8aa5]">
    {children || <Icon size={18} strokeWidth={1.6} />}
  </span>
);

const Dot = ({ on }) => <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${on ? 'bg-green-500' : 'bg-gray-300'}`} />;

// Label on the left, value in a fixed column so the values line up down the card.
const FactRow = ({ tile, label, children }) => (
  <div className="flex items-center border-b border-gray-100 py-2 last:border-b-0">
    <div className="flex w-[13rem] shrink-0 items-center gap-3">
      {tile}
      <p className="text-sm text-[#7d8aa5] font-inter">{label}</p>
    </div>
    <div className="min-w-0 text-[15px] text-brand-dark font-inter">{children}</div>
  </div>
);

const Detail = ({ icon, label, value, mono = false }) => (
  <div className="flex min-w-0 items-center gap-3.5">
    <IconTile icon={icon} />
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#7d8aa5] font-inter">{label}</p>
      <p className={`mt-0.5 break-all text-[15px] text-brand-dark ${mono ? 'font-mono text-sm tracking-tight' : 'font-inter'}`}>{value || '—'}</p>
    </div>
  </div>
);

const EditField = ({ id, icon: Icon, label, value, onChange, type = 'text', disabled, error }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600 font-inter">{label}</label>
    <div className="relative">
      <Icon size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        className={`h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm text-brand-dark font-inter focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:border-brand-blue focus:ring-brand-blue/20'}`}
      />
    </div>
    {error && <p role="alert" className="mt-1 text-xs text-red-600 font-inter">{error}</p>}
  </div>
);

// Same icons the sidebar uses for these areas.
const WORKSPACE_LINKS = [
  { label: 'Batch Monitor', icon: Layers, to: '/admin/batch-monitor' },
  { label: 'Organizations', icon: Briefcase, to: '/admin/organizations', chevron: true },
  { label: 'Verifier directory', icon: Building2, to: '/admin/verifiers' },
  { label: 'Manage admin access', icon: UserCog, to: '/admin/promote-super-admin', chevron: true },
];

export const SuperAdminProfile = () => {
  const navigate = useNavigate();
  const { user, loading, updateUserProfile, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: '', phone: '', email: '' });
  const [emailError, setEmailError] = useState('');

  const displayName = user?.name || 'Super Admin';
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleRefresh = async () => {
    if (!refreshUser) return;
    setRefreshing(true);
    const result = await refreshUser();
    setRefreshing(false);
    if (result?.success) toast.success('Profile refreshed');
    else toast.error(result?.error || 'Refresh failed');
  };

  const startEdit = () => {
    setDraft({ name: user?.name || '', phone: user?.phoneNumber || '', email: user?.email || '' });
    setEmailError('');
    setEditing(true);
  };

  const save = async () => {
    const name = draft.name.trim();
    const phone = draft.phone.trim();
    const email = draft.email.trim();
    if (email && !isValidEmail(email)) { setEmailError('Enter a valid email address.'); return; }
    setSaving(true);
    try {
      const payload = {};
      const updates = {};
      if (name !== (user?.name || '')) { payload.full_name = name; updates.name = name; }
      if (phone !== (user?.phoneNumber || '')) { payload.phone_number = phone; updates.phoneNumber = phone; }
      if (email !== (user?.email || '')) { payload.email = email; updates.email = email; }
      if (Object.keys(payload).length > 0) {
        await adminAPI.updateSuperAdmin(user.id, payload);
        updateUserProfile(updates);
        await refreshUser();
        toast.success('Profile updated');
      }
      setEditing(false);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save changes'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout title="Profile" breadcrumb={['Administration', 'Profile']}>
      <PageIntro
        eyebrow="Administrator account"
        title="My profile"
        subtitle="Your identity and access across TruMarkZ."
        actions={<OutlineButton icon={RefreshCw} onClick={handleRefresh} disabled={refreshing || loading}>Refresh</OutlineButton>}
      />

      {/* Identity banner */}
      <section aria-label="Account summary" className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-[#1456F0] via-[#1D5CF2] to-[#2B6BFA] px-7 py-5 text-white shadow-[0_12px_28px_-14px_rgba(29,92,242,0.6)]">
        {/* soft curves and a dot, as in the design */}
        <svg aria-hidden="true" viewBox="0 0 1330 167" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block">
          <g fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="1.5">
            <path d="M 380 -10 Q 410 100 520 128 T 760 190" />
            <path d="M 560 -10 Q 480 30 427 82" />
            <circle cx="427" cy="82" r="4.5" fill="#fff" fillOpacity="0.85" stroke="none" />
          </g>
        </svg>
        <StackedSheets className="pointer-events-none absolute -right-10 top-1/2 h-[150%] -translate-y-1/2" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-6 lg:min-w-[470px]">
            <span aria-hidden="true" className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full bg-white font-sora text-[40px] font-bold text-brand-blue ring-[6px] ring-white/25">
              {displayName.trim()[0]?.toUpperCase() || 'S'}
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-sora text-[26px] font-semibold leading-tight">{displayName}</h2>
              <p className="mt-1 break-all text-[15px] text-white/95 font-inter">{user?.email || '—'}</p>
              <span className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-brand-blue font-inter">
                <ShieldCheck size={17} className="fill-brand-blue text-white" /> Platform administrator
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:border-l lg:border-white/25 lg:pl-9">
            <div className="flex flex-wrap gap-2.5">
              {user?.emailVerified && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/70 px-4 py-1.5 text-[13px] font-medium font-inter"><CheckCircle2 size={16} strokeWidth={1.75} /> Email verified</span>
              )}
              {user?.isActive && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/70 px-4 py-1.5 text-[13px] font-medium font-inter"><span className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-white/40" /> Account active</span>
              )}
            </div>
            {memberSince && <p className="flex items-center gap-2.5 text-[15px] text-white/95 font-inter"><Calendar size={17} strokeWidth={1.75} /> Member since {memberSince}</p>}
          </div>
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        {/* Personal information */}
        <section aria-label="Personal information" className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-sora text-lg font-semibold text-brand-dark">Personal information</h2>
            {editing ? (
              <div className="flex gap-2">
                <button type="button" onClick={save} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white font-inter hover:bg-brand-blue-hover disabled:opacity-60">
                  {saving ? <RefreshCw size={14} className="animate-spin motion-reduce:animate-none" /> : <Save size={14} />} Save
                </button>
                <button type="button" onClick={() => setEditing(false)} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 font-inter hover:bg-gray-50 disabled:opacity-60">
                  <X size={14} /> Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={startEdit} className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-blue/70 bg-white px-4 text-sm font-semibold text-brand-blue font-inter hover:bg-blue-50">
                <Pencil size={14} /> Edit profile
              </button>
            )}
          </div>

          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <EditField id="sa-name" icon={User} label="Full name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} disabled={saving} />
              <EditField id="sa-phone" icon={Phone} label="Phone number" type="tel" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} disabled={saving} />
              <div className="sm:col-span-2">
                <EditField id="sa-email" icon={Mail} label="Email address" type="email" value={draft.email} onChange={(v) => { setDraft((d) => ({ ...d, email: v })); setEmailError(''); }} disabled={saving} error={emailError} />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="grid gap-4 pb-4 sm:grid-cols-2 sm:gap-0">
                <Detail icon={User} label="Full name" value={user?.name} />
                <div className="sm:border-l sm:border-gray-100 sm:pl-6"><Detail icon={Phone} label="Phone number" value={user?.phoneNumber} /></div>
              </div>
              <div className="py-4"><Detail icon={Mail} label="Email address" value={user?.email} /></div>
              <div className="pt-4"><Detail icon={FileText} label="Account ID" value={user?.id} mono /></div>
            </div>
          )}
          <p className="mt-5 text-sm text-[#7d8aa5] font-inter">Personal details are separate from account permissions.</p>
        </section>

        {/* Account overview */}
        <section aria-label="Account overview" className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-3 flex items-center gap-3">
            <ShieldCheck size={22} strokeWidth={1.6} className="text-brand-blue" />
            <h2 className="font-sora text-lg font-semibold text-brand-dark">Account overview</h2>
          </div>
          <FactRow tile={<IconTile icon={User} />} label="Role">Super Admin</FactRow>
          <FactRow tile={<IconTile icon={Layers} />} label="Scope">Platform-wide</FactRow>
          <FactRow tile={<IconTile><Dot on={!!user?.isActive} /></IconTile>} label="Account status">
            <span className="inline-flex items-center gap-2.5"><Dot on={!!user?.isActive} />{user?.isActive ? 'Active' : 'Inactive'}</span>
          </FactRow>
          <FactRow tile={<IconTile icon={Mail} />} label="Email verified">
            <span className="inline-flex items-center gap-2.5"><Dot on={!!user?.emailVerified} />{user?.emailVerified ? 'Verified' : 'Unverified'}</span>
          </FactRow>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <BrowserNotifications className="mb-0 flex items-center" />

        <section aria-label="Administrative workspace" className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-3 flex items-center gap-3">
            <LayoutGrid size={22} strokeWidth={1.6} className="text-brand-blue" />
            <h2 className="font-sora text-lg font-semibold text-brand-dark">Administrative workspace</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {WORKSPACE_LINKS.map(({ label, icon: Icon, to, chevron }, i) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(to)}
                className={`group flex h-[52px] items-center gap-3.5 border-t border-gray-100 text-left text-[15px] text-brand-dark font-inter transition-colors hover:text-brand-blue ${i % 2 === 1 ? 'sm:border-l sm:pl-6' : 'sm:pr-6'}`}
              >
                <Icon size={21} strokeWidth={1.6} className="shrink-0 text-brand-blue" />
                <span className="flex-1">{label}</span>
                {chevron && <ChevronRight size={18} className="shrink-0 text-brand-blue transition-transform group-hover:translate-x-0.5" />}
              </button>
            ))}
          </div>
        </section>
      </div>

      <p className="mt-6 text-center text-xs text-[#7d8aa5] font-inter">
        <Link to="/privacy-policy" className="hover:text-brand-blue hover:underline">Privacy Policy</Link>
        <span className="mx-2">·</span>
        <Link to="/terms-of-service" className="hover:text-brand-blue hover:underline">Terms of Service</Link>
      </p>
    </AuthLayout>
  );
};

export default SuperAdminProfile;
