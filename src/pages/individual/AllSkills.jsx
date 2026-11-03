import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageIntro, SearchField, NumberedPager } from '@/components/shared/AdminPageParts';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { skillsAPI, getApiError } from '@/services/api';
import { pageRange } from '@/utils/pagination';
import toast from 'react-hot-toast';
import {
  Layers, ShieldCheck, Clock, XCircle, FileText, GitBranch, Info, CheckCircle2, Code2, GraduationCap, Heart, FolderKanban,
} from 'lucide-react';

const TYPE_ICONS = { education: GraduationCap, technical: Code2, soft: Heart, project: FolderKanban };
const TYPE_LABELS = { education: 'Education', technical: 'Technical', soft: 'Soft skill', project: 'Project' };
const STATUS_PILL = {
  verified: { label: 'Verified', icon: CheckCircle2, tone: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', icon: XCircle, tone: 'bg-red-100 text-red-600' },
  pending: { label: 'Pending', icon: Clock, tone: 'bg-amber-100 text-amber-800' },
};
const PAGE_SIZES = [10, 25, 50].map((n) => ({ value: n, label: `${n} per page` }));

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

export const AllSkills = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let mounted = true;
    skillsAPI.getMySkills()
      .then(({ data }) => { if (mounted) setSkills(data.skills || []); })
      .catch((err) => toast.error(getApiError(err, 'Failed to load skills')))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const counts = useMemo(() => ({
    all: skills.length,
    verified: skills.filter((s) => s.status === 'verified').length,
    pending: skills.filter((s) => s.status === 'pending').length,
    rejected: skills.filter((s) => s.status === 'rejected').length,
  }), [skills]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => (tab === 'all' || s.status === tab)
      && (!q || [s.skill_name, s.skill_type, s.institution_name, s.degree, s.skill_info].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [skills, tab, query]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const { from, to } = pageRange(safePage, pageSize, rows.length);

  const tabs = [
    { value: 'all', label: `All (${counts.all})` },
    { value: 'verified', label: `Verified (${counts.verified})` },
    { value: 'pending', label: `Pending (${counts.pending})` },
    { value: 'rejected', label: `Rejected (${counts.rejected})` },
  ];

  if (loading) {
    return (
      <AuthLayout title="All Skills">
        <LoadingSkeleton variant="table" columns={6} label="Loading skills" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="All Skills">
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro
          title="All Skills"
          subtitle="View every skill and its verification status."
          actions={(
            <button
              type="button"
              onClick={() => navigate('/individual/skill-tree')}
              className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-brand-blue/80 bg-white px-5 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-50 font-inter"
            >
              <GitBranch size={17} /> My skill tree
            </button>
          )}
        />

        {/* Totals */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-6 py-5 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]">
          <svg aria-hidden="true" className="pointer-events-none absolute right-5 top-4 hidden h-12 w-24 sm:block" viewBox="0 0 96 48" fill="#fff" fillOpacity="0.4">
            {Array.from({ length: 4 }).flatMap((_, row) => Array.from({ length: 7 }).map((__, col) => <circle key={`${row}-${col}`} cx={4 + col * 14} cy={4 + row * 14} r="1.5" />))}
          </svg>
          <dl className="relative grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-white/25">
            {[
              { label: 'Total skills', value: counts.all, icon: Layers },
              { label: 'Verified', value: counts.verified, icon: ShieldCheck },
              { label: 'Pending', value: counts.pending, icon: Clock },
              { label: 'Rejected', value: counts.rejected, icon: XCircle },
            ].map((stat, i) => (
              <div key={stat.label} className={`flex items-center gap-5 ${i > 0 ? 'lg:pl-10' : 'lg:pl-4'}`}>
                <stat.icon size={40} strokeWidth={1.4} className="shrink-0" />
                <div>
                  <dt className="text-sm text-white/95 font-inter">{stat.label}</dt>
                  <dd className="font-sora text-3xl font-bold leading-tight">{stat.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <section aria-label="Skills directory" className="mb-4 rounded-xl border border-gray-100 bg-white p-5">
          <h2 className="flex items-center gap-3 font-sora text-lg font-semibold text-brand-dark">
            Skills directory
            <span className="rounded-full bg-[#e3ebf8] px-3 py-0.5 text-[13px] font-medium text-brand-blue font-inter">{counts.all} {counts.all === 1 ? 'skill' : 'skills'}</span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500 font-inter">Your complete skill record.</p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SlidingTabs
              variant="underline"
              ariaLabel="Filter skills by status"
              className="overflow-x-auto"
              value={tab}
              onChange={(value) => { setTab(value); setPage(1); }}
              tabs={tabs}
            />
            <SearchField search={query} onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Search skills…" className="w-full sm:w-72" />
          </div>

          {rows.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-200 py-12 text-center">
              <p className="text-sm text-gray-500 font-inter">{skills.length === 0 ? 'No skills found for this account yet.' : 'No skills match your filters.'}</p>
              {skills.length === 0 && <Link to="/individual/skill-tree" className="mt-2 inline-block text-sm font-semibold text-brand-blue hover:underline font-inter">Add your first skill</Link>}
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto scrollbar-hidden">
                <table className="w-full min-w-[820px] border-collapse text-left text-xs font-inter">
                  <thead>
                    <tr>
                      <th className="rounded-l-lg px-4 py-3">Skill</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Institution / Degree</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Verified on</th>
                      <th className="rounded-r-lg px-4 py-3">Documents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageRows.map((item, i) => {
                      const pill = STATUS_PILL[item.status] || STATUS_PILL.pending;
                      const TypeIcon = TYPE_ICONS[item.skill_type] || Code2;
                      const institutionLine = [item.institution_name, item.degree].filter(Boolean).join(' — ');
                      return (
                        <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="transition-colors hover:bg-blue-50/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3.5">
                              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fe] text-brand-blue"><TypeIcon size={20} strokeWidth={1.6} /></span>
                              <div className="min-w-0">
                                <p className="text-[15px] font-semibold text-brand-dark">{item.skill_name}</p>
                                {item.skill_info && <p className="text-xs text-gray-500">{item.skill_info}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className="inline-flex rounded-md bg-[#e3ebf8] px-2.5 py-1 text-xs font-medium text-brand-blue">{TYPE_LABELS[item.skill_type] || item.skill_type}</span></td>
                          <td className="px-4 py-3 text-[13px] text-[#2f3b52]">{institutionLine || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium ${pill.tone}`}><pill.icon size={16} />{pill.label}</span>
                            {item.status === 'rejected' && item.status_reason && <p className="mt-1 max-w-[200px] text-xs text-red-500">{item.status_reason}</p>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[#2f3b52]">{formatDate(item.verified_at) || '—'}</td>
                          <td className="px-4 py-3 text-[13px] text-[#2f3b52]">
                            {item.documents && item.documents.length > 0
                              ? <span className="inline-flex items-center gap-1.5"><FileText size={14} />{item.documents.length}</span>
                              : '—'}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <p className="text-[13px] text-gray-600 font-inter">Showing {from}–{to} of {rows.length} {rows.length === 1 ? 'skill' : 'skills'}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <NumberedPager page={safePage} totalPages={totalPages} onPage={setPage} />
                  <span aria-hidden="true" className="hidden h-6 w-px bg-gray-200 sm:block" />
                  <CustomSelect
                    value={pageSize}
                    onChange={(n) => { setPageSize(n); setPage(1); }}
                    options={PAGE_SIZES}
                    ariaLabel="Rows per page"
                    className="w-36 [&>button]:h-10 [&>button]:text-[13px] [&>button]:font-medium [&>button]:rounded-lg"
                  />
                </div>
              </div>
            </>
          )}
        </section>

        <p className="flex items-center gap-3 rounded-xl bg-[#e9f0fb] px-5 py-3 text-[13px] text-[#2f3b52] font-inter">
          <Info size={17} className="shrink-0 text-brand-blue" />
          <span>Manage entries and supporting documents in <Link to="/individual/skill-tree" className="font-medium text-brand-blue hover:underline">My Skill Tree</Link>.</span>
        </p>
      </div>
    </AuthLayout>
  );
};

export default AllSkills;
