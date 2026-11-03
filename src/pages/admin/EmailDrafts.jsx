import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Card } from '@/components/ui/Card';
import { PageIntro, SummaryBanner } from '@/components/shared/AdminPageParts';
import { Input } from '@/components/ui/Input';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Modal } from '@/components/ui/Modal';
import { EmailDraftRecipients, PairArt } from '@/components/shared/EmailDraftRecipients';
import { verificationAPI, getApiError } from '@/services/api';
import {
  Plus, Pencil, Trash2, RefreshCw, FileText,
  AlertTriangle, Save, History, Eye, Search, Mail, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatSentAt = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── Type selector dropdown ─────────────────────────────────────────────────────
const TypeSelector = ({ value, onChange, types, loading }) => (
  <CustomSelect value={value} onChange={onChange}
    options={types.map((type) => ({ value: type.name, label: type.name }))}
    placeholder={loading ? 'Loading verification types…' : 'Choose verification type'}
    disabled={loading} ariaLabel="Verification type" searchable searchPlaceholder="Search verification types"
    className="[&>button]:min-h-11 [&>button]:rounded-lg [&>button]:px-3.5" />
);

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
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title={isEdit ? 'Edit Email Draft' : 'Create Email Draft'} size="lg" onSubmit={handleSubmit}>
      <div className="space-y-4">
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

        <Modal.Footer className="flex gap-3">
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
        </Modal.Footer>
      </div>
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
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title="Delete Draft?" size="sm">
      {draft && (
        <div className="space-y-5 pt-2">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              
              <p className="text-sm text-gray-500 font-inter mt-1 leading-5">
                "<span className="font-medium text-brand-dark">{draft.subject}</span>" will be permanently deleted.
              </p>
            </div>
          </div>
          <Modal.Footer className="flex gap-3">
            <button type="button" onClick={onClose} disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={handleDelete} disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium font-inter hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {submitting ? 'Deleting…' : 'Delete'}
            </button>
          </Modal.Footer>
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
    className="group rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-200"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
          <FileText size={16} className="text-brand-blue" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-brand-dark font-inter text-sm break-words leading-6">{draft.subject}</p>
          <p className="text-sm text-gray-500 font-inter mt-1 line-clamp-3 leading-6 whitespace-pre-line">{draft.body}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(draft)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
          title="Edit draft" aria-label={`Edit draft: ${draft.subject}`}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(draft)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete draft" aria-label={`Delete draft: ${draft.subject}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
    {draft.created_at && (
      <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500 font-inter tabular-nums">
        Created {new Date(draft.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
    )}
  </motion.div>
);

// ── Email history detail modal — full subject/body preview for one send ────────
const HistoryDetailModal = ({ row, onClose }) => (
  <Modal isOpen={!!row} onClose={onClose} title="Sent Email" size="lg">
    {row && (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 font-inter">Organization</p>
            <p className="font-inter text-brand-dark mt-0.5">{row.organization_name || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 font-inter">Batch</p>
            <p className="font-inter text-brand-dark mt-0.5 truncate">{row.batch_name || row.batch_id || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 font-inter">Verification Type</p>
            <p className="font-inter text-brand-dark mt-0.5">{row.verification_type_name || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 font-inter">Recipient</p>
            <p className="font-inter text-brand-dark mt-0.5">{row.recipient_email || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 font-inter">Sent At</p>
            <p className="font-inter text-brand-dark mt-0.5">{formatSentAt(row.sent_at)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 font-inter">Template Used</p>
            <p className="font-inter text-brand-dark mt-0.5">{row.email_draft_id ? 'Saved draft' : 'Custom (no saved draft)'}</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 font-inter mb-1">Subject</p>
          <p className="font-inter text-sm text-brand-dark">{row.email_subject || '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4 max-h-64 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 font-inter mb-1">Body</p>
          <div className="font-inter text-sm text-gray-600 whitespace-pre-wrap">{row.email_body || '—'}</div>
        </div>
      </div>
    )}
  </Modal>
);

// ── Email history panel — actual send logs, distinct from the reusable draft
// library above (GET /email-drafts/history vs GET /email-drafts/{type}).
// Only ever shows sends that actually succeeded via SMTP — a failed dispatch
// never appears here, by backend design, so this is a delivery-confirmed log,
// not an attempt log. ──
const EmailHistoryPanel = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ organizationId: '', batchId: '', verificationType: '' });
  const [detailRow, setDetailRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await verificationAPI.getEmailHistory({
        organizationId: filters.organizationId.trim() || undefined,
        batchId: filters.batchId.trim() || undefined,
        verificationType: filters.verificationType.trim() || undefined,
        limit: 100,
      });
      setRows(Array.isArray(data) ? data : (data?.items || data?.history || []));
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load email history'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters.organizationId, filters.batchId, filters.verificationType]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Card className="p-5 sm:p-6 border-gray-200 shadow-none mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Search size={15} className="text-brand-blue" />
          </div>
          <div>
            <p className="font-semibold text-brand-dark font-inter text-sm">Search sent emails</p>
            <p className="text-xs text-gray-400 font-inter">Filter by organization, batch, or verification type. Leave fields blank to include all.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Organization ID"
            placeholder="Optional — leave blank for all orgs"
            value={filters.organizationId}
            onChange={(e) => setFilters((f) => ({ ...f, organizationId: e.target.value }))}
          />
          <Input
            label="Batch ID"
            placeholder="Optional"
            value={filters.batchId}
            onChange={(e) => setFilters((f) => ({ ...f, batchId: e.target.value }))}
          />
          <Input
            label="Verification Type"
            placeholder="e.g. Address Verification"
            value={filters.verificationType}
            onChange={(e) => setFilters((f) => ({ ...f, verificationType: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </Card>

      {loading ? (
        <LoadingSkeleton variant="table" label="Loading history" columns={6}/>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <History size={20} className="text-gray-400" />
          </div>
          <p className="font-sora font-semibold text-brand-dark">No sends found</p>
          <p className="text-sm text-gray-400 font-inter mt-1">
            Only successfully sent emails appear here — try widening or clearing the filters above.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-gray-50">
                <tr>
                  {['Organization', 'Batch', 'Verification Type', 'Recipient', 'Sent At', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-inter text-sm text-brand-dark">{row.organization_name || '—'}</td>
                    <td className="px-4 py-3 font-inter text-sm text-gray-600 truncate max-w-[220px]">{row.batch_name || row.batch_id || '—'}</td>
                    <td className="px-4 py-3 font-inter text-sm text-gray-600">{row.verification_type_name || '—'}</td>
                    <td className="px-4 py-3 font-inter text-sm text-gray-600">{row.recipient_email || '—'}</td>
                    <td className="px-4 py-3 font-inter text-xs text-gray-400">{formatSentAt(row.sent_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailRow(row)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold font-inter text-brand-blue hover:bg-blue-50 transition-colors"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <HistoryDetailModal row={detailRow} onClose={() => setDetailRow(null)} />
    </>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export const EmailDrafts = () => {
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'history'
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

  const templatesPanel = (
    <section aria-label="Saved email templates" className="min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex flex-wrap items-start gap-3 px-5 pt-4">
        <FileText size={22} strokeWidth={1.5} className="mt-0.5 shrink-0 text-brand-blue" />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 font-sora text-base font-semibold text-brand-dark">Saved templates{selectedType && !loading && <span className="rounded-full bg-[#e3ebf8] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-blue">{drafts.length}</span>}</h3>
          <p className="mt-0.5 text-xs text-gray-500">Reusable across batches{selectedType ? ` for ${selectedType}` : ''}.</p>
        </div>
        <div className="flex items-center gap-2">
          {!selectedType && <span className="hidden text-xs text-gray-500 xl:inline">Select a verification type to enable.</span>}
          {selectedType && <button type="button" aria-label="Refresh templates" title="Refresh templates" onClick={refresh} disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>}
          <button type="button" onClick={() => setCreateOpen(true)} disabled={!selectedType}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover disabled:bg-[#a9c1f5] disabled:cursor-not-allowed"><Plus size={15} />New draft</button>
        </div>
      </div>
      <div className="mx-4 mb-2 mt-3 rounded-md bg-[#eef3fb] px-3 py-2 text-[13px] font-semibold text-brand-dark">Template library</div>
      {!selectedType ? (
        <div className="px-5 pb-8 pt-4 text-center">
          <PairArt icons={[FileText, Mail]} />
          <p className="mt-3 text-[15px] font-medium text-brand-dark">Choose a verification type</p>
          <p className="mt-1 text-[13px] text-gray-500">View or create its reusable email drafts.</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500"><Info size={14} /> No batch selection needed.</p>
        </div>
      ) : loading ? (
        <div role="status" className="grid gap-3 px-5 pb-5" aria-label="Loading templates">{[1,2].map((key) => <div key={key} className="space-y-3 rounded-xl border border-gray-100 p-4 motion-safe:animate-pulse"><div className="h-4 w-2/3 rounded bg-gray-100" /><div className="h-3 rounded bg-gray-50" /><div className="h-3 w-4/5 rounded bg-gray-50" /></div>)}</div>
      ) : drafts.length === 0 ? (
        <div className="px-5 pb-8 pt-4 text-center">
          <PairArt icons={[FileText, Mail]} />
          <p className="mt-3 text-[15px] font-medium text-brand-dark">No templates for this type yet</p>
          <p className="mt-1 text-[13px] text-gray-500">Save a draft to reuse for future verification requests.</p>
          <button type="button" onClick={() => setCreateOpen(true)} className="mt-3 text-sm font-semibold text-brand-blue hover:underline">Create your first draft</button>
        </div>
      ) : (
        <div className="grid gap-3 px-5 pb-5">{drafts.map((draft, index) => <DraftCard key={draft.id} draft={draft} index={index} onEdit={(item) => setEditModal({ open: true, draft: item })} onDelete={(item) => setDeleteModal({ open: true, draft: item })} />)}</div>
      )}
    </section>
  );

  return (
    <AuthLayout title="Email Drafts">
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro
          eyebrow="Verification communications"
          title="Email workspace"
          subtitle="Manage templates, review recipients and track sent emails."
          actions={(
            <SlidingTabs
              ariaLabel="Email workspace"
              value={activeTab}
              onChange={setActiveTab}
              tabs={[
                { value: 'templates', label: 'Templates', icon: FileText },
                { value: 'history', label: 'Send history', icon: History },
              ]}
            />
          )}
        />

        <SummaryBanner
          icon={Mail}
          label="Manual verification types"
          value={typesLoading ? '—' : verificationTypes.length}
          segments={[
            'Reusable templates for every verification type.',
            selectedType ? `${loading ? '…' : drafts.length} saved for ${selectedType}` : 'Choose a type to see its templates',
          ]}
        />

        {activeTab === 'history' ? <EmailHistoryPanel /> : (
          <>
            <EmailDraftRecipients
              verificationType={selectedType}
              verificationSelector={<TypeSelector value={selectedType} onChange={setSelectedType} types={verificationTypes} loading={typesLoading} />}
              aside={templatesPanel}
            />
            <p className="mt-4 flex items-center gap-2 text-[13px] text-gray-500">
              <Info size={16} strokeWidth={1.5} /> Templates are saved by verification type and can be reused across batches.
            </p>
          </>
        )}
      </div>

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
