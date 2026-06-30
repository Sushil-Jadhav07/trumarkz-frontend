import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { skillsAPI, getApiError } from '@/services/api';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const docLabelOptions = [
  { value: 'certificate', label: 'Certificate' },
  { value: 'marksheet', label: 'Marksheet' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'experience_letter', label: 'Experience Letter' },
  { value: 'project_report', label: 'Project Report' },
  { value: 'other', label: 'Other' },
];

const sectionConfig = {
  education: {
    label: 'Education',
    fields: [
      { key: 'skill_name', label: 'Level / Type', placeholder: 'e.g. 10th, 12th, B.Tech, MBA', required: true },
      { key: 'institution_name', label: 'Institution Name', placeholder: 'e.g. IIT Delhi, Mumbai University', required: true },
      { key: 'degree', label: 'Degree / Stream', placeholder: 'e.g. Computer Science, Commerce' },
      { key: 'skill_info', label: 'Additional Info', placeholder: 'e.g. Year of passing, percentage' },
    ],
  },
  technical: {
    label: 'Technical Skill',
    fields: [
      { key: 'skill_name', label: 'Skill Name', placeholder: 'e.g. Python, React, AWS', required: true },
      { key: 'skill_info', label: 'Experience / Details', placeholder: 'e.g. 3 years experience, Advanced level' },
    ],
  },
  soft: {
    label: 'Soft Skill',
    fields: [
      { key: 'skill_name', label: 'Skill Name', placeholder: 'e.g. Leadership, Communication', required: true },
      { key: 'skill_info', label: 'Details', placeholder: 'e.g. Led a team of 10 members' },
    ],
  },
  project: {
    label: 'Project',
    fields: [
      { key: 'skill_name', label: 'Project Name', placeholder: 'e.g. E-commerce Platform', required: true },
      { key: 'skill_info', label: 'Description', placeholder: 'e.g. Built a full-stack web application' },
    ],
  },
};

