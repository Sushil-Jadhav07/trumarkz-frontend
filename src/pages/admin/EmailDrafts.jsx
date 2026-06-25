import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { verificationAPI, getApiError } from '@/services/api';
import {
  Mail, Plus, Pencil, Trash2, RefreshCw, FileText,
  ChevronDown, AlertTriangle, Save, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type selector dropdown ─────────────────────────────────────────────────────
const TypeSelector = ({ value, onChange, types, loading }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selected = types.find((t) => t.name === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 transition-all font-inter text-sm bg-white ${open ? 'border-brand-blue ring-4 ring-brand-blue/10' : 'border-gray-200 hover:border-gray-300'} disabled:opacity-60`}
      >
        <span className={value ? 'text-brand-dark font-medium' : 'text-gray-400'}>
          {loading ? 'Loading types…' : (selected?.name || 'Select verification type…')}
        </span>
        {loading
          ? <RefreshCw size={14} className="text-gray-400 animate-spin" />
          : <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        }
      </button>
      {open && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-30 top-full mt-1.5 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto"
        >
          {types.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 font-inter">No manual verification types found</p>
          ) : types.map((t) => (
            <button
              key={t.id || t.name}
              type="button"
              onClick={() => { onChange(t.name); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 font-inter text-sm transition-colors ${t.name === value ? 'bg-brand-blue/5 text-brand-blue font-medium' : 'text-brand-dark hover:bg-gray-50'}`}
            >
              {t.name}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// ── Draft form modal ───────────────────────────────────────────────────────────
const DraftModal = ({ isOpen, onClose, verificationType, draft, onSuccess }) => {
  const isEdit = !!draft;
  const [form, setForm] = useState({ subject: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (draft) {
      setForm({ subject: draft.subject || '', body: draft.body || '' });
    } else {
      setForm({ subject: '', body: '' });
    }
    setErrors({});
  }, [draft, isOpen]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.subject.trim()) errs.subject = 'Subject is required';
    if (!form.body.trim()) errs.body = 'Body is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      if (isEdit) {
        await verificationAPI.updateEmailDraft(draft.id, { subject: form.subject.trim(), body: form.body.trim() });
        toast.success('Draft updated');
      } else {
        await verificationAPI.createEmailDraft({
          verification_type: verificationType,
          subject: form.subject.trim(),
          body: form.body.trim(),
        });
        toast.success('Draft created');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, `Failed to ${isEdit ? 'update' : 'create'} draft`));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title={isEdit ? 'Edit Email Draft' : 'Create Email Draft'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 font-inter text-xs text-brand-blue">
          Verification type: <span className="font-semibold">{verificationType}</span>
        </div>

        <Input
          label={<>Subject <span className="text-red-500">*</span></>}
          placeholder="e.g. Verification request for batch #123"
          value={form.subject}
          onChange={set('subject')}
          error={errors.subject}
        />

        <div>
          <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
            Email Body <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={6}
            value={form.body}
            onChange={set('body')}
            placeholder="Write the email body here. You can use {{verifier_name}}, {{batch_id}}, {{verification_link}} as placeholders."
            className={`w-full rounded-xl border-2 px-4 py-3 font-inter text-sm text-brand-dark outline-none transition-all resize-none ${errors.body ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10'}`}
          />
          {errors.body && <p className="mt-1 text-xs text-red-500 font-inter">{errors.body}</p>}
          <p className="mt-1.5 text-xs text-gray-400 font-inter">
            Use placeholders: {'{'}{'{'} verifier_name {'}'}{'}'}, {'{'}{'{'} batch_id {'}'}{'}'}, {'{'}{'{'} verification_link {'}'}{'}'}
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-medium font-inter hover:bg-brand-blue/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Draft')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ── Delete confirm modal ───────────────────────────────────────────────────────
const DeleteModal = ({ isOpen, onClose, draft, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await verificationAPI.deleteEmailDraft(draft.id);
      toast.success('Draft deleted');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to delete draft'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title="" size="sm">
      {draft && (
        <div className="space-y-5 pt-2">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-brand-dark font-sora">Delete Draft?</p>
              <p className="text-sm text-gray-500 font-inter mt-1 leading-5">
                "<span className="font-medium text-brand-dark">{draft.subject}</span>" will be permanently deleted.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={handleDelete} disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium font-inter hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {submitting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Draft card ─────────────────────────────────────────────────────────────────
const DraftCard = ({ draft, index, onEdit, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="relative rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_8px_24px_-16px_rgba(37,99,235,0.18)] hover:shadow-[0_16px_32px_-20px_rgba(37,99,235,0.25)] transition-shadow overflow-hidden"
  >
    <div className="absolute inset-x-0 top-0 h-[3px] bg-brand-blue/60 rounded-t-2xl" />
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
          <FileText size={16} className="text-brand-blue" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-brand-dark font-inter text-sm truncate">{draft.subject}</p>
          <p className="text-xs text-gray-400 font-inter mt-1 line-clamp-2 leading-5">{draft.body}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(draft)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
          title="Edit draft"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(draft)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete draft"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
    {draft.created_at && (
      <p className="mt-3 text-[11px] text-gray-300 font-inter font-mono">
        Created {new Date(draft.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
    )}
  </motion.div>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
export const EmailDrafts = () => {
  const [verificationTypes, setVerificationTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, draft: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, draft: null });

  // Fetch all manual verification types on mount
  useEffect(() => {
    const load = async () => {
      setTypesLoading(true);
      try {
        const { data } = await verificationAPI.getVerificationTypes();
        const list = Array.isArray(data) ? data : (data?.verification_types || data?.types || data?.items || []);
        // Only manual types have email templates (they send emails to third-party verifiers)
        setVerificationTypes(list.filter((t) => t.label === 'manual'));
      } catch (err) {
        toast.error(getApiError(err, 'Failed to load verification types'));
        setVerificationTypes([]);
      } finally {
        setTypesLoading(false);
      }
    };
    load();
  }, []);

  const fetchDrafts = useCallback(async (type) => {
    if (!type) return;
    setLoading(true);
    try {
      const { data } = await verificationAPI.getEmailDraftsByType(type);
      setDrafts(Array.isArray(data) ? data : (data?.drafts || []));
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load drafts'));
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedType) fetchDrafts(selectedType);
    else setDrafts([]);
  }, [selectedType, fetchDrafts]);

  const refresh = () => fetchDrafts(selectedType);

  return (
    <AuthLayout title="Email Drafts">
      <PageHeader
        title="Email Drafts"
        subtitle="Manage saved email templates for manual verification requests"
        action={
          selectedType && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setCreateOpen(true)}
              >
                New Draft
              </Button>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          )
        }
      />

      {/* Verification type selector */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card className="p-5 border border-blue-100 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Mail size={15} className="text-brand-blue" />
            </div>
            <div>
              <p className="font-semibold text-brand-dark font-inter text-sm">Select Verification Type</p>
              <p className="text-xs text-gray-400 font-inter">Drafts are organised per verification type</p>
            </div>
          </div>
          <div className="max-w-sm">
            <TypeSelector
              value={selectedType}
              onChange={(v) => { setSelectedType(v); }}
              types={verificationTypes}
              loading={typesLoading}
            />
          </div>
        </Card>
      </motion.div>

      {/* Drafts list */}
      <AnimatePresence mode="wait">
        {!selectedType ? (
          <motion.div key="empty-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Mail size={24} className="text-brand-blue" />
            </div>
            <p className="font-sora font-semibold text-brand-dark">Select a verification type</p>
            <p className="text-sm text-gray-400 font-inter mt-1">Choose a type above to view and manage its email drafts</p>
          </motion.div>
        ) : loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center justify-center py-16 gap-3 text-brand-blue">
            <RefreshCw size={20} className="animate-spin" />
            <span className="font-inter text-sm">Loading drafts…</span>
          </motion.div>
        ) : drafts.length === 0 ? (
          <motion.div key="empty-drafts" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <FileText size={20} className="text-gray-400" />
            </div>
            <p className="font-sora font-semibold text-brand-dark">No drafts yet</p>
            <p className="text-sm text-gray-400 font-inter mt-1 mb-4">
              No email drafts for <span className="font-medium">{selectedType}</span>
            </p>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
              Create First Draft
            </Button>
          </motion.div>
        ) : (
          <motion.div key="drafts-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400 font-inter">
                <span className="font-semibold text-brand-dark">{drafts.length}</span>{' '}
                draft{drafts.length !== 1 ? 's' : ''} for{' '}
                <span className="text-brand-blue font-medium">{selectedType}</span>
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {drafts.map((draft, i) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  index={i}
                  onEdit={(d) => setEditModal({ open: true, draft: d })}
                  onDelete={(d) => setDeleteModal({ open: true, draft: d })}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <DraftModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        verificationType={selectedType}
        draft={null}
        onSuccess={refresh}
      />

      <DraftModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, draft: null })}
        verificationType={selectedType}
        draft={editModal.draft}
        onSuccess={refresh}
      />

      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, draft: null })}
        draft={deleteModal.draft}
        onSuccess={refresh}
      />
    </AuthLayout>
  );
};

export default EmailDrafts;
