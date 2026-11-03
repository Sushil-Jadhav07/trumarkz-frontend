import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageIntro, SearchField } from '@/components/shared/AdminPageParts';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { mockSkillTree } from '@/data/mockData';
import {
  Award, Share2, Download, CalendarDays, Building2, Briefcase, GraduationCap, Layers, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const getTitle = (item) => item.level || item.name || item.role || item.skill;
const getSubtitle = (item) => item.institution || item.provider || item.company || '';

const CATEGORIES = {
  education: { label: 'Education', icon: GraduationCap },
  course: { label: 'Course', icon: Layers },
  experience: { label: 'Experience', icon: Briefcase },
  skill: { label: 'Skill', icon: Award },
};

export const IndividualCredentials = () => {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');

  const allItems = useMemo(
    () => [
      ...mockSkillTree.education.map((item) => ({ ...item, category: 'education' })),
      ...mockSkillTree.courses.map((item) => ({ ...item, category: 'course' })),
      ...mockSkillTree.experience.map((item) => ({ ...item, category: 'experience' })),
      ...mockSkillTree.skills.map((item) => ({ ...item, category: 'skill' })),
    ].filter((i) => i.status === 'verified' && i.credId),
    [],
  );

  const count = (category) => allItems.filter((item) => item.category === category).length;
  const counts = { education: count('education'), course: count('course'), experience: count('experience'), skill: count('skill') };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => (tab === 'all' || item.category === tab)
      && (!q || [getTitle(item), getSubtitle(item), item.credId, CATEGORIES[item.category].label].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [allItems, tab, query]);

  const share = async (item) => {
    try {
      await navigator.clipboard.writeText(item.credId);
      toast.success('Credential ID copied');
    } catch {
      toast.error('Could not copy. Select the credential ID and copy it manually.');
    }
  };
  const download = () => toast('Credential download isn’t available yet.');

  const tabs = [
    { value: 'all', label: `All (${allItems.length})` },
    { value: 'education', label: `Education (${counts.education})` },
    { value: 'course', label: `Courses (${counts.course})` },
    { value: 'experience', label: `Experience (${counts.experience})` },
    { value: 'skill', label: `Skills (${counts.skill})` },
  ];

  return (
    <AuthLayout title="My Credentials">
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro title="My Credentials" subtitle="Your verified credentials, securely organised." />

        {/* Totals */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-6 py-5 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]">
          <svg aria-hidden="true" className="pointer-events-none absolute right-5 top-4 hidden h-12 w-24 sm:block" viewBox="0 0 96 48" fill="#fff" fillOpacity="0.4">
            {Array.from({ length: 4 }).flatMap((_, row) => Array.from({ length: 7 }).map((__, col) => <circle key={`${row}-${col}`} cx={4 + col * 14} cy={4 + row * 14} r="1.5" />))}
          </svg>
          <dl className="relative grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-white/25">
            {[
              { label: 'Total credentials', value: allItems.length, icon: Award },
              { label: 'Education', value: counts.education, icon: GraduationCap },
              { label: 'Courses', value: counts.course, icon: Layers },
              { label: 'Experience & skills', value: counts.experience + counts.skill, icon: Briefcase },
            ].map((stat, i) => (
              <div key={stat.label} className={`flex items-center gap-5 ${i > 0 ? 'lg:pl-10' : 'lg:pl-4'}`}>
                <stat.icon size={42} strokeWidth={1.4} className="shrink-0" />
                <div>
                  <dd className="font-sora text-3xl font-bold leading-none">{stat.value}</dd>
                  <dt className="mt-1 text-sm text-white/95 font-inter">{stat.label}</dt>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div className="mb-4 flex flex-col gap-3 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between">
          <SlidingTabs
            variant="underline"
            ariaLabel="Filter credentials"
            className="overflow-x-auto !border-b-0"
            value={tab}
            onChange={setTab}
            tabs={tabs}
          />
          <SearchField search={query} onSearch={setQuery} placeholder="Search credentials…" className="mb-2 w-full sm:w-72" />
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center">
            <p className="text-sm text-gray-500 font-inter">{allItems.length === 0 ? 'No verified credentials yet.' : 'No credentials match your filters.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((item, i) => {
              const category = CATEGORIES[item.category];
              const CategoryIcon = category.icon;
              const provider = getSubtitle(item);
              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-col rounded-xl border border-gray-100 border-t-[3px] border-t-brand-blue bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><CategoryIcon size={22} strokeWidth={1.6} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 font-inter">{category.label}</p>
                      <h2 className="truncate font-sora text-lg font-bold leading-tight text-brand-dark" title={getTitle(item)}>{getTitle(item)}</h2>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-[11px] font-semibold text-white font-inter">
                      <CheckCircle2 size={12} />Verified
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3 text-[13px] text-brand-dark font-inter">
                    <span className="flex min-w-0 items-center gap-2"><Building2 size={16} strokeWidth={1.5} className="shrink-0 text-gray-500" /><span className="truncate">{provider || 'Not specified'}</span></span>
                    <span aria-hidden="true" className="h-4 w-px shrink-0 bg-gray-200" />
                    <span className="flex shrink-0 items-center gap-2"><CalendarDays size={16} strokeWidth={1.5} className="text-gray-500" />{item.year || '—'}</span>
                  </div>

                  <div className="mt-3 rounded-lg bg-[#eaf1fe] px-3 py-2.5 text-xs font-inter">
                    <span className="text-gray-600">Credential ID: </span>
                    <span className="break-all font-medium text-brand-blue">{item.credId}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 pt-3">
                    <button type="button" onClick={() => share(item)} className="flex items-center justify-center gap-2 py-1 text-[13px] font-medium text-brand-blue transition-colors hover:text-blue-800 font-inter">
                      <Share2 size={16} />Share
                    </button>
                    <button type="button" onClick={download} className="flex items-center justify-center gap-2 py-1 text-[13px] font-medium text-brand-blue transition-colors hover:text-blue-800 font-inter">
                      <Download size={16} />Download
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        <p className="mt-5 text-[13px] text-gray-600 font-inter">
          {visible.length === allItems.length ? `Showing all ${allItems.length} credentials` : `Showing ${visible.length} of ${allItems.length} credentials`}
        </p>
      </div>
    </AuthLayout>
  );
};

export default IndividualCredentials;
