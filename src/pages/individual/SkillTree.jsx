import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageIntro } from '@/components/shared/AdminPageParts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FileUpload } from '@/components/ui/FileUpload';
import { Input } from '@/components/ui/Input';
import { skillsAPI, getApiError } from '@/services/api';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Share2,
  ShieldCheck,
  ExternalLink,
  FileText,
  FolderKanban,
  GraduationCap,
  Heart,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';

const sections = [
  { key: 'education', label: 'Education', itemLabel: 'Education', addLabel: 'Add education', icon: GraduationCap },
  { key: 'technical', label: 'Technical skills', itemLabel: 'Technical skill', addLabel: 'Add skill', icon: Code2 },
  { key: 'soft', label: 'Soft skills', itemLabel: 'Soft skill', addLabel: 'Add soft skill', icon: Heart },
  { key: 'project', label: 'Projects', itemLabel: 'Project', addLabel: 'Add project', icon: FolderKanban },
];

const STATUS_PILL = {
  verified: { label: 'Verified', icon: CheckCircle2, tone: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rejected', icon: XCircle, tone: 'bg-red-50 text-red-600' },
  pending: { label: 'Pending', icon: Clock, tone: 'bg-orange-100 text-orange-700' },
};

const statusPill = (status) => STATUS_PILL[status] || STATUS_PILL.pending;

export const SkillTree = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [individualId, setIndividualId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState(null); // null = the first category that has entries
  const [uploadModal, setUploadModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [docsModalId, setDocsModalId] = useState(null); // id of the skill whose documents are being viewed
  const [docToDelete, setDocToDelete] = useState(null); // { skillId, doc }
  const [docFile, setDocFile] = useState(null);
  const [docLabel, setDocLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);

  const fetchSkills = async () => {
    try {
      const res = await skillsAPI.getMySkills();
      setIndividualId(res.data.individual_id || '');
      setSkills(res.data.skills || []);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load skills'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleUploadDoc = async () => {
    if (!docLabel.trim()) {
      toast.error('Please enter a document label');
      return;
    }
    if (!docFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      await skillsAPI.uploadDocument(uploadModal.id, docLabel.trim(), docFile);
      toast.success('Document uploaded successfully');
      setUploadModal(null);
      setDocFile(null);
      setDocLabel('');
      fetchSkills();
    } catch (err) {
      toast.error(getApiError(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSkill = async () => {
    if (!deleteModal) return;

    setDeleting(true);
    try {
      await skillsAPI.deleteSkill(deleteModal.id);
      toast.success('Skill deleted successfully');
      setDeleteModal(null);
      fetchSkills();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to delete skill'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSkillDocument = async () => {
    if (!docToDelete) return;
    setDeletingDoc(true);
    try {
      await skillsAPI.deleteDocument(docToDelete.skillId, docToDelete.doc.id);
      toast.success('Document deleted');
      setDocToDelete(null);
      fetchSkills();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to delete document'));
    } finally {
      setDeletingDoc(false);
    }
  };

  const handleDeleteAllSkills = async () => {
    if (!individualId) {
      toast.error('Individual id missing. Refresh and try again.');
      return;
    }

    setDeleting(true);
    try {
      await skillsAPI.deleteAllSkills(individualId);
      toast.success('All skills deleted successfully');
      setDeleteAllModal(false);
      fetchSkills();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to delete all skills'));
    } finally {
      setDeleting(false);
    }
  };

  const docsModalSkill = docsModalId ? skills.find((s) => s.id === docsModalId) || null : null;

  const grouped = {};
  sections.forEach((section) => {
    grouped[section.key] = [];
  });
  skills.forEach((skill) => {
    if (grouped[skill.skill_type]) grouped[skill.skill_type].push(skill);
  });

  const verifiedCount = skills.filter((skill) => skill.status === 'verified').length;
  const pendingCount = skills.filter((skill) => skill.status === 'pending').length;

  const current = sections.find((section) => section.key === activeKey)
    || sections.find((section) => (grouped[section.key] || []).length > 0)
    || sections[0];
  const currentItems = grouped[current.key] || [];

  if (loading) {
    return (
      <AuthLayout title="My Skill Tree">
        <LoadingSkeleton variant="detail" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="My Skill Tree">
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro
          title="My Skill Tree"
          subtitle="Build and manage your verifiable digital resume."
          actions={(
            <>
              {skills.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDeleteAllModal(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 font-inter"
                >
                  <Trash2 size={16} /> Delete all
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/individual/share')}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover font-inter"
              >
                <Share2 size={16} /> Share profile
              </button>
            </>
          )}
        />

        {/* Totals */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-6 py-5 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]">
          <svg aria-hidden="true" className="pointer-events-none absolute right-6 top-1/2 hidden h-16 w-28 -translate-y-1/2 sm:block" viewBox="0 0 112 64" fill="#fff" fillOpacity="0.4">
            {Array.from({ length: 5 }).flatMap((_, row) => Array.from({ length: 8 }).map((__, col) => <circle key={`${row}-${col}`} cx={4 + col * 14} cy={4 + row * 14} r="1.6" />))}
          </svg>
          <dl className="relative grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/25">
            {[
              { label: 'Total skills', value: skills.length, icon: Layers },
              { label: 'Verified', value: verifiedCount, icon: ShieldCheck },
              { label: 'Pending', value: pendingCount, icon: Clock },
            ].map((stat, i) => (
              <div key={stat.label} className={`flex items-center gap-5 ${i > 0 ? 'sm:pl-12' : 'sm:pl-4'}`}>
                <stat.icon size={40} strokeWidth={1.4} className="shrink-0" />
                <div>
                  <dt className="text-sm text-white/95 font-inter">{stat.label}</dt>
                  <dd className="font-sora text-3xl font-bold leading-tight">{stat.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
          {/* Categories */}
          <section aria-label="Your categories" className="rounded-xl border border-gray-100 bg-white p-4">
            <h2 className="px-1 font-sora text-lg font-semibold text-brand-dark">Your categories</h2>
            <div role="tablist" aria-label="Skill categories" aria-orientation="vertical" className="mt-3 divide-y divide-gray-100">
              {sections.map((section) => {
                const on = section.key === current.key;
                const count = (grouped[section.key] || []).length;
                const SectionIcon = section.icon;
                return (
                  <button
                    key={section.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActiveKey(section.key)}
                    className={`relative flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors ${on ? 'rounded-lg bg-[#eaf1fe]' : 'hover:bg-gray-50'}`}
                  >
                    {on && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-brand-blue" />}
                    <SectionIcon size={26} strokeWidth={1.4} className="shrink-0 text-brand-blue" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-brand-dark font-inter">{section.label}</span>
                      <span className="block text-[13px] text-gray-600 font-inter">{count} {count === 1 ? 'entry' : 'entries'}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-gray-500" />
                  </button>
                );
              })}
            </div>
            <div className="mt-4 border-t border-gray-100 px-1 pt-4">
              <p className="text-[15px] font-semibold text-brand-dark font-inter">Build your digital resume</p>
              <p className="mt-0.5 text-[13px] text-gray-600 font-inter">Add entries to each category.</p>
            </div>
          </section>

          {/* Selected category */}
          <section aria-label={current.label} className="min-w-0 rounded-xl border border-gray-100 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><current.icon size={22} strokeWidth={1.6} /></span>
                <div>
                  <h2 className="flex items-center gap-2.5 font-sora text-lg font-semibold text-brand-dark">
                    {current.label}
                    <span className="rounded-full bg-[#e3ebf8] px-2.5 py-0.5 text-xs font-medium text-brand-blue font-inter">{currentItems.length} {currentItems.length === 1 ? 'entry' : 'entries'}</span>
                  </h2>
                  <p className="mt-0.5 text-[13px] text-gray-500 font-inter">Manage your skills and supporting documents.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/individual/skill-tree/build?section=${current.key}`)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-blue px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover font-inter"
              >
                <Plus size={17} /> {current.addLabel}
              </button>
            </div>

            {currentItems.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <p className="text-sm text-gray-500 font-inter">No {current.label.toLowerCase()} added yet.</p>
                <button
                  type="button"
                  onClick={() => navigate(`/individual/skill-tree/build?section=${current.key}`)}
                  className="mt-2 text-sm font-semibold text-brand-blue hover:underline font-inter"
                >
                  Add your first
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {currentItems.map((item, itemIndex) => {
                  const pill = statusPill(item.status);
                  const rejectedReason = item.status_reason || item.reason;
                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: itemIndex * 0.04 }}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start gap-4">
                        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><current.icon size={22} strokeWidth={1.6} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold leading-tight text-brand-dark font-inter">{item.skill_name}</p>
                          <p className="mt-0.5 text-[13px] text-gray-600 font-inter">{current.itemLabel}</p>
                          <p className="mt-1.5 text-[13px] text-gray-700 font-inter">
                            {[item.institution_name && (item.degree ? `${item.institution_name} - ${item.degree}` : item.institution_name), item.skill_info].filter(Boolean).join(' · ') || 'No details specified'}
                          </p>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium font-inter ${pill.tone}`}>
                          <pill.icon size={17} />{pill.label}
                        </span>
                      </div>

                      {item.status === 'rejected' && rejectedReason && (
                        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5">
                          <XCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                          <p className="text-xs text-red-600 font-inter">{rejectedReason}</p>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setUploadModal(item)}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-blue/70 bg-white px-4 text-sm font-medium text-brand-blue transition-colors hover:bg-blue-50 font-inter"
                          >
                            <Upload size={16} /> Upload document
                          </button>
                          {item.documents && item.documents.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDocsModalId(item.id)}
                              className="inline-flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-brand-blue hover:underline font-inter"
                            >
                              <FileText size={14} />
                              {item.documents.length} doc{item.documents.length !== 1 ? 's' : ''}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/individual/skill-tree/build?section=${item.skill_type}&id=${item.id}`)}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c7d8f5] bg-[#f3f7fe] px-5 text-sm font-medium text-brand-dark transition-colors hover:bg-blue-50 font-inter"
                          >
                            <Pencil size={16} className="text-brand-blue" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModal(item)}
                            aria-label={`Delete ${item.skill_name}`}
                            title="Delete"
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Quick add */}
        <div className="flex flex-col gap-3 rounded-xl bg-[#e9f0fb] px-6 py-4 font-inter lg:flex-row lg:items-center lg:gap-0 lg:divide-x lg:divide-[#b9c9e6]">
          <p className="text-lg font-semibold text-brand-dark lg:pr-8">Add to your profile</p>
          {[
            { key: 'education', label: 'Add education', icon: GraduationCap },
            { key: 'soft', label: 'Add soft skill', icon: Heart },
            { key: 'project', label: 'Add project', icon: FolderKanban },
          ].map((link) => (
            <button
              key={link.key}
              type="button"
              onClick={() => navigate(`/individual/skill-tree/build?section=${link.key}`)}
              className="flex flex-1 items-center justify-center gap-3 py-1 text-[15px] font-medium text-brand-blue transition-colors hover:text-blue-800 lg:px-6"
            >
              <link.icon size={24} strokeWidth={1.4} />{link.label}<ArrowRight size={17} />
            </button>
          ))}
        </div>
      </div>

      <Modal
        isOpen={!!uploadModal}
        onClose={() => {
          setUploadModal(null);
          setDocFile(null);
          setDocLabel('');
        }}
        title={`Upload Document - ${uploadModal?.skill_name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Document Label"
            placeholder="e.g. certificate, marksheet, report"
            value={docLabel}
            onChange={(e) => setDocLabel(e.target.value)}
          />
          <div>
            <label className="block mb-1.5 text-sm font-medium text-brand-dark font-inter">Select File</label>
            <FileUpload
              label="Upload supporting document"
              accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] }}
              selectedFile={docFile}
              onFileSelect={setDocFile}
              onRemove={() => setDocFile(null)}
            />
          </div>
          <Modal.Footer><Button
            variant="primary"
            size="lg"
            className="w-full"
            icon={Upload}
            onClick={handleUploadDoc}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button></Modal.Footer>
        </div>
      </Modal>

      <Modal
        isOpen={!!docsModalSkill}
        onClose={() => setDocsModalId(null)}
        title={`Documents - ${docsModalSkill?.skill_name || ''}`}
        size="md"
      >
        <div className="space-y-3">
          {(docsModalSkill?.documents || []).length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400 font-inter">No documents left on this skill.</p>
          ) : (
            (docsModalSkill?.documents || []).map((doc, i) => (
              <div
                key={doc.id || `${doc.document_label}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText size={15} className="shrink-0 text-gray-400" />
                  <p className="truncate text-sm font-medium text-brand-dark font-inter capitalize">
                    {doc.document_label || doc.label || `Document ${i + 1}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(doc.document_url || doc.url) && (
                    <a
                      href={doc.document_url || doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-blue hover:text-blue-700 transition-colors"
                      title="View document"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {doc.id && (
                    <button
                      type="button"
                      onClick={() => setDocToDelete({ skillId: docsModalSkill.id, doc })}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <Modal.Footer><Button
            variant="ghost"
            size="sm"
            icon={Upload}
            className="w-full"
            onClick={() => {
              setDocsModalId(null);
              setUploadModal(docsModalSkill);
            }}
          >
            Upload Another
          </Button></Modal.Footer>
        </div>
      </Modal>

      <Modal
        isOpen={!!docToDelete}
        onClose={deletingDoc ? undefined : () => setDocToDelete(null)}
        title="Delete Document"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-600 font-inter">
              <span className="font-medium capitalize">{docToDelete?.doc?.document_label || docToDelete?.doc?.label || 'This document'}</span> will be permanently deleted. This cannot be undone.
            </p>
          </div>
          <Modal.Footer className="flex gap-3">
            <Button variant="ghost" size="lg" className="flex-1" onClick={() => setDocToDelete(null)} disabled={deletingDoc}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              icon={deletingDoc ? RefreshCw : Trash2}
              onClick={handleDeleteSkillDocument}
              disabled={deletingDoc}
            >
              {deletingDoc ? 'Deleting...' : 'Delete'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title={`Delete Skill - ${deleteModal?.skill_name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-600 font-inter">
              This will permanently remove this skill from your profile.
            </p>
          </div>

          <Modal.Footer className="flex gap-3">
            <Button variant="ghost" size="lg" className="flex-1" onClick={() => setDeleteModal(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              icon={Trash2}
              onClick={handleDeleteSkill}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      <Modal
        isOpen={deleteAllModal}
        onClose={() => setDeleteAllModal(false)}
        title="Delete Entire Skill Tree"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-600 font-inter">
              This will permanently delete all skills from your profile. This action cannot be undone.
            </p>
          </div>

          <Modal.Footer className="flex gap-3">
            <Button variant="ghost" size="lg" className="flex-1" onClick={() => setDeleteAllModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              icon={Trash2}
              onClick={handleDeleteAllSkills}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete All'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </AuthLayout>
  );
};

export default SkillTree;