export const SkillTreeForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'education';
  const skillId = searchParams.get('id');
  const isEditMode = !!skillId;
  const config = sectionConfig[section] || sectionConfig.education;

  const [form, setForm] = useState({ skill_type: section });
  const [files, setFiles] = useState([]);
  const [docLabel, setDocLabel] = useState('certificate');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSkill, setLoadingSkill] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isEditMode) return;

    const loadSkill = async () => {
      setLoadingSkill(true);
      try {
        const res = await skillsAPI.getMySkills();
        const currentSkill = (res.data.skills || []).find((skill) => skill.id === skillId);
        if (!currentSkill) {
          toast.error('Skill not found');
          navigate('/individual/skill-tree');
          return;
        }

        setForm({
          skill_type: currentSkill.skill_type || section,
          skill_name: currentSkill.skill_name || '',
          skill_info: currentSkill.skill_info || '',
          institution_name: currentSkill.institution_name || '',
          degree: currentSkill.degree || '',
        });
      } catch (err) {
        toast.error(getApiError(err, 'Failed to load skill'));
      } finally {
        setLoadingSkill(false);
      }
    };

    loadSkill();
  }, [isEditMode, navigate, section, skillId]);

  const handleFilesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) setFiles((prev) => [...prev, ...selected]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileRemove = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const requiredFields = config.fields.filter((field) => field.required);
    for (const field of requiredFields) {
      if (!form[field.key]?.trim()) {
        toast.error(`Please fill in ${field.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        skill_name: form.skill_name?.trim(),
        skill_info: form.skill_info?.trim() || undefined,
        institution_name: form.institution_name?.trim() || undefined,
        degree: form.degree?.trim() || undefined,
      };

      if (isEditMode) {
        await skillsAPI.editSkill(skillId, payload);
        toast.success('Skill updated successfully');
      } else {
        await skillsAPI.addSkill({
          skill_type: section,
          ...payload,
          document_label: files.length > 0 ? docLabel.trim() || 'certificate' : undefined,
          files: files.length > 0 ? files : undefined,
        });
        toast.success('Skill submitted for verification');
      }

      navigate('/individual/skill-tree');
    } catch (err) {
      toast.error(getApiError(err, isEditMode ? 'Failed to update skill' : 'Failed to add skill'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSkill) {
    return (
      <AuthLayout title={`Edit ${config.label}`}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand-blue" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={`${isEditMode ? 'Edit' : 'Add'} ${config.label}`}>
      <div className="w-full max-w-lg mx-auto lg:max-w-none">
        <button
          onClick={() => navigate('/individual/skill-tree')}
          className="mb-4 flex items-center gap-1 text-sm text-brand-blue font-inter hover:underline"
        >
          <ArrowLeft size={14} /> Back to Skill Tree
        </button>

        <PageHeader
          title={`${isEditMode ? 'Edit' : 'Add'} ${config.label}`}
          subtitle={
            isEditMode
              ? 'Update your skill details. Status will reset to pending after edit.'
              : 'Fill in the details and upload your document for verification'
          }
        />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="space-y-4 p-6">
            {config.fields.map((field) => (
              <Input
                key={field.key}
                label={`${field.label}${field.required ? ' *' : ''}`}
                placeholder={field.placeholder}
                value={form[field.key] || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            ))}

            {!isEditMode && (
              <>
                <div ref={dropdownRef} className="relative">
                  <label className="block mb-1.5 text-sm font-medium text-brand-dark font-inter">
                    Document Label
                  </label>
                  <div
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 font-inter text-sm transition-all duration-200 ${
                      dropdownOpen ? 'border-brand-blue ring-4 ring-brand-blue/10' : 'border-brand-gray hover:border-gray-400'
                    }`}
                  >
                    <span className="text-brand-dark">
                      {docLabelOptions.find((option) => option.value === docLabel)?.label || 'Select'}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </div>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                      >
                        {docLabelOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setDocLabel(option.value);
                              setDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-inter transition-colors ${
                              docLabel === option.value
                                ? 'bg-brand-blue/5 font-medium text-brand-blue'
                                : 'text-brand-dark hover:bg-gray-50'
                            }`}
                          >
                            <span>{option.label}</span>
                            {docLabel === option.value && <Check size={14} className="text-brand-blue" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-brand-dark font-inter">
                    Upload Documents (optional)
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFilesChange}
                    className="hidden"
                    id="skill-file-input"
                  />

                  {files.length > 0 && (
                    <div className="mb-3 space-y-2">
                      <AnimatePresence>
                        {files.map((file, i) => (
                          <motion.div
                            key={`${file.name}-${i}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-3 rounded-xl border-2 border-brand-blue bg-brand-blue/5 p-3"
                          >
                            <div className="rounded-lg bg-brand-blue/10 p-1.5">
                              <FileText size={18} className="text-brand-blue" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-brand-dark font-inter">{file.name}</p>
                              <p className="text-xs text-gray-500 font-inter">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFileRemove(i)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  <label
                    htmlFor="skill-file-input"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-gray p-6 transition-all duration-200 hover:border-brand-blue hover:bg-gray-50"
                  >
                    {files.length === 0 ? (
                      <>
                        <div className="rounded-full bg-gray-100 p-3">
                          <Upload size={22} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-brand-dark font-inter">Click to upload documents</p>
                        <p className="text-xs text-gray-400 font-inter">
                          PDF, JPG or PNG - Multiple files allowed. Max 5 MB each.
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 py-1">
                        <Plus size={16} className="text-brand-blue" />
                        <span className="text-sm font-medium text-brand-blue font-inter">Add more documents</span>
                      </div>
                    )}
                  </label>

                  <p className="mt-1.5 text-xs text-gray-400 font-inter">
                    {files.length > 0
                      ? `${files.length} file${files.length !== 1 ? 's' : ''} selected. Documents will be reviewed by our verification team.`
                      : 'Documents will be reviewed by our verification team.'}
                  </p>
                </div>
              </>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              icon={submitting ? Loader2 : ArrowRight}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (isEditMode ? 'Updating...' : 'Submitting...') : isEditMode ? 'Update Skill' : 'Submit for Verification'}
            </Button>
          </Card>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default SkillTreeForm;
