import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { PageIntro, OutlineButton, SummaryBanner, SearchField } from '@/components/shared/AdminPageParts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { skillsAPI, getApiError } from '@/services/api';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  GraduationCap,
  Code2,
  Heart,
  FolderKanban,
  FileText,
  User,
  Loader2,
  ArrowRight,
  ChevronsUpDown,
  Info,
  Star,
  Eye,
  LayoutList,
} from 'lucide-react';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'education', label: 'Education' },
  { value: 'technical', label: 'Technical' },
  { value: 'soft', label: 'Soft Skill' },
  { value: 'project', label: 'Project' },
];

const typeIcons = {
  education: GraduationCap,
  technical: Code2,
  soft: Heart,
  project: FolderKanban,
};

const typeLabels = {
  education: 'Education',
  technical: 'Technical',
  soft: 'Soft Skill',
  project: 'Project',
};

const statusBadgeMap = (status) => {
  if (status === 'verified') return { status: 'verified', label: 'Verified' };
  if (status === 'rejected') return { status: 'failed', label: 'Rejected' };
  return { status: 'pending', label: 'Pending' };
};

const skillDetails = (skill) => {
  const details = [];
  if (skill.institution_name) details.push(skill.institution_name);
  if (skill.degree) details.push(skill.degree);
  if (skill.skill_info) details.push(skill.skill_info);
  return details;
};

