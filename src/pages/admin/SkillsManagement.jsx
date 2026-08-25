import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { skillsAPI, getApiError } from '@/services/api';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  Filter,
  GraduationCap,
  Code2,
  Heart,
  FolderKanban,
  FileText,
  User,
  Loader2,
  ChevronDown,
  Check,
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

const FilterDropdown = ({ value, onChange, options, width = 'w-36' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={ref} className={`relative ${width}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-sm font-inter transition-all duration-200 ${
          open ? 'border-brand-blue ring-3 ring-brand-blue/10' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className="truncate text-brand-dark">{selected.label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm font-inter transition-colors ${
                  value === opt.value
                    ? 'bg-brand-blue/5 font-medium text-brand-blue'
                    : 'text-brand-dark hover:bg-gray-50'
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check size={13} className="text-brand-blue" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

  // Always derived from live skills — updates automatically after approve/reject
  const reviewGroup = useMemo(
    () => (reviewIndividualId ? (groupedByIndividual.find((g) => g.individual_id === reviewIndividualId) ?? null) : null),
    [groupedByIndividual, reviewIndividualId]
  );


  return (
    <AuthLayout title="Skills Management">
      <PageHeader
        title="Skills Management"
        subtitle="Review, verify, and manage skills submitted by individuals"
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending Review', value: pendingCount, icon: Clock, surface: 'bg-orange-50', text: 'text-orange-600' },
          { label: 'Verified', value: verifiedCount, icon: CheckCircle, surface: 'bg-green-50', text: 'text-green-600' },
          { label: 'Rejected', value: rejectedCount, icon: XCircle, surface: 'bg-red-50', text: 'text-red-500' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 font-inter">{stat.label}</p>
                  <p className="mt-1 font-sora text-2xl font-bold text-brand-dark">{stat.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.surface}`}>
                  <Icon size={20} className={stat.text} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card className="overflow-hidden border border-gray-100 p-0">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <h3 className="font-sora text-brand-dark font-semibold">All Skills</h3>
              <Badge status="info">{skills.length} Total</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterDropdown value={filterStatus} onChange={setFilterStatus} options={statusOptions} width="w-36" />
              <FilterDropdown value={filterType} onChange={setFilterType} options={typeOptions} width="w-36" />
              <button
                type="button"
                onClick={fetchSkills}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-blue"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="md" />
            </div>
          ) : skills.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle size={40} className="mx-auto mb-3 text-green-500" />
              <p className="font-sora font-semibold text-brand-dark">No skills found</p>
              <p className="text-sm text-gray-400 font-inter">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 sm:p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {groupedByIndividual.map((group, gi) => {
                const pendingG  = group.skills.filter((s) => s.status === 'pending').length;
                const verifiedG = group.skills.filter((s) => s.status === 'verified').length;
                const rejectedG = group.skills.filter((s) => s.status === 'rejected').length;

                return (
                  <motion.div
                    key={group.individual_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.04 }}
                    className="flex flex-col rounded-xl border border-gray-100 bg-white p-4"
                  >
                    {/* Individual identity */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                        <User size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {group.individual_name && (
                          <p className="truncate text-sm font-semibold text-brand-dark font-inter">{group.individual_name}</p>
                        )}
                        <p className="truncate text-xs text-gray-400 font-mono">{group.individual_id}</p>
                      </div>
                    </div>

                    {/* Skill count stats */}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center rounded-xl bg-orange-50 py-3">
                        <p className="font-sora text-xl font-bold text-orange-500">{pendingG}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-orange-400 font-inter">Pending</p>
                      </div>
                      <div className="flex flex-col items-center rounded-xl bg-green-50 py-3">
                        <p className="font-sora text-xl font-bold text-green-600">{verifiedG}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-green-500 font-inter">Verified</p>
                      </div>
                      <div className="flex flex-col items-center rounded-xl bg-red-50 py-3">
                        <p className="font-sora text-xl font-bold text-red-500">{rejectedG}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-red-400 font-inter">Rejected</p>
                      </div>
                    </div>

                    <p className="mt-3 text-center text-[11px] text-gray-400 font-inter">
                      {group.skills.length} skill{group.skills.length !== 1 ? 's' : ''} total
                    </p>

                    {/* CTA */}
                    <div className="mt-auto pt-4">
                      <button
                        type="button"
                        onClick={() => setReviewIndividualId(group.individual_id)}
                        className="w-full rounded-xl bg-brand-blue py-2.5 text-sm font-semibold text-white font-inter transition-opacity hover:opacity-90"
                      >
                        View Skills
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>

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

          <div className="flex gap-3">
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
          </div>
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
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
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

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            icon={processing ? Loader2 : Send}
            onClick={handleSendVerification}
            disabled={processing}
          >
            {processing ? 'Sending...' : 'Send Verification Request'}
          </Button>
        </div>
      </Modal>
    </AuthLayout>
  );
};

export default SkillsManagement;
