import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { verificationAPI, getApiError } from '@/services/api';
import {
  Mail, Send, RefreshCw, CheckCircle, ChevronDown,
  FileText, AlertCircle, RotateCcw, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Draft picker dropdown ──────────────────────────────────────────────────────
const DraftPicker = ({ verificationType, value, onChange }) => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const loadDrafts = useCallback(async () => {
    if (!verificationType) return;
    setLoading(true);
    try {
      const { data } = await verificationAPI.getEmailDraftsByType(verificationType);
      setDrafts(Array.isArray(data) ? data : (data?.drafts || []));
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [verificationType]);

  const selected = drafts.find((d) => d.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { if (!open) loadDrafts(); setOpen((o) => !o); }}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 transition-all font-inter text-sm bg-white ${open ? 'border-brand-blue ring-4 ring-brand-blue/10' : 'border-gray-200 hover:border-gray-300'}`}
      >
        <span className={selected ? 'text-brand-dark font-medium' : 'text-gray-400'}>
          {selected ? selected.subject : 'Load from draft…'}
        </span>
        <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-30 top-full mt-1.5 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-brand-blue text-xs font-inter">
              <RefreshCw size={12} className="animate-spin" />
              Loading drafts…
            </div>
          ) : drafts.length === 0 ? (
            <div className="py-4 px-4 text-center text-xs text-gray-400 font-inter">
              No saved drafts for this verification type
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {drafts.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { onChange(d); setOpen(false); }}
                  className={`w-full text-left px-4 py-3 font-inter text-sm transition-colors border-b border-gray-50 last:border-0 ${d.id === value ? 'bg-brand-blue/5 text-brand-blue' : 'text-brand-dark hover:bg-gray-50'}`}
                >
                  <p className="font-medium truncate">{d.subject}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{d.body}</p>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

// ── Verifier email form ────────────────────────────────────────────────────────
const VerifierForm = ({ verifier, index, form, onChange }) => {
  const set = (field) => (e) => onChange(index, field, e.target.value);
  const loadDraft = (draft) => {
    onChange(index, 'email_subject', draft.subject);
    onChange(index, 'email_body', draft.body);
    onChange(index, '_draftId', draft.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_8px_24px_-16px_rgba(37,99,235,0.15)]"
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-brand-blue/50 rounded-t-2xl pointer-events-none" style={{ position: 'relative' }} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Mail size={16} className="text-brand-blue" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-brand-dark font-inter text-sm">{verifier.verification_type_name?.replace(/_/g, ' ')}</p>
          <p className="text-xs text-blue-500 font-inter truncate">→ {verifier.verifier_email}</p>
        </div>
        <span className="ml-auto px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[11px] font-semibold font-inter shrink-0">
          Verifier {index + 1}
        </span>
      </div>

      {/* Load from draft */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 font-inter mb-1.5">
          Load from saved draft
        </label>
        <DraftPicker
          verificationType={verifier.verification_type_name}
          value={form._draftId || ''}
          onChange={loadDraft}
        />
      </div>

      {/* Subject */}
      <div className="mb-3">
        <Input
          label={<>Subject <span className="text-red-500">*</span></>}
          placeholder="Email subject line"
          value={form.email_subject || ''}
          onChange={set('email_subject')}
          error={form._errors?.email_subject}
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
          Email Body <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={5}
          value={form.email_body || ''}
          onChange={set('email_body')}
          placeholder="Write the email body here. The verification link will be appended automatically."
          className={`w-full rounded-xl border-2 px-4 py-3 font-inter text-sm text-brand-dark outline-none transition-all resize-none ${form._errors?.email_body ? 'border-red-400' : 'border-gray-200 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10'}`}
        />
        {form._errors?.email_body && (
          <p className="mt-1 text-xs text-red-500 font-inter">{form._errors.email_body}</p>
        )}
      </div>
    </motion.div>
  );
};

// ── Success view ───────────────────────────────────────────────────────────────
const SuccessView = ({ batchId, onResend, navigate }) => (
  <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
      <CheckCircle size={28} className="text-emerald-500" />
    </div>
    <h3 className="font-sora font-bold text-xl text-brand-dark">Emails sent successfully</h3>
    <p className="text-sm text-gray-500 font-inter mt-2 mb-6">
      Manual verification emails have been dispatched to all verifiers for batch{' '}
      <span className="font-mono text-brand-blue">{batchId?.slice(0, 12)}…</span>
    </p>
    <div className="flex items-center justify-center gap-3">
      <Button variant="outline" icon={RotateCcw} onClick={onResend}>
        Send Again
      </Button>
      <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/org/batch-status')}>
        Back to Batches
      </Button>
    </div>
  </motion.div>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
export const SendManualVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Accept batchId from location state or query param
  const queryBatchId = new URLSearchParams(location.search).get('batch_id') || '';
  const [batchId, setBatchId] = useState(location.state?.batchId || queryBatchId || '');
  const [inputBatchId, setInputBatchId] = useState(batchId);

  const [verifiers, setVerifiers] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const loadVerifiers = useCallback(async (id) => {
    if (!id?.trim()) return;
    setLoading(true);
    setSent(false);
    try {
      const { data } = await verificationAPI.getThirdPartyVerifiers(id.trim());
      const list = Array.isArray(data) ? data : (data?.verifiers || []);
      setVerifiers(list);
      setForms(list.map(() => ({ email_subject: '', email_body: '', _draftId: '', _errors: {} })));
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load verifiers for this batch'));
      setVerifiers([]);
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (batchId) loadVerifiers(batchId);
  }, [batchId, loadVerifiers]);

  const handleLoad = (e) => {
    e.preventDefault();
    setBatchId(inputBatchId.trim());
  };

  const updateForm = (index, field, value) => {
    setForms((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
        _errors: { ...next[index]._errors, [field]: undefined },
      };
      return next;
    });
  };

  const validate = () => {
    let valid = true;
    const next = forms.map((form) => {
      const errors = {};
      if (!form.email_subject?.trim()) { errors.email_subject = 'Required'; valid = false; }
      if (!form.email_body?.trim()) { errors.email_body = 'Required'; valid = false; }
      return { ...form, _errors: errors };
    });
    setForms(next);
    return valid;
  };

  const handleSend = async () => {
    if (!validate()) {
      toast.error('Fill in subject and body for all verifiers');
      return;
    }
    setSending(true);
    try {
      const payload = {
        batch_id: batchId,
        verifiers: verifiers.map((verifier, i) => ({
          verification_type_name: verifier.verification_type_name,
          verifier_email: verifier.verifier_email,
          email_subject: forms[i].email_subject.trim(),
          email_body: forms[i].email_body.trim(),
        })),
      };
      await verificationAPI.sendBulkManualVerification(payload);
      setSent(true);
      toast.success('Verification emails sent to all verifiers');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send verification emails'));
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setSent(false);
    setForms(verifiers.map(() => ({ email_subject: '', email_body: '', _draftId: '', _errors: {} })));
  };

  return (
    <AuthLayout title="Send Manual Verification">
      <PageHeader
        title="Send Manual Verification Emails"
        subtitle="Compose and dispatch verification requests to third-party verifiers"
        action={
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/org/batch-status')}>
            Back to Batches
          </Button>
        }
      />

      {/* Batch ID selector */}
      {!batchId || (!loading && verifiers.length === 0 && !sent) ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 border border-blue-100 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText size={15} className="text-brand-blue" />
              </div>
              <div>
                <p className="font-semibold text-brand-dark font-inter text-sm">Load Batch Verifiers</p>
                <p className="text-xs text-gray-400 font-inter">Enter a batch ID to load its assigned third-party verifiers</p>
              </div>
            </div>
            <form onSubmit={handleLoad} className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Batch ID (e.g. 3fa85f64-5717-…)"
                  value={inputBatchId}
                  onChange={(e) => setInputBatchId(e.target.value)}
                />
              </div>
              <Button type="submit" variant="primary" disabled={!inputBatchId.trim() || loading}>
                Load
              </Button>
            </form>
          </Card>
        </motion.div>
      ) : null}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center justify-center py-16 gap-3 text-brand-blue">
            <RefreshCw size={20} className="animate-spin" />
            <span className="font-inter text-sm">Loading verifiers…</span>
          </motion.div>
        ) : sent ? (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border border-emerald-100 p-6">
              <SuccessView batchId={batchId} onResend={handleReset} navigate={navigate} />
            </Card>
          </motion.div>
        ) : verifiers.length === 0 && batchId ? (
          <motion.div key="no-verifiers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
              <AlertCircle size={20} className="text-amber-500" />
            </div>
            <p className="font-sora font-semibold text-brand-dark">No manual verifiers assigned</p>
            <p className="text-sm text-gray-400 font-inter mt-1 mb-4">
              This batch has no third-party verifiers configured.<br />
              Only batches with manual verification types require this step.
            </p>
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/org/batch-status')}>
              Back to Batches
            </Button>
          </motion.div>
        ) : verifiers.length > 0 ? (
          <motion.div key="forms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Batch info bar */}
            <div className="flex items-center gap-3 mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
              <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                <FileText size={14} className="text-brand-blue" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-inter">Batch ID</p>
                <p className="text-sm font-mono font-semibold text-brand-dark truncate">{batchId}</p>
              </div>
              <span className="ml-auto px-3 py-1 rounded-full bg-white border border-blue-200 text-brand-blue text-xs font-semibold font-inter shrink-0">
                {verifiers.length} verifier{verifiers.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Per-verifier forms */}
            <div className="space-y-4 mb-6">
              {verifiers.map((verifier, i) => (
                <VerifierForm
                  key={`${verifier.verification_type_name}-${verifier.verifier_email}`}
                  verifier={verifier}
                  index={i}
                  form={forms[i] || {}}
                  onChange={updateForm}
                />
              ))}
            </div>

            {/* Send button */}
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="lg"
                icon={sending ? RefreshCw : Send}
                onClick={handleSend}
                disabled={sending}
                className={sending ? 'pointer-events-none' : ''}
              >
                {sending ? 'Sending emails…' : `Send to ${verifiers.length} Verifier${verifiers.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AuthLayout>
  );
};

export default SendManualVerification;