export const SkillsManagement = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sort, setSort] = useState({ key: '', dir: 'asc' });
  const [query, setQuery] = useState('');
  const [actionModal,  setActionModal]  = useState(null);
  const [verifyModal,  setVerifyModal]  = useState(null);
  const [reason,       setReason]       = useState('');
  const [verifierEmail, setVerifierEmail] = useState('');
  const [processing,   setProcessing]   = useState(false);
  // API #6: stores { request_id, verifier_email } per skill after a request is sent
  const [sentRequests, setSentRequests] = useState({});
  const [resendingId,  setResendingId]  = useState(null);
  // API #3: view all skills for a specific individual
  const [individualModal,         setIndividualModal]         = useState(null); // { id, name }
  const [individualSkills,        setIndividualSkills]        = useState([]);
  const [individualSkillsLoading, setIndividualSkillsLoading] = useState(false);
  // Review modal: stores individual_id so the modal always reflects live skills state
  const [reviewIndividualId, setReviewIndividualId] = useState(null);
  // Inline action inside review modal (no nested modal)
  const [inlineAction,     setInlineAction]     = useState(null); // { skillId, type: 'approve'|'reject'|'update'|'verify' }
  const [inlineReason,     setInlineReason]     = useState('');
  const [inlineEmail,      setInlineEmail]      = useState('');
  const [inlineProcessing, setInlineProcessing] = useState(false);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.skill_type = filterType;
      const res = await skillsAPI.getAllSkills(params);
      setSkills(res.data.skills || []);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load skills'));
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [filterStatus, filterType]);

  const handleStatusUpdate = async (status) => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      await skillsAPI.updateSkillStatus(actionModal.id, status, reason.trim() || undefined);
      toast.success(`Skill ${status === 'verified' ? 'approved' : 'rejected'} successfully`);
      setActionModal(null);
      setReason('');
      fetchSkills();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update status'));
    } finally {
      setProcessing(false);
    }
  };

  const handleSendVerification = async () => {
    if (!verifyModal || !verifierEmail.trim()) {
      toast.error('Please enter verifier email');
      return;
    }
    setProcessing(true);
    try {
      const { data } = await skillsAPI.sendVerificationRequest(verifyModal.id, verifierEmail.trim());
      // Store request_id so admin can resend later (API #6)
      setSentRequests((prev) => ({
        ...prev,
        [verifyModal.id]: {
          request_id:    data.request_id,
          verifier_email: data.verifier_email || verifierEmail.trim(),
        },
      }));
      toast.success(`Verification request sent to ${verifierEmail}`);
      setVerifyModal(null);
      setVerifierEmail('');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send verification request'));
    } finally {
      setProcessing(false);
    }
  };

  const handleResend = async (skillId) => {
    const req = sentRequests[skillId];
    if (!req) return;
    setResendingId(skillId);
    try {
      await skillsAPI.resendVerificationLink(req.request_id);
      toast.success(`Verification link resent to ${req.verifier_email}`);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to resend verification link'));
    } finally {
      setResendingId(null);
    }
  };

  const openInline = (skillId, type) => {
    setInlineAction({ skillId, type });
    setInlineReason('');
    setInlineEmail('');
  };

  const closeInline = () => { setInlineAction(null); setInlineReason(''); setInlineEmail(''); };

  const handleInlineStatus = async (skillId, status) => {
    if (status === 'rejected' && !inlineReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setInlineProcessing(true);
    try {
      await skillsAPI.updateSkillStatus(skillId, status, inlineReason.trim() || undefined);
      toast.success(`Skill ${status === 'verified' ? 'approved' : 'rejected'} successfully`);
      closeInline();
      fetchSkills();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update status'));
    } finally {
      setInlineProcessing(false);
    }
  };

  const handleInlineVerify = async (skillId) => {
    if (!inlineEmail.trim()) { toast.error('Please enter verifier email'); return; }
    setInlineProcessing(true);
    try {
      const { data } = await skillsAPI.sendVerificationRequest(skillId, inlineEmail.trim());
      setSentRequests((prev) => ({
        ...prev,
        [skillId]: { request_id: data.request_id, verifier_email: data.verifier_email || inlineEmail.trim() },
      }));
      toast.success(`Verification request sent to ${inlineEmail}`);
      closeInline();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send verification request'));
    } finally {
      setInlineProcessing(false);
    }
  };

  const handleViewIndividualSkills = async (individualId, individualName) => {
    if (!individualId) return;
    setIndividualModal({ id: individualId, name: individualName || individualId });
    setIndividualSkillsLoading(true);
    setIndividualSkills([]);
    try {
      const res = await skillsAPI.getIndividualSkills(individualId);
      setIndividualSkills(res.data.skills || res.data || []);
    } catch (err) {
      toast.error(getApiError(err, "Failed to load individual's skills"));
    } finally {
      setIndividualSkillsLoading(false);
    }
  };

  const pendingCount  = skills.filter((s) => s.status === 'pending').length;
  const verifiedCount = skills.filter((s) => s.status === 'verified').length;
  const rejectedCount = skills.filter((s) => s.status === 'rejected').length;

  const groupedByIndividual = useMemo(() => {
    const map = {};
    skills.forEach((skill) => {
      const key = skill.individual_id || 'unknown';
      if (!map[key]) {
        map[key] = { individual_id: key, individual_name: skill.individual_name || null, skills: [] };
      }
      map[key].skills.push(skill);
    });
    return Object.values(map);
  }, [skills]);

  const rows = useMemo(() => {
    const counts = (g) => ({
      total: g.skills.length,
      pending: g.skills.filter((x) => x.status === 'pending').length,
      verified: g.skills.filter((x) => x.status === 'verified').length,
      rejected: g.skills.filter((x) => x.status === 'rejected').length,
    });
    const q = query.trim().toLowerCase();
    const list = groupedByIndividual
      .map((g) => ({ ...g, ...counts(g), displayName: g.individual_name || 'Individual account' }))
      .filter((g) => !q || g.displayName.toLowerCase().includes(q) || String(g.individual_id).toLowerCase().includes(q));
    if (!sort.key) return list;
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => sign * (sort.key === 'name' ? a.displayName.localeCompare(b.displayName) : a[sort.key] - b[sort.key]));
  }, [groupedByIndividual, sort, query]);
  const toggleSort = (key) => setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  // Always derived from live skills — updates automatically after approve/reject
  const reviewGroup = useMemo(
    () => (reviewIndividualId ? (groupedByIndividual.find((g) => g.individual_id === reviewIndividualId) ?? null) : null),
    [groupedByIndividual, reviewIndividualId]
  );


  const sortHead = (label, k, align = 'left') => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      aria-label={`Sort by ${label}`}
      className={`inline-flex items-center gap-1.5 font-semibold text-brand-dark transition-colors hover:text-brand-blue ${align === 'center' ? 'justify-center' : ''}`}
    >
      {label}
      <ChevronsUpDown size={13} className={sort.key === k ? 'text-brand-blue' : 'text-gray-500'} aria-hidden="true" />
    </button>
  );
  const ariaSort = (k) => (sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  const chip = 'inline-flex min-w-[40px] items-center justify-center rounded-lg px-3 py-1 text-[13px] font-semibold font-inter';

  return (
    <AuthLayout title="Skills Management">
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro
          eyebrow="Verification operations"
          title="Skills management"
          subtitle="Review, verify and manage skills submitted by individuals."
          actions={<OutlineButton icon={RefreshCw} onClick={fetchSkills} disabled={loading}>Refresh</OutlineButton>}
        />

        <SummaryBanner
          icon={Star}
          label="Total skills"
          value={loading ? '—' : skills.length}
          segments={[
            'Individual skill submissions',
            <span key="p" className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-amber-300" /><b className="text-xl font-bold">{loading ? '—' : pendingCount}</b> Pending review</span>,
            <span key="v" className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><b className="text-xl font-bold">{loading ? '—' : verifiedCount}</b> Verified</span>,
            <span key="r" className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-pink-300" /><b className="text-xl font-bold">{loading ? '—' : rejectedCount}</b> Rejected</span>,
          ]}
        />

        <motion.section
          aria-label="Individual submissions"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <div className="flex flex-col gap-3 px-5 pb-3 pt-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2.5 font-sora text-base font-semibold text-brand-dark">
                Individual submissions
                {!loading && (
                  <span className="rounded-full bg-[#e3ebf8] px-2.5 py-0.5 text-xs font-semibold text-brand-blue font-inter">
                    {groupedByIndividual.length} {groupedByIndividual.length === 1 ? 'individual' : 'individuals'}
                  </span>
                )}
              </h2>
              <p className="mt-1 text-xs text-gray-500 font-inter">Open an individual to review their submitted skills.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchField search={query} onSearch={setQuery} placeholder="Search individuals" className="w-full sm:w-56" />
              <CustomSelect value={filterStatus} onChange={setFilterStatus} options={statusOptions} ariaLabel="Filter by status" className="sm:w-40 [&>button]:h-10 [&>button]:text-[13px] [&>button]:font-medium [&>button]:rounded-lg" />
              <CustomSelect value={filterType} onChange={setFilterType} options={typeOptions} ariaLabel="Filter by type" className="sm:w-40 [&>button]:h-10 [&>button]:text-[13px] [&>button]:font-medium [&>button]:rounded-lg" />
            </div>
          </div>

          {loading ? (
            <div className="px-5 pb-5"><LoadingSkeleton variant="table" label="Loading skills" columns={6} /></div>
          ) : rows.length === 0 ? (
            <div className="border-t border-gray-100 py-14 text-center">
              <CheckCircle size={30} className="mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium text-gray-600 font-inter">No skills found</p>
              <p className="mt-1 text-xs text-gray-500 font-inter">Try adjusting your filters or search.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto scrollbar-hidden">
                <table className="w-full min-w-[820px] border-collapse text-left text-xs font-inter">
                  <thead>
                    <tr>
                      <th className="px-5 py-3" aria-sort={ariaSort('name')}>{sortHead('Individual', 'name')}</th>
                      <th className="px-3 py-3 text-center" aria-sort={ariaSort('total')}>{sortHead('Total skills', 'total', 'center')}</th>
                      <th className="px-3 py-3 text-center" aria-sort={ariaSort('pending')}>{sortHead('Pending', 'pending', 'center')}</th>
                      <th className="px-3 py-3 text-center" aria-sort={ariaSort('verified')}>{sortHead('Verified', 'verified', 'center')}</th>
                      <th className="px-3 py-3 text-center" aria-sort={ariaSort('rejected')}>{sortHead('Rejected', 'rejected', 'center')}</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((group) => (
                      <tr key={group.individual_id} className="transition-colors hover:bg-blue-50/30">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3.5">
                            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fe] text-brand-blue"><User size={19} strokeWidth={1.6} /></span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-brand-dark">{group.displayName}</p>
                              <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500">{group.individual_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center"><span className={`${chip} bg-[#e3ebf8] text-brand-blue`}>{group.total}</span></td>
                        <td className="px-3 py-3 text-center"><span className={`${chip} bg-orange-100 text-orange-700`}>{group.pending}</span></td>
                        <td className="px-3 py-3 text-center"><span className={`${chip} bg-green-100 text-green-700`}>{group.verified}</span></td>
                        <td className="px-3 py-3 text-center"><span className={`${chip} bg-gray-100 text-gray-700`}>{group.rejected}</span></td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setReviewIndividualId(group.individual_id)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border-2 border-brand-blue/80 bg-white px-4 text-[13px] font-semibold text-brand-blue transition-colors hover:bg-blue-50"
                          >
                            View skills <ArrowRight size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col justify-between gap-1 border-t border-gray-100 px-5 py-3 text-xs text-gray-600 font-inter sm:flex-row sm:items-center">
                <p>Showing {rows.length} of {groupedByIndividual.length} {groupedByIndividual.length === 1 ? 'individual' : 'individuals'}</p>
                <p>{skills.length} {skills.length === 1 ? 'skill' : 'skills'} submitted</p>
              </div>
            </>
          )}
        </motion.section>

        <p className="mt-4 flex items-center gap-2 text-[13px] text-gray-500 font-inter">
          <Info size={16} strokeWidth={1.5} /> Select View skills to review evidence and update verification status.
        </p>
      </div>

      <Modal
        isOpen={!!actionModal}
        onClose={() => {
          setActionModal(null);
          setReason('');
        }}
        title={`Review Skill - ${actionModal?.skill_name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="grid grid-cols-1 gap-3 text-sm font-inter sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-400">Type</p>
                <p className="font-medium text-brand-dark">{typeLabels[actionModal?.skill_type] || actionModal?.skill_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Current Status</p>
                <p className="font-medium capitalize text-brand-dark">{actionModal?.status}</p>
              </div>
              {actionModal?.institution_name && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400">Institution</p>
                  <p className="font-medium text-brand-dark">{actionModal.institution_name}</p>
                </div>
              )}
              {actionModal?.skill_info && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400">Info</p>
                  <p className="font-medium text-brand-dark">{actionModal.skill_info}</p>
                </div>
              )}
              {(actionModal?.status_reason || actionModal?.reason) && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400">Reason</p>
                  <p className="font-medium text-brand-dark">{actionModal.status_reason || actionModal.reason}</p>
                </div>
              )}
            </div>
          </div>

          <Input
            label="Reason (optional)"
            placeholder="e.g. Certificate verified successfully"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <Modal.Footer className="flex gap-3">
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              icon={processing ? Loader2 : XCircle}
              onClick={() => handleStatusUpdate('rejected')}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Reject'}
            </Button>
            <Button
              variant="success"
              size="lg"
              className="flex-1"
              icon={processing ? Loader2 : CheckCircle}
              onClick={() => handleStatusUpdate('verified')}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Approve'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* ── Review Skills Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={!!reviewIndividualId}
        onClose={() => setReviewIndividualId(null)}
        title="Skills Review"
        size="lg"
      >
        {reviewGroup && (() => {
          const pendingG  = reviewGroup.skills.filter((s) => s.status === 'pending').length;
          const verifiedG = reviewGroup.skills.filter((s) => s.status === 'verified').length;
          const rejectedG = reviewGroup.skills.filter((s) => s.status === 'rejected').length;
          return (
            <div className="space-y-4">

              {/* Individual info header */}
              <div className="flex items-center gap-3 rounded-xl bg-brand-blue/5 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-brand-blue">
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  {reviewGroup.individual_name && (
                    <p className="text-sm font-semibold text-brand-dark font-inter">{reviewGroup.individual_name}</p>
                  )}
                  <p className="text-xs text-gray-400 font-mono truncate">{reviewGroup.individual_id}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pendingG  > 0 && <Badge status="pending">{pendingG} pending</Badge>}
                  {verifiedG > 0 && <Badge status="verified">{verifiedG} verified</Badge>}
                  {rejectedG > 0 && <Badge status="failed">{rejectedG} rejected</Badge>}
                </div>
              </div>

              {/* Skill list */}
              <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                {reviewGroup.skills.map((skill, si) => {
                  const badge      = statusBadgeMap(skill.status);
                  const TypeIcon   = typeIcons[skill.skill_type] || Code2;
                  const details    = skillDetails(skill);
                  const isActive   = inlineAction?.skillId === skill.id;
                  const actionType = isActive ? inlineAction.type : null;

                  return (
                    <motion.div
                      key={skill.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: si * 0.04 }}
                      className="overflow-hidden rounded-xl border border-gray-100 bg-white"
                    >
                      {/* ── Skill row ── */}
                      <div className="flex items-center gap-3 p-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                          <TypeIcon size={16} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-brand-dark font-inter">{skill.skill_name}</p>
                            <Badge status={badge.status}>{badge.label}</Badge>
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 font-inter">
                              {typeLabels[skill.skill_type] || skill.skill_type}
                            </span>
                            {skill.documents?.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-brand-blue font-inter">
                                <FileText size={11} />{skill.documents.length} doc{skill.documents.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {details.length > 0 && (
                            <p className="mt-0.5 text-xs text-gray-400 font-inter">{details.join(' · ')}</p>
                          )}
                          {skill.status === 'rejected' && (skill.status_reason || skill.reason) && (
                            <p className="mt-0.5 text-xs text-red-500 font-inter">{skill.status_reason || skill.reason}</p>
                          )}
                          {sentRequests[skill.id] && skill.status === 'pending' && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="truncate max-w-[180px] text-xs text-brand-blue font-inter">
                                Sent → {sentRequests[skill.id].verifier_email}
                              </span>
                              <button
                                type="button"
                                disabled={resendingId === skill.id}
                                onClick={() => handleResend(skill.id)}
                                className="flex shrink-0 items-center gap-1 text-xs text-brand-blue underline underline-offset-2 hover:opacity-70 disabled:opacity-40 font-inter"
                              >
                                <RefreshCw size={9} className={resendingId === skill.id ? 'animate-spin' : ''} />
                                {resendingId === skill.id ? 'Resending…' : 'Resend'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Action trigger buttons */}
                        <div className="flex shrink-0 items-center gap-1.5">
                          {skill.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => isActive && actionType === 'verify' ? closeInline() : openInline(skill.id, 'verify')}
                                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold font-inter transition-colors ${isActive && actionType === 'verify' ? 'border-brand-blue bg-brand-blue text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-brand-blue hover:text-brand-blue'}`}
                              >
                                <Send size={10} />{sentRequests[skill.id] ? 'Re-send' : 'Verify'}
                              </button>
                              <button
                                type="button"
                                onClick={() => isActive && actionType === 'reject' ? closeInline() : openInline(skill.id, 'reject')}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold font-inter transition-colors ${isActive && actionType === 'reject' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                              >
                                <XCircle size={10} />Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => isActive && actionType === 'approve' ? closeInline() : openInline(skill.id, 'approve')}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold font-inter transition-colors ${isActive && actionType === 'approve' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                              >
                                <CheckCircle size={10} />Approve
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => isActive ? closeInline() : openInline(skill.id, 'update')}
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold font-inter transition-colors ${isActive ? 'border-brand-blue bg-brand-blue text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-brand-dark'}`}
                            >
                              Update
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ── Inline action panel ── */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden border-t border-gray-100"
                          >
                            <div className="bg-gray-50 p-3.5 space-y-3">

                              {/* Verify panel */}
                              {actionType === 'verify' && (
                                <>
                                  <p className="text-xs font-semibold text-brand-dark font-inter">Send to third-party verifier</p>
                                  <input
                                    type="email"
                                    value={inlineEmail}
                                    onChange={(e) => setInlineEmail(e.target.value)}
                                    placeholder="verifier@university.com"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={inlineProcessing}
                                      onClick={() => handleInlineVerify(skill.id)}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-blue py-2 text-sm font-semibold text-white font-inter transition-opacity hover:opacity-90 disabled:opacity-50"
                                    >
                                      {inlineProcessing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                      {inlineProcessing ? 'Sending…' : 'Send Verification Request'}
                                    </button>
                                    <button type="button" onClick={closeInline} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 font-inter hover:bg-gray-50">
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              )}

                              {/* Reject panel */}
                              {actionType === 'reject' && (
                                <>
                                  <p className="text-xs font-semibold text-brand-dark font-inter">Reason for rejection <span className="text-red-500">*</span></p>
                                  <textarea
                                    value={inlineReason}
                                    onChange={(e) => setInlineReason(e.target.value)}
                                    rows={2}
                                    placeholder="Explain why this skill is being rejected…"
                                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-red-200"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={inlineProcessing}
                                      onClick={() => handleInlineStatus(skill.id, 'rejected')}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white font-inter transition-opacity hover:opacity-90 disabled:opacity-50"
                                    >
                                      {inlineProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                      {inlineProcessing ? 'Rejecting…' : 'Confirm Rejection'}
                                    </button>
                                    <button type="button" onClick={closeInline} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 font-inter hover:bg-gray-50">
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              )}

                              {/* Approve panel */}
                              {actionType === 'approve' && (
                                <>
                                  <p className="text-xs font-semibold text-brand-dark font-inter">Approve this skill? <span className="text-gray-400 font-normal">(add a note — optional)</span></p>
                                  <textarea
                                    value={inlineReason}
                                    onChange={(e) => setInlineReason(e.target.value)}
                                    rows={2}
                                    placeholder="e.g. Certificate verified successfully…"
                                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-green-200"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={inlineProcessing}
                                      onClick={() => handleInlineStatus(skill.id, 'verified')}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2 text-sm font-semibold text-white font-inter transition-opacity hover:opacity-90 disabled:opacity-50"
                                    >
                                      {inlineProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                      {inlineProcessing ? 'Approving…' : 'Confirm Approval'}
                                    </button>
                                    <button type="button" onClick={closeInline} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 font-inter hover:bg-gray-50">
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              )}

                              {/* Update panel (for already verified/rejected skills) */}
                              {actionType === 'update' && (
                                <>
                                  <p className="text-xs font-semibold text-brand-dark font-inter">Update status</p>
                                  <textarea
                                    value={inlineReason}
                                    onChange={(e) => setInlineReason(e.target.value)}
                                    rows={2}
                                    placeholder="Reason (optional)…"
                                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={inlineProcessing}
                                      onClick={() => handleInlineStatus(skill.id, 'rejected')}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-50 py-2 text-sm font-semibold text-red-600 font-inter transition-colors hover:bg-red-100 disabled:opacity-50"
                                    >
                                      {inlineProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      disabled={inlineProcessing}
                                      onClick={() => handleInlineStatus(skill.id, 'verified')}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-50 py-2 text-sm font-semibold text-green-600 font-inter transition-colors hover:bg-green-100 disabled:opacity-50"
                                    >
                                      {inlineProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                      Approve
                                    </button>
                                    <button type="button" onClick={closeInline} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 font-inter hover:bg-gray-50">
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              )}

                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── API #3: Individual Skills Modal ──────────────────────────────── */}
      <Modal
        isOpen={!!individualModal}
        onClose={() => { setIndividualModal(null); setIndividualSkills([]); }}
        title={`Skills — ${individualModal?.name || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-brand-blue/5 px-4 py-3">
            <User size={16} className="text-brand-blue shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-inter">Individual</p>
              <p className="text-sm font-semibold text-brand-dark font-inter truncate">{individualModal?.name}</p>
            </div>
            {!individualSkillsLoading && (
              <span className="ml-auto text-xs text-gray-400 font-inter shrink-0">
                {individualSkills.length} skill{individualSkills.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {individualSkillsLoading ? (
            <LoadingSkeleton variant="table" />
          ) : individualSkills.length === 0 ? (
            <div className="py-10 text-center">
              <LayoutList size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="font-sora font-semibold text-brand-dark">No skills found</p>
              <p className="text-sm text-gray-400 font-inter mt-1">This individual has no skills on record.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {individualSkills.map((sk, i) => {
                const b = statusBadgeMap(sk.status);
                const TypeIcon = typeIcons[sk.skill_type] || Code2;
                return (
                  <motion.div
                    key={sk.id || i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                      <TypeIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-brand-dark font-inter">{sk.skill_name}</p>
                        <Badge status={b.status}>{b.label}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 font-inter">
                          {typeLabels[sk.skill_type] || sk.skill_type}
                        </span>
                        {sk.institution_name && (
                          <span className="text-xs text-gray-400 font-inter">{sk.institution_name}</span>
                        )}
                        {sk.degree && (
                          <span className="text-xs text-gray-400 font-inter">{sk.degree}</span>
                        )}
                      </div>
                      {sk.skill_info && (
                        <p className="mt-1 text-xs text-gray-500 font-inter">{sk.skill_info}</p>
                      )}
                      {sk.status === 'rejected' && (sk.status_reason || sk.reason) && (
                        <p className="mt-1 text-xs text-red-500 font-inter">{sk.status_reason || sk.reason}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2 text-xs text-gray-400 font-inter">
                      {sk.documents?.length ? (
                        <span className="flex items-center gap-1 text-brand-blue">
                          <FileText size={12} />{sk.documents.length}
                        </span>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!verifyModal}
        onClose={() => {
          setVerifyModal(null);
          setVerifierEmail('');
        }}
        title={`Send for Verification - ${verifyModal?.skill_name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 font-inter">
            Send an email to a third-party verifier with a unique upload link. The verifier can upload
            verification documents without logging in.
          </p>

          <Input
            label="Verifier Email *"
            placeholder="e.g. verifier@university.com"
            value={verifierEmail}
            onChange={(e) => setVerifierEmail(e.target.value)}
            type="email"
          />

          <Modal.Footer><Button
            variant="primary"
            size="lg"
            className="w-full"
            icon={processing ? Loader2 : Send}
            onClick={handleSendVerification}
            disabled={processing}
          >
            {processing ? 'Sending...' : 'Send Verification Request'}
          </Button></Modal.Footer>
        </div>
      </Modal>
    </AuthLayout>
  );
};

export default SkillsManagement;
