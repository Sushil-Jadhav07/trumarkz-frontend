import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageIntro } from '@/components/shared/AdminPageParts';
import { useAuth } from '@/context/AuthContext';
import { skillsAPI, getApiError } from '@/services/api';
import toast from 'react-hot-toast';
import {
  GitBranch, Award, Share2, ArrowRight, CheckCircle2, Clock, Heart, GraduationCap, FolderKanban, Layers, User, XCircle,
} from 'lucide-react';

const TYPE_ICONS = { education: GraduationCap, technical: Layers, soft: Heart, project: FolderKanban };
const TYPE_LABELS = { education: 'Education', technical: 'Technical', soft: 'Soft skill', project: 'Project' };

const STATUS = {
  verified: { label: 'Verified', icon: CheckCircle2, tone: 'border-green-200 bg-green-50 text-green-700' },
  rejected: { label: 'Rejected', icon: XCircle, tone: 'border-red-200 bg-red-50 text-red-600' },
  pending: { label: 'Pending', icon: Clock, tone: 'border-orange-200 bg-orange-50 text-orange-600' },
};
const statusOf = (status) => STATUS[status] || STATUS.pending;

// Shield with three linked nodes, drawn in code for the welcome banner.
const WelcomeArt = () => (
  <div aria-hidden="true" className="relative hidden h-[150px] w-[390px] shrink-0 lg:block">
    <svg viewBox="0 0 390 150" className="absolute inset-0 h-full w-full" fill="none">
      <path d="M78 52 C 120 76, 150 84, 196 84" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.5" />
      <path d="M196 84 C 250 76, 280 56, 322 40" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.5" />
      <path d="M196 96 C 250 100, 290 110, 330 124" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.5" />
    </svg>
    <span className="absolute left-[52px] top-[26px] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-brand-blue shadow-lg"><Layers size={22} strokeWidth={1.7} /></span>
    <span className="absolute right-[40px] top-[12px] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-brand-blue shadow-lg"><GitBranch size={22} strokeWidth={1.7} /></span>
    <span className="absolute bottom-[8px] right-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-brand-blue shadow-lg"><Award size={22} strokeWidth={1.7} /></span>
    <svg viewBox="0 0 100 112" className="absolute left-[146px] top-[20px] h-[112px] w-[100px] drop-shadow-xl">
      <path d="M50 4 C 38 14, 24 16, 8 18 L8 56 C8 82, 28 98, 50 108 C 72 98, 92 82, 92 56 L92 18 C 76 16, 62 14, 50 4 Z" fill="#fff" />
      <path d="M50 12 C 40 20, 28 22, 16 24 L16 56 C16 76, 32 90, 50 99 C 68 90, 84 76, 84 56 L84 24 C 72 22, 60 20, 50 12 Z" fill="#2563eb" />
      <path d="M32 56 L45 69 L69 43" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  </div>
);

