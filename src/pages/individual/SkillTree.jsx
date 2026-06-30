import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FileUpload } from '@/components/ui/FileUpload';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { skillsAPI, getApiError } from '@/services/api';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Code2,
  FileText,
  FolderKanban,
  GraduationCap,
  Heart,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';

const sections = [
  { key: 'education', label: 'Education', icon: GraduationCap, color: 'text-brand-blue', bg: 'bg-blue-50' },
  { key: 'technical', label: 'Technical Skills', icon: Code2, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'soft', label: 'Soft Skills', icon: Heart, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'project', label: 'Projects', icon: FolderKanban, color: 'text-orange-500', bg: 'bg-orange-50' },
];

const statusBadge = (status) => {
  if (status === 'verified') return { status: 'verified', label: 'Verified' };
  if (status === 'rejected') return { status: 'failed', label: 'Rejected' };
  return { status: 'pending', label: 'Pending' };
};

export const SkillTree = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [individualId, setIndividualId] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [docLabel, setDocLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const grouped = {};
  sections.forEach((section) => {
    grouped[section.key] = [];
  });
  skills.forEach((skill) => {
    if (grouped[skill.skill_type]) grouped[skill.skill_type].push(skill);
  });

  const verifiedCount = skills.filter((skill) => skill.status === 'verified').length;
  const pendingCount = skills.filter((skill) => skill.status === 'pending').length;

  if (loading) {
    return (
      <AuthLayout title="My Skill Tree">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="My Skill Tree">
      <div className="w-full mx-auto lg:max-w-none space-y-6">
        <PageHeader
          title="My Skill Tree"
          subtitle="Your verified digital resume - every skill is tracked and verifiable"
          action={
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 && (
                <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleteAllModal(true)}>
                  Delete All
                </Button>
              )}
              <Button variant="primary" size="sm" icon={ArrowRight} onClick={() => navigate('/individual/share')}>
                Share
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-blue/10">
                <Layers size={18} className="text-brand-blue" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-inter">Total Skills</p>
                <p className="text-xl font-sora font-bold text-brand-dark">{skills.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-inter">Verified</p>
                <p className="text-xl font-sora font-bold text-brand-dark">{verifiedCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-inter">Pending</p>
                <p className="text-xl font-sora font-bold text-brand-dark">{pendingCount}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {sections.map((section, sectionIndex) => {
            const items = grouped[section.key] || [];
            const Icon = section.icon;

            return (
              <motion.div
                key={section.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectionIndex * 0.08 }}
              >
                <Card className="p-5 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${section.bg}`}>
                        <Icon size={18} className={section.color} />
                      </div>
                      <div>
                        <h3 className="font-sora font-semibold text-brand-dark">{section.label}</h3>
                        <p className="text-xs text-gray-500 font-inter">{items.length} entries</p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Plus}
                      onClick={() => navigate(`/individual/skill-tree/build?section=${section.key}`)}
                    >
                      Add
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-sm text-gray-400 font-inter">No {section.label.toLowerCase()} added yet</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Plus}
                        className="mt-2"
                        onClick={() => navigate(`/individual/skill-tree/build?section=${section.key}`)}
                      >
                        Add your first
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item, itemIndex) => {
                        const badge = statusBadge(item.status);
                        const rejectedReason = item.status_reason || item.reason;

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: itemIndex * 0.04 }}
                            className="flex items-start justify-between gap-3 rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-medium leading-tight text-brand-dark font-inter">
                                {item.skill_name}
                              </p>

                              {item.skill_info && (
                                <p className="mt-1 text-sm text-gray-500 font-inter">{item.skill_info}</p>
                              )}

                              {item.institution_name && (
                                <p className="mt-1 text-sm text-gray-500 font-inter">
                                  {item.institution_name}
                                  {item.degree ? ` - ${item.degree}` : ''}
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap items-center gap-3">
                                {item.documents && item.documents.length > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400 font-inter">
                                    <FileText size={11} />
                                    {item.documents.length} doc{item.documents.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setUploadModal(item)}
                                  className="flex items-center gap-1 text-xs text-brand-blue hover:underline font-inter"
                                >
                                  <Upload size={11} />
                                  Upload Doc
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/individual/skill-tree/build?section=${item.skill_type}&id=${item.id}`)}
                                  className="flex items-center gap-1 text-xs text-brand-blue hover:underline font-inter"
                                >
                                  <Pencil size={11} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteModal(item)}
                                  className="flex items-center gap-1 text-xs text-red-500 hover:underline font-inter"
                                >
                                  <Trash2 size={11} />
                                  Delete
                                </button>
                              </div>

                              {item.status === 'rejected' && rejectedReason && (
                                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 p-2">
                                  <XCircle size={12} className="mt-0.5 shrink-0 text-red-500" />
                                  <p className="text-xs text-red-600 font-inter">{rejectedReason}</p>
                                </div>
                              )}
                            </div>

                            <Badge status={badge.status} className="mt-0.5 shrink-0">
                              {badge.label}
                            </Badge>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
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
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            icon={Upload}
            onClick={handleUploadDoc}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
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

          <div className="flex gap-3">
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
          </div>
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

          <div className="flex gap-3">
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
          </div>
        </div>
      </Modal>
    </AuthLayout>
  );
};

export default SkillTree;
