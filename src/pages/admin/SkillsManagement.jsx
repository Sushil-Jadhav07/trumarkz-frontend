import React, { useState, useEffect, useRef } from 'react';
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
  const [actionModal, setActionModal] = useState(null);
  const [verifyModal, setVerifyModal] = useState(null);
  const [reason, setReason] = useState('');
  const [verifierEmail, setVerifierEmail] = useState('');
  const [processing, setProcessing] = useState(false);

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
      await skillsAPI.sendVerificationRequest(verifyModal.id, verifierEmail.trim());
      toast.success(`Verification request sent to ${verifierEmail}`);
      setVerifyModal(null);
      setVerifierEmail('');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send verification request'));
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = skills.filter((s) => s.status === 'pending').length;
  const verifiedCount = skills.filter((s) => s.status === 'verified').length;
  const rejectedCount = skills.filter((s) => s.status === 'rejected').length;

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
            <div className="grid gap-4 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {skills.map((skill, index) => {
                  const badge = statusBadgeMap(skill.status);
                  const TypeIcon = typeIcons[skill.skill_type] || Code2;
                  const details = skillDetails(skill);

                  return (
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                            <TypeIcon size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-brand-dark font-inter">{skill.skill_name}</p>
                            {(skill.individual_name || skill.individual_id) && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-gray-400 font-inter">
                                <User size={10} /> {skill.individual_name || skill.individual_id}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge status={badge.status}>{badge.label}</Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 font-inter">
                          {typeLabels[skill.skill_type] || skill.skill_type}
                        </span>
                        <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 font-inter">
                          {skill.documents?.length ? `${skill.documents.length} docs` : 'No docs'}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1">
                        {details.length > 0 ? (
                          details.map((detail) => (
                            <p key={detail} className="text-sm text-brand-dark font-inter">
                              {detail}
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-gray-300 font-inter">No extra details</p>
                        )}
                        {skill.status === 'rejected' && (skill.status_reason || skill.reason) && (
                          <p className="text-xs text-red-500 font-inter">{skill.status_reason || skill.reason}</p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center">
                        {skill.documents?.length ? (
                          <span className="flex items-center gap-1.5 text-sm text-brand-blue font-inter">
                            <FileText size={14} />
                            {skill.documents.length} file{skill.documents.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 font-inter">No docs</span>
                        )}
                      </div>

                      <div className="mt-auto pt-4">
                        {skill.status === 'pending' ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Button variant="ghost" size="sm" icon={Send} className="w-full" onClick={() => setVerifyModal(skill)}>
                              Verify
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={XCircle}
                              className="w-full"
                              onClick={() => {
                                setActionModal(skill);
                                setReason('');
                              }}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="success"
                              size="sm"
                              icon={CheckCircle}
                              className="w-full"
                              onClick={() => {
                                setActionModal(skill);
                                setReason('');
                              }}
                            >
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setActionModal(skill);
                              setReason('');
                            }}
                          >
                            Update
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
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