export const IndividualDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await skillsAPI.getMySkills();
        setSkills(res.data.skills || []);
      } catch (err) {
        toast.error(getApiError(err, 'Failed to load skills'));
      } finally {
        setLoading(false);
      }
    };
    fetchSkills();
  }, []);

  const verified = skills.filter((s) => s.status === 'verified').length;
  const pending = skills.filter((s) => s.status === 'pending').length;
  const total = skills.length;
  const previewItems = skills.slice(0, 3);
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'there';

  const stats = [
    { label: 'Verified skills', value: verified, icon: CheckCircle2, tile: 'bg-green-50 text-green-600' },
    { label: 'Pending verification', value: pending, icon: Clock, tile: 'bg-orange-50 text-orange-500' },
    { label: 'Total skills', value: total, icon: GitBranch, tile: 'bg-[#e8f0fe] text-brand-blue' },
  ];

  const quickActions = [
    { label: 'My Skill Tree', desc: 'Explore your skill connections', icon: GitBranch, path: '/individual/skill-tree' },
    { label: 'My Credentials', desc: 'View your digital credentials', icon: Award, path: '/individual/credentials' },
    { label: 'Share Profile', desc: 'Manage how you share your profile', icon: Share2, path: '/individual/share' },
  ];

  if (loading) {
    return (
      <AuthLayout title="My Dashboard">
        <LoadingSkeleton variant="dashboard" />
      </AuthLayout>
    );
  }

  const count = previewItems.length;

  return (
    <AuthLayout title="My Dashboard">
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro title="My Dashboard" subtitle="Your skills and credentials, in one place." />

        {/* Welcome banner */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-7 py-6 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]">
          <svg aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[60%]" viewBox="0 0 600 160" preserveAspectRatio="none" fill="none">
            <path d="M0 150 C 160 140, 340 70, 600 30" stroke="#fff" strokeOpacity="0.14" strokeWidth="1.5" />
            <path d="M120 160 C 280 146, 420 100, 600 66" stroke="#fff" strokeOpacity="0.1" strokeWidth="1.5" />
          </svg>
          <div className="relative flex items-center justify-between gap-6">
            <div>
              <h2 className="font-sora text-2xl font-semibold leading-tight">Welcome back, {firstName}</h2>
              <p className="mt-1.5 text-sm text-white/90 font-inter">Build confidence in your verified skills.</p>
              <button
                type="button"
                onClick={() => navigate('/individual/skill-tree')}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-50 font-inter"
              >
                View my skill tree <ArrowRight size={16} />
              </button>
            </div>
            <WelcomeArt />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-5 py-4"
            >
              <span aria-hidden="true" className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${stat.tile}`}><stat.icon size={26} strokeWidth={1.6} /></span>
              <div>
                <p className="font-sora text-[26px] font-bold leading-none text-brand-dark">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-600 font-inter">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          {/* Skill tree preview */}
          <section aria-label="Skill tree preview" className="min-w-0 rounded-xl border border-gray-100 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-sora text-lg font-semibold text-brand-dark">Skill tree preview</h2>
                <p className="mt-0.5 text-[13px] text-gray-500 font-inter">Your verified and in-progress skills.</p>
              </div>
              <button type="button" onClick={() => navigate('/individual/skill-tree')} className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-brand-blue hover:underline font-inter">
                View full tree <ArrowRight size={15} />
              </button>
            </div>

            {count === 0 ? (
              <div className="py-10 text-center">
                <GitBranch size={38} className="mx-auto mb-3 text-gray-300" />
                <p className="font-sora font-semibold text-brand-dark">No skills added yet</p>
                <p className="mt-1 text-sm text-gray-500 font-inter">Start building your verified skill tree.</p>
                <button
                  type="button"
                  onClick={() => navigate('/individual/skill-tree/build?section=education')}
                  className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-blue px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover font-inter"
                >
                  Add your first skill
                </button>
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-stretch gap-0">
                  <div className="flex w-[210px] shrink-0 items-center max-md:w-[120px]">
                    <div className="flex h-[60px] w-full items-center gap-3 rounded-xl border border-[#b9cdf3] bg-[#eaf1fe] px-4 text-[15px] font-semibold text-brand-dark font-inter">
                      <User size={22} strokeWidth={1.5} className="shrink-0 text-brand-blue" />Your skills
                    </div>
                  </div>
                  <svg aria-hidden="true" className="w-12 shrink-0" viewBox="0 0 48 100" preserveAspectRatio="none" fill="none">
                    {previewItems.map((_, i) => (
                      <path key={i} d={`M0 50 C 24 50, 24 ${((i + 0.5) * 100) / count}, 48 ${((i + 0.5) * 100) / count}`} stroke="#2563eb" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                    ))}
                  </svg>
                  <ul className="grid min-w-0 flex-1 auto-rows-fr gap-3">
                    {previewItems.map((item, i) => {
                      const st = statusOf(item.status);
                      const TypeIcon = TYPE_ICONS[item.skill_type] || Layers;
                      return (
                        <motion.li
                          key={item.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="relative flex items-start gap-3.5 rounded-xl border border-gray-200 bg-white px-4 py-3"
                        >
                          <span aria-hidden="true" className="absolute -left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-brand-blue bg-white" />
                          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><TypeIcon size={21} strokeWidth={1.6} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-brand-dark font-inter">{item.skill_name}</p>
                            <span className="mt-1 inline-flex rounded-md bg-[#e3ebf8] px-2 py-0.5 text-[11px] font-medium text-brand-blue font-inter">{TYPE_LABELS[item.skill_type] || item.skill_type}</span>
                            <p className="mt-1 truncate text-[13px] text-gray-600 font-inter">{item.institution_name || item.skill_info || 'No details specified'}</p>
                          </div>
                          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium font-inter ${st.tone}`}>
                            <st.icon size={14} />{st.label}
                          </span>
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
                <div className="mt-5 flex items-center gap-6 border-t border-gray-100 pt-4 text-[13px] text-[#2f3b52] font-inter">
                  <span className="inline-flex items-center gap-2"><CheckCircle2 size={18} className="text-green-600" />Verified</span>
                  <span className="inline-flex items-center gap-2"><Clock size={18} className="text-orange-500" />Pending</span>
                </div>
              </>
            )}
          </section>

          {/* Quick actions */}
          <section aria-label="Quick actions" className="min-w-0 rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="font-sora text-lg font-semibold text-brand-dark">Quick actions</h2>
            <div className="mt-4 space-y-3">
              {quickActions.map((action, i) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                    i === 0 ? 'border-[#c7d8f5] bg-[#eaf1fe] hover:bg-[#e3ecfd]' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e3ebf8] text-brand-blue"><action.icon size={21} strokeWidth={1.6} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-brand-dark font-inter">{action.label}</span>
                    <span className="block truncate text-[13px] text-gray-600 font-inter">{action.desc}</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-brand-blue transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AuthLayout>
  );
};

export default IndividualDashboard;
