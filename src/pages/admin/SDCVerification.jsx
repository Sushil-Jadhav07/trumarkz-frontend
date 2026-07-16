import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { authAPI, verificationAPI, sdcAPI, getApiError } from '@/services/api';
import {
  Search, ShieldCheck, Users, ChevronRight, CheckCircle, Clock, XCircle,
  ArrowLeft, FileText, QrCode, Eye, ChevronDown, Sparkles, RefreshCw, AlertCircle, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Helpers ──────────────────────────────────────────────────────────────────
const SDC_CONFIG_PREFIX = 'sdc_config_';

const loadSdcConfig = (batchId) => {
  try {
    return JSON.parse(localStorage.getItem(`${SDC_CONFIG_PREFIX}${batchId}`)) || {};
  } catch {
    return {};
  }
};

const saveSdcConfig = (batchId, config) => {
  localStorage.setItem(`${SDC_CONFIG_PREFIX}${batchId}`, JSON.stringify(config));
};

const statusBadge = (status) => {
  if (status === 'verified') return { variant: 'success', label: 'Verified' };
  if (status === 'failed') return { variant: 'error', label: 'Failed' };
  return { variant: 'pending', label: 'Pending' };
};

const isProductRecord = (r) =>
  r?.entity_type === 'product' || !!r?.product_name || !!r?.category_name;

const recordTitle = (r) => r?.product_name || r?.full_name || r?.email || r?.id || 'Record';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normaliseBatch = (b) => {
  if (!b || typeof b !== 'object') return null;
  const id = b.batch_id || b.id || '';
  const total = Number(b.total_users ?? b.total ?? 0);
  const verified = Number(b.verified ?? b.verified_count ?? 0);
  const failed = Number(b.failed ?? b.failed_count ?? 0);
  const pending = Math.max(0, total - verified - failed);
  const rawTypes = Array.isArray(b.industry_type) ? b.industry_type : [];
  return {
    id,
    name: b.batch_name || b.name || `Batch ${String(id).slice(0, 8)}`,
    total, verified, failed, pending,
    createdAt: b.created_at || b.createdAt,
    industryType: rawTypes,
    sdcStatus: b.sdc_status || null,
    users: Array.isArray(b.users) ? b.users : [],
  };
};

// Fetches a single Dhiway record (API 3) and opens its pdf/verify link directly.
const fetchAndOpenCertificate = async (publicId, instanceKey, kind) => {
  const { data } = await sdcAPI.getRecord(publicId, instanceKey);
  const url = kind === 'pdf' ? data?.pdf : data?.verify;
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
  else toast.error(`No ${kind === 'pdf' ? 'PDF' : 'verify'} link on this certificate yet`);
  return data;
};

const ALL_INDUSTRIES_FALLBACK = [
  'All Industries', 'Transport & Logistics', 'Healthcare', 'Education',
  'Electronics & Appliances', 'Luxury Products', 'Freelance / Gig',
  'Technology', 'Manufacturing', 'Agriculture', 'Insurance',
];

const Detail = ({ label, value, mono }) => (
  <div>
    <p className="text-xs text-gray-400 font-inter mb-0.5 capitalize">{label}</p>
    <p className={`text-sm text-brand-dark font-inter ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
      {value || '-'}
    </p>
  </div>
);

// ── Generate SDC modal ───────────────────────────────────────────────────────
// org_id/space_id/schema_id are resolved server-side from the batch's industry/
// entity type — the caller does NOT need to supply them. The advanced section
// below only exists as an escape hatch to override the backend's default
// Dhiway template for this one generation run.
const GenerateSDCModal = ({ batch, onClose, onGenerated }) => {
  const initial = loadSdcConfig(batch.id);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [orgId, setOrgId] = useState(initial.org_id || '');
  const [spaceId, setSpaceId] = useState(initial.space_id || '');
  const [schemaId, setSchemaId] = useState(initial.schema_id || '');
  const [publish, setPublish] = useState(!!initial.publish);
  const [active, setActive] = useState(initial.active !== undefined ? !!initial.active : true);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState(null); // raw API response, shown for reference after submit
  const [sentPayload, setSentPayload] = useState(null);

  // Fallback issue call — only used when generate comes back with issue_pending.
  // 409 = Dhiway drafts not ready yet, retry with backoff. Large batches can take
  // Dhiway well over a minute to finish drafting, so this window is generous
  // (8 attempts, 5s/10s/.../40s — ~3 minutes worst case) rather than giving up fast.
  // 400 = generate wasn't called first (shouldn't happen from this code path).
  const issueWithRetry = async (batchId, attempt = 1, maxAttempts = 8) => {
    try {
      const { data } = await sdcAPI.issueBatchSDC(batchId);
      return data;
    } catch (err) {
      if (err?.response?.status === 409 && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
        return issueWithRetry(batchId, attempt + 1, maxAttempts);
      }
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        org_id: showAdvanced ? orgId.trim() : undefined,
        space_id: showAdvanced ? spaceId.trim() : undefined,
        schema_id: showAdvanced ? schemaId.trim() : undefined,
        publish,
        active,
      };
      const { data } = await sdcAPI.generateBatchSDC(batch.id, payload);

      // generate is now create+issue in one call. issue_pending: true means Dhiway
      // hadn't finished within generate's own wait window — finish it ourselves.
      let finalData = data;
      if (data.issue_pending) {
        toast('Finishing certificate issuance…', { icon: '⏳' });
        try {
          finalData = await issueWithRetry(batch.id);
        } catch (issueErr) {
          // Drafts were created but Dhiway still hasn't finished issuing after our
          // retry window — don't hard-fail the whole flow. Drafts exist and can be
          // finished later with the "Retry Issuance" button below.
          finalData = { ...data, issue_pending: true };
          toast.error('Drafts created, but issuance is taking longer than usual — use "Retry Issuance" below.');
        }
      }

      if (showAdvanced && (payload.org_id || payload.space_id || payload.schema_id)) {
        saveSdcConfig(batch.id, payload);
      }
      if (!finalData.issue_pending) toast.success('SDC created');
      onGenerated(payload, finalData);
      setSentPayload(payload);
      setResult(finalData);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to start SDC generation'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryIssue = async () => {
    setRetrying(true);
    try {
      const data = await issueWithRetry(batch.id);
      toast.success('Certificates issued');
      setResult(data);
      onGenerated(sentPayload, data);
    } catch (err) {
      toast.error(getApiError(err, 'Still not ready — try again in a bit'));
    } finally {
      setRetrying(false);
    }
  };

  // ── Post-submit: show exactly what the backend sent back, for reference ──
  if (result) {
    return (
      <Modal isOpen onClose={onClose} title="SDC Generation Started" size="lg">
        <div className="space-y-4">
          {result.issue_pending ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-orange-50 border-orange-100">
              <Badge status="pending">Issuance Pending</Badge>
              <span className="text-xs text-orange-700 font-inter">Drafts created — issuance still in progress on Dhiway's side</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-green-50 border-green-100">
              <Badge status="success">SDC Created</Badge>
              <span className="text-xs text-green-700 font-inter">Dhiway status {result.dhiway_status ?? '—'}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Detail label="Batch ID" value={result.batch_id} mono />
            <Detail label="Records Sent" value={result.records_sent} />
            <Detail label="SDC Status" value={result.sdc_status} />
            <Detail label="Issued Count" value={result.issued_count} />
            <Detail label="Created At" value={result.created_at} />
            <Detail label="Dhiway Status Code" value={result.dhiway_status} />
          </div>

          {result.dhiway_response && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 font-inter">Dhiway Response (raw)</p>
              <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-x-auto font-mono text-gray-600">
                {typeof result.dhiway_response === 'string'
                  ? result.dhiway_response
                  : JSON.stringify(result.dhiway_response, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 font-inter">What we sent</p>
            <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-x-auto font-mono text-gray-600">
              {JSON.stringify({ batch_id: batch.id, ...sentPayload }, null, 2)}
            </pre>
            <p className="text-xs text-gray-400 font-inter mt-1.5">
              org_id/space_id/schema_id were left {showAdvanced ? 'overridden above' : 'unset — the backend resolved its own default'};
              the API response doesn't echo back which values it actually used.
            </p>
          </div>

          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
            <RefreshCw size={14} className="text-brand-blue mt-0.5 shrink-0 animate-spin" />
            <p className="text-xs text-brand-blue/90 font-inter">
              Checking for the PDF automatically in the background (Dhiway needs a moment to finish processing) —
              close this and watch the batch table, or use "Refresh Certificates" any time.
            </p>
          </div>

          <div className="flex gap-3">
            {result.issue_pending && (
              <Button variant="secondary" loading={retrying} onClick={handleRetryIssue}>
                <RefreshCw size={14} /> Retry Issuance
              </Button>
            )}
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Generate SDC Certificates" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-500 font-inter">
          Generates signed digital certificates for every user in <span className="font-semibold text-brand-dark">{batch.name}</span> via
          Dhiway Studio. The Dhiway account/space/template are resolved automatically from this batch's industry and
          entity type — nothing else to fill in.
        </p>

        <div className="flex items-center gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm font-inter text-gray-700 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-brand-blue" />
            Active (visible via active=1 record lookups)
          </label>
          <label className="flex items-center gap-2 text-sm font-inter text-gray-700 cursor-pointer">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="w-4 h-4 accent-brand-blue" />
            Publish
          </label>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-brand-blue mt-0.5 shrink-0" />
          <p className="text-xs text-brand-blue/90 font-inter">
            Generation runs in the background on Dhiway's side (202 Processing). Records may take a moment to appear
            after this completes — use "Refresh Certificates" in the batch view to check.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-dark font-inter"
        >
          <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Advanced — override the Dhiway template for this run
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-1">
            <Input label="Org ID (override)" placeholder="Leave blank to use backend default" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
            <Input label="Space ID (override)" placeholder="Leave blank to use backend default" value={spaceId} onChange={(e) => setSpaceId(e.target.value)} />
            <Input label="Schema ID (override)" placeholder="Leave blank to use backend default" value={schemaId} onChange={(e) => setSchemaId(e.target.value)} />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={submitting}>
            <Sparkles size={14} /> Generate SDCs
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Record certificate modal ────────────────────────────────────────────────
const RecordCertModal = ({ record, sdcMatch, instanceKey, onClose }) => {
  const [loading, setLoading] = useState(false);

  if (!record) return null;
  const { variant, label } = statusBadge(record.verification_status);
  const isProduct = isProductRecord(record);

  const openCertificate = async (kind) => {
    if (!sdcMatch?.publicId) return;
    setLoading(true);
    try {
      await fetchAndOpenCertificate(sdcMatch.publicId, instanceKey, kind);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to fetch certificate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={!!record} onClose={onClose} title="Record Certificate" size="lg">
      <div className="space-y-5">
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          variant === 'success' ? 'bg-green-50 border-green-100' :
          variant === 'error' ? 'bg-red-50 border-red-100' :
          'bg-orange-50 border-orange-100'
        }`}>
          <Badge status={variant}>{label}</Badge>
          {sdcMatch ? (
            <Badge status="info">SDC generated</Badge>
          ) : (
            <span className="text-xs text-gray-400 font-inter">SDC not generated for this record yet</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {isProduct ? (
            <>
              <Detail label="Product Name" value={record.product_name} />
              <Detail label="Category" value={record.category_name} />
            </>
          ) : (
            <>
              <Detail label="Full Name" value={record.full_name} />
              <Detail label="Email" value={record.email} />
              <Detail label="Phone" value={record.phone_number} />
            </>
          )}
          <Detail label="Record ID" value={record.id} mono />
          {sdcMatch && <Detail label="Dhiway Public ID" value={sdcMatch.publicId} mono />}
        </div>

        {sdcMatch ? (
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" size="sm" loading={loading} onClick={() => openCertificate('pdf')}>
              <FileText size={14} /> Download PDF
            </Button>
            <Button variant="outline" size="sm" loading={loading} onClick={() => openCertificate('verify')}>
              <QrCode size={14} /> Verify Certificate
            </Button>
          </div>
        ) : (
          <p className="text-xs text-gray-400 font-inter">
            Generate SDCs for this batch, then refresh certificates to link this record to its Dhiway credential.
          </p>
        )}
      </div>
    </Modal>
  );
};

// ── Batch detail view ───────────────────────────────────────────────────────
const BatchDetail = ({ batchSummary, onBack, onBatchUpdated }) => {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [sdcConfig, setSdcConfig] = useState(loadSdcConfig(batchSummary.id));
  const [sdcRecordsByEmail, setSdcRecordsByEmail] = useState({});
  const [certsLoading, setCertsLoading] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);
  const [statusProgress, setStatusProgress] = useState(null); // { total, ready, pending }
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const pollRef = useRef(null);
  const instanceKey = 'de';

  const loadBatch = useCallback(() => {
    setLoading(true);
    verificationAPI.getBatchDetails(batchSummary.id)
      .then(({ data }) => setBatch(normaliseBatch(data)))
      .catch((err) => toast.error(getApiError(err, 'Failed to load batch details')))
      .finally(() => setLoading(false));
  }, [batchSummary.id]);

  useEffect(() => { loadBatch(); }, [loadBatch]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const refreshCertificates = useCallback(async (silent = false) => {
    const config = loadSdcConfig(batchSummary.id);
    setSdcConfig(config);
    setCertsLoading(true);
    try {
      // org_id/space_id are optional — the backend falls back to its configured
      // SDC template default when they're omitted.
      const { data } = await sdcAPI.getRecords({ org_id: config.org_id, space_id: config.space_id, active: 1, pageSize: 100 });
      const map = {};
      (data?.records || []).forEach((r) => {
        (r.recipients || []).forEach((email) => {
          if (email) map[email.toLowerCase()] = { id: r.id, publicId: r.publicId, updatedAt: r.updatedAt, title: r.title };
        });
      });
      setSdcRecordsByEmail(map);
      if (!silent) {
        toast.success(`Loaded ${data?.count ?? Object.keys(map).length} certificate${data?.count === 1 ? '' : 's'}`);
      }
      return Object.keys(map).length;
    } catch (err) {
      if (!silent) toast.error(getApiError(err, 'Failed to fetch SDC records'));
      return 0;
    } finally {
      setCertsLoading(false);
    }
  }, [batchSummary.id]);

  // Poll GET /sdc/batches/{id}/status until done:true, then do one getRecords
  // pass to link up publicId/pdf/verify for the UI.
  const startAutoCheckForCertificates = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    const maxAttempts = 10; // ~80s worst case at 8s intervals
    setAutoChecking(true);
    setStatusProgress(null);

    const tick = async () => {
      attempts += 1;
      try {
        const { data } = await sdcAPI.getBatchStatus(batchSummary.id);
        setStatusProgress({ total: data.total, ready: data.ready, pending: data.pending });

        if (data.done) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setAutoChecking(false);
          const found = await refreshCertificates(true);
          toast.success(`Certificates ready — ${found} record${found === 1 ? '' : 's'} linked`);
          return;
        }
      } catch {
        // transient error — keep polling, only give up after maxAttempts
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setAutoChecking(false);
        toast.error('Still processing — use "Refresh Certificates" to check again later');
      }
    };

    tick();
    pollRef.current = setInterval(tick, 8000);
  }, [batchSummary.id, refreshCertificates]);

  const filtered = useMemo(() => {
    if (!batch) return [];
    const q = search.toLowerCase();
    if (!q) return batch.users;
    return batch.users.filter((r) =>
      [r.full_name, r.product_name, r.email, r.id].some((v) => v?.toLowerCase().includes(q))
    );
  }, [batch, search]);

  if (loading || !batch) {
    return (
      <div className="py-24 text-center text-sm text-gray-400 font-inter">Loading batch...</div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-dark transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          {batchSummary.orgName && (
            <p className="text-xs text-brand-blue font-inter font-medium mb-0.5">{batchSummary.orgName}</p>
          )}
          <h2 className="text-lg font-bold text-brand-dark font-sora">{batch.name}</h2>
          <p className="text-xs text-gray-500 font-inter font-mono">{batch.id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {autoChecking && (
            <span className="flex items-center gap-1.5 text-xs text-brand-blue font-inter">
              <RefreshCw size={12} className="animate-spin" />
              Checking for certificates…
              {statusProgress && ` (${statusProgress.ready}/${statusProgress.total} ready)`}
            </span>
          )}
          {batch.sdcStatus === 'generated' ? (
            <Badge status="success">SDC Generated</Badge>
          ) : (
            <Badge status="default">SDC Not Generated</Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => refreshCertificates(false)} loading={certsLoading}>
            <RefreshCw size={14} /> Refresh Certificates
          </Button>
          <Button size="sm" onClick={() => setShowGenerateModal(true)}>
            <Sparkles size={14} /> Generate SDCs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: batch.total, color: 'text-brand-dark' },
          { label: 'Verified', value: batch.verified, color: 'text-green-600' },
          { label: 'Pending', value: batch.pending, color: 'text-orange-500' },
          { label: 'Failed', value: batch.failed, color: 'text-red-500' },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold font-sora ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 font-inter mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search records by name, email, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Name / Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Email / ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Certificate</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((record) => {
                const { variant, label } = statusBadge(record.verification_status);
                const match = record.email ? sdcRecordsByEmail[record.email.toLowerCase()] : null;
                return (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-brand-dark font-inter max-w-[260px] truncate">{recordTitle(record)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-inter max-w-[240px] truncate">{record.email || record.id}</td>
                    <td className="px-4 py-3"><Badge status={variant}>{label}</Badge></td>
                    <td className="px-4 py-3">
                      {match ? (
                        <div className="flex items-center gap-2">
                          <Badge status="info">Ready</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={pdfLoadingId === record.id}
                            onClick={async () => {
                              setPdfLoadingId(record.id);
                              try {
                                await fetchAndOpenCertificate(match.publicId, instanceKey, 'pdf');
                              } catch (err) {
                                toast.error(getApiError(err, 'Failed to fetch certificate'));
                              } finally {
                                setPdfLoadingId(null);
                              }
                            }}
                          >
                            <FileText size={12} /> PDF
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 font-inter">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(record)}>
                        <Eye size={14} /> View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 font-inter">No records match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <RecordCertModal
        record={selectedRecord}
        sdcMatch={selectedRecord?.email ? sdcRecordsByEmail[selectedRecord.email.toLowerCase()] : null}
        instanceKey={instanceKey}
        onClose={() => setSelectedRecord(null)}
      />

      {showGenerateModal && (
        <GenerateSDCModal
          batch={batch}
          onClose={() => setShowGenerateModal(false)}
          onGenerated={(config) => {
            setSdcConfig(config);
            setBatch((prev) => (prev ? { ...prev, sdcStatus: 'generated' } : prev));
            onBatchUpdated?.({ sdcStatus: 'generated' });
            startAutoCheckForCertificates();
          }}
        />
      )}
    </motion.div>
  );
};

const BatchCard = ({ batch, onClick, onGenerateClick }) => {
  const pct = batch.total > 0 ? Math.round((batch.verified / batch.total) * 100) : 0;

  return (
    <Card hover className="p-5" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
            <Users size={18} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-dark font-inter truncate">{batch.name}</p>
            <p className="text-xs text-gray-400 font-mono">{String(batch.id || '').slice(0, 20)}...</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {batch.sdcStatus === 'generated' ? (
          <Badge status="success">SDC Generated</Badge>
        ) : (
          <Badge status="default">SDC Not Generated</Badge>
        )}
        {batch.industryType.slice(0, 2).map((ind) => (
          <span key={ind} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-brand-blue font-inter">{ind}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 font-inter mb-2">
        <span>{batch.total} records</span>
        <span className="text-green-600 font-medium">{pct}% verified</span>
      </div>
      <ProgressBar progress={pct} showLabel={false} height="h-2" />

      <div className="flex items-center gap-3 mt-3">
        <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={11} /> {batch.verified}</span>
        <span className="flex items-center gap-1 text-xs text-orange-500"><Clock size={11} /> {batch.pending}</span>
        {batch.failed > 0 && <span className="flex items-center gap-1 text-xs text-red-500"><XCircle size={11} /> {batch.failed}</span>}
        <span className="ml-auto text-xs text-gray-400">{formatDate(batch.createdAt)}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-50">
        <Button
          size="sm"
          variant={batch.sdcStatus === 'generated' ? 'outline' : 'primary'}
          className="w-full"
          onClick={(e) => { e.stopPropagation(); onGenerateClick(); }}
        >
          <Sparkles size={14} /> {batch.sdcStatus === 'generated' ? 'Regenerate SDCs' : 'Generate SDCs'}
        </Button>
      </div>
    </Card>
  );
};

const OrgCard = ({ org, onClick }) => {
  const totals = org.batches.reduce(
    (acc, b) => ({
      records: acc.records + b.total,
      verified: acc.verified + b.verified,
      generated: acc.generated + (b.sdcStatus === 'generated' ? 1 : 0),
    }),
    { records: 0, verified: 0, generated: 0 }
  );
  const pct = totals.records > 0 ? Math.round((totals.verified / totals.records) * 100) : 0;

  return (
    <Card hover className="p-5" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-dark font-inter truncate">{org.orgName}</p>
            <p className="text-xs text-gray-400 font-inter">{org.batches.length} batch{org.batches.length === 1 ? '' : 'es'}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge status={totals.generated === org.batches.length && org.batches.length > 0 ? 'success' : 'default'}>
          {totals.generated}/{org.batches.length} SDC Generated
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 font-inter mb-2">
        <span>{totals.records} records</span>
        <span className="text-green-600 font-medium">{pct}% verified</span>
      </div>
      <ProgressBar progress={pct} showLabel={false} height="h-2" />
    </Card>
  );
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All Batches' },
  { value: 'generated', label: 'SDC Generated' },
  { value: 'not_generated', label: 'SDC Not Generated' },
];

const FilterDropdown = ({ value, options, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className={`relative ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="h-[50px] min-w-[170px] px-3 py-2 border-2 border-brand-gray rounded-xl text-sm font-inter text-gray-700 bg-white flex items-center justify-between cursor-pointer"
      >
        <span>{selected?.label}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-md py-1">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm font-inter cursor-pointer hover:bg-gray-50 ${
                opt.value === value ? 'text-brand-blue font-medium' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SDCVerification = () => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgSearch, setOrgSearch] = useState('');

  const [selectedOrg, setSelectedOrg] = useState(null);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('All Industries');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [generateBatch, setGenerateBatch] = useState(null);

  // Orgs and their batches aren't linked by any single API — batches/verification
  // records are scoped to the caller's own JWT and never carry an org_id/org_name.
  // We reconstruct the mapping from documented endpoints: list orgs via
  // /auth/users/grouped, then for each org discover its batch_ids via
  // /verification/all?org_id=..., then load each batch's details.
  const fetchOrgsAndBatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data: orgList } = await authAPI.getUsersGrouped();
      const rawOrgs = Array.isArray(orgList) ? orgList : [];

      const results = await Promise.all(
        rawOrgs.map(async (org) => {
          const orgId = org.org_id || org.id;
          const orgName = org.organization_name || org.org_name || org.name || 'Organization';
          try {
            const { data } = await verificationAPI.getAllVerifications({ orgId, limit: 500 });
            const batchIds = Array.from(
              new Set((data?.users || []).map((u) => u.batch_id).filter(Boolean))
            );
            const batchDetails = await Promise.all(
              batchIds.map((batchId) =>
                verificationAPI.getBatchDetails(batchId)
                  .then(({ data: detail }) => normaliseBatch(detail))
                  .catch(() => null)
              )
            );
            return { orgId, orgName, batches: batchDetails.filter(Boolean) };
          } catch {
            return { orgId, orgName, batches: [] };
          }
        })
      );

      setOrgs(results);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load organizations'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgsAndBatches(); }, [fetchOrgsAndBatches]);

  const filteredOrgs = useMemo(() => {
    if (!orgSearch.trim()) return orgs;
    const q = orgSearch.toLowerCase();
    return orgs.filter((o) => o.orgName.toLowerCase().includes(q));
  }, [orgs, orgSearch]);

  const orgIndustries = useMemo(() => {
    if (!selectedOrg) return ['All Industries'];
    const set = new Set();
    selectedOrg.batches.forEach((b) => b.industryType.forEach((i) => set.add(i)));
    return ['All Industries', ...(set.size ? Array.from(set) : ALL_INDUSTRIES_FALLBACK.slice(1))];
  }, [selectedOrg]);

  const filteredOrgBatches = useMemo(() => {
    if (!selectedOrg) return [];
    let data = selectedOrg.batches;

    if (statusFilter === 'generated') data = data.filter((b) => b.sdcStatus === 'generated');
    if (statusFilter === 'not_generated') data = data.filter((b) => b.sdcStatus !== 'generated');
    if (industryFilter !== 'All Industries') data = data.filter((b) => b.industryType.includes(industryFilter));

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.industryType.some((i) => i.toLowerCase().includes(q))
      );
    }

    return data;
  }, [selectedOrg, search, industryFilter, statusFilter]);

  const totalBatches = orgs.reduce((s, o) => s + o.batches.length, 0);
  const totalRecords = orgs.reduce((s, o) => s + o.batches.reduce((s2, b) => s2 + b.total, 0), 0);
  const totalVerified = orgs.reduce((s, o) => s + o.batches.reduce((s2, b) => s2 + b.verified, 0), 0);
  const totalGenerated = orgs.reduce((s, o) => s + o.batches.filter((b) => b.sdcStatus === 'generated').length, 0);

  const patchBatchInState = (batchId, patch) => {
    setOrgs((prev) => prev.map((o) => ({
      ...o,
      batches: o.batches.map((b) => (b.id === batchId ? { ...b, ...patch } : b)),
    })));
  };

  // ── Level 3: batch detail (records table, generate/refresh certificates) ──
  if (selectedBatch) {
    return (
      <AuthLayout title="SDC Verification">
        <div className="w-full px-2 sm:px-4 lg:px-1">
          <BatchDetail
            batchSummary={selectedBatch}
            onBack={() => setSelectedBatch(null)}
            onBatchUpdated={(patch) => patchBatchInState(selectedBatch.id, patch)}
          />
        </div>
      </AuthLayout>
    );
  }

  // ── Level 2: one organization's batches ────────────────────────────────────
  if (selectedOrg) {
    return (
      <AuthLayout title="SDC Verification">
        <div className="w-full px-2 sm:px-4 lg:px-1">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setSelectedOrg(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-dark transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-brand-dark font-sora">{selectedOrg.orgName}</h2>
              <p className="text-xs text-gray-500 font-inter">{selectedOrg.batches.length} batch{selectedOrg.batches.length === 1 ? '' : 'es'}</p>
            </div>
          </div>

          <Card className="p-4 mb-6 border-gray-200">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <Input
                  placeholder="Search batches by name, ID, industry..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={Search}
                />
              </div>
              <FilterDropdown
                value={industryFilter}
                onChange={setIndustryFilter}
                options={orgIndustries.map((ind) => ({ value: ind, label: ind }))}
              />
              <FilterDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_FILTERS}
              />
            </div>
          </Card>

          {filteredOrgBatches.length === 0 ? (
            <Card className="p-12 text-center">
              <ShieldCheck size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-inter text-sm">No batches match your filters.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredOrgBatches.map((batch, i) => (
                  <motion.div
                    key={batch.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <BatchCard
                      batch={batch}
                      onClick={() => setSelectedBatch({ ...batch, orgName: selectedOrg.orgName })}
                      onGenerateClick={() => setGenerateBatch(batch)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {generateBatch && (
          <GenerateSDCModal
            batch={generateBatch}
            onClose={() => setGenerateBatch(null)}
            onGenerated={() => {
              patchBatchInState(generateBatch.id, { sdcStatus: 'generated' });
            }}
          />
        )}
      </AuthLayout>
    );
  }

  // ── Level 1: organizations ──────────────────────────────────────────────────
  return (
    <AuthLayout title="SDC Verification">
      <div className="w-full px-2 sm:px-4 lg:px-1">
        <PageHeader title="SDC Verification" subtitle="Generate and track Signed Digital Certificates, organized by organization and batch" />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Organizations', value: orgs.length, color: 'text-brand-dark', bg: 'bg-gray-50' },
            { label: 'Total Batches', value: totalBatches, color: 'text-brand-blue', bg: 'bg-blue-50' },
            { label: 'Verified Records', value: `${totalVerified}/${totalRecords}`, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'SDC Generated', value: `${totalGenerated}/${totalBatches}`, color: 'text-orange-500', bg: 'bg-orange-50' },
          ].map((s) => (
            <Card key={s.label} className={`p-4 ${s.bg}`}>
              <p className={`text-3xl font-bold font-sora ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-inter mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        <Card className="p-4 mb-6 border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <Input
                placeholder="Search by organization name..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                icon={Search}
              />
            </div>

            <Button variant="ghost" size="sm" onClick={fetchOrgsAndBatches} loading={loading}>
              <RefreshCw size={14} /> Refresh
            </Button>

            {orgSearch && (
              <button
                onClick={() => setOrgSearch('')}
                className="text-xs text-gray-500 hover:text-brand-dark font-inter underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </Card>

        <p className="text-xs text-gray-400 font-inter mb-4">
          {loading ? 'Loading organizations...' : `Showing ${filteredOrgs.length} organization${filteredOrgs.length !== 1 ? 's' : ''}`}
        </p>

        {!loading && filteredOrgs.length === 0 ? (
          <Card className="p-12 text-center">
            <ShieldCheck size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-inter text-sm">No organizations match your search.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredOrgs.map((org, i) => (
                <motion.div
                  key={org.orgId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <OrgCard org={org} onClick={() => setSelectedOrg(org)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default SDCVerification;
