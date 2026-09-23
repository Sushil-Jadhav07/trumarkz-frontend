import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { verificationAPI, sdcAPI, getApiError } from '@/services/api';
import { GenerateSDCModal, CertificateDetailModal } from '@/pages/admin/SDCVerification';
import { VerificationDetailsModal } from '@/components/shared/VerificationDetailsModal';
import { TablePagination } from '@/components/shared/TablePagination';
import {
  useBatchList, WORKFLOW_STEPS, isProductRecord, recordTitle, getCertificateProductId,
  formatVerifTypeLabel, statusBadge,
  SmartSendModal, SendRejectedListModal, DeleteBatchModal,
} from '@/pages/admin/BatchMonitor';
import {
  ArrowLeft, ArrowRight, Building2, Calendar, CheckCircle, ChevronDown, Clock, Download, Eye,
  Info, Mail, MoreVertical, Package, Pencil, RefreshCw,
  Search, Send, Share2, Sparkles, Trash2, Users, XCircle, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatCreatedAt = (value) => {
  if (!value) return 'date unavailable';
  return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

const AVATAR_TONES = ['bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600', 'bg-pink-100 text-pink-600'];
const avatarTone = (seed) => {
  let hash = 0;
  for (let i = 0; i < String(seed).length; i += 1) hash = (hash * 31 + String(seed).charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
};

// Local-only display rename — same mechanism `updateBatchWorkflow`'s
// `edited.name` already existed for (documented in BatchMonitor.jsx as "Local-
// only UI conveniences that genuinely have no backend endpoint"). There is no
// batch-rename API, so this only ever changes what this dashboard shows you,
// never anything persisted server-side or visible to the organization.
const EditBatchModal = ({ batch, onClose, onSave }) => {
  const [name, setName] = useState('');
  useEffect(() => { setName(batch?.name || ''); }, [batch]);
  if (!batch) return null;
  return (
    <Modal isOpen={!!batch} onClose={onClose} title="Edit Batch" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5">
          <Info size={13} className="mt-0.5 shrink-0 text-brand-blue" />
          <p className="text-xs text-blue-700 font-inter leading-relaxed">
            This only renames the batch's display label in this dashboard — there's no backend rename endpoint, so it's never persisted or visible to the organization.
          </p>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 font-inter mb-1">Batch Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => { onSave(name.trim()); onClose(); }}>Save</Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Batch Control Center — a dedicated page (was previously an in-page
// Modal on the batch list). Shares its batches array with the list page via
// useBatchList() so it works correctly even reached directly by URL (not
// just navigated to from an already-loaded list) — see that hook's own
// comment in BatchMonitor.jsx for why this isn't a second, drifted fetch.
export const BatchControlCenter = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { batches, loading: listLoading, fetchData, setData, updateBatchWorkflow } = useBatchList();

  const selectedBatch = batches.find((b) => b.id === batchId) || null;

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [editBatchOpen, setEditBatchOpen] = useState(false);
  const [deleteBatchTarget, setDeleteBatchTarget] = useState(null);

  const [batchDetail, setBatchDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const [resending, setResending] = useState(null); // request token being resent
  const [sendingToOrg, setSendingToOrg] = useState(false);

  const [submittedReports, setSubmittedReports] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // Manual assignments — the exact persisted verifier -> assigned-user
  // mapping from GET /verification/batches/{id}/manual-assignments. This is
  // the Verification Records table's Verifier column and verifier filter's
  // only source of truth — never inferred from submittedReports, name, or email.
  const [manualAssignments, setManualAssignments] = useState(null);

  const [rejectedListTarget, setRejectedListTarget] = useState(null);
  const [verificationDetailsRecord, setVerificationDetailsRecord] = useState(null);
  const [smartSendOpen, setSmartSendOpen] = useState(false);
  const [smartSendBatch, setSmartSendBatch] = useState(null);
  const [sdcGenerateBatch, setSdcGenerateBatch] = useState(null);
  const [sdcLiveStatus, setSdcLiveStatus] = useState(null); // { batchId, ready, total }
  const [sdcPollingBatchId, setSdcPollingBatchId] = useState(null);
  const [sdcRecordsByEmail, setSdcRecordsByEmail] = useState({});
  const [sdcRecordsByName, setSdcRecordsByName] = useState({});
  const [batchSdcRecords, setBatchSdcRecords] = useState([]);
  const [batchSdcByRecordId, setBatchSdcByRecordId] = useState({});
  const [sdcCertsLoading, setSdcCertsLoading] = useState(false);
  const [downloadingSdcId, setDownloadingSdcId] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);

  // Batch Records tab — client-side search/filter over the already-loaded
  // records, and a checkbox selection used only for "Export Selected" (there
  // is no bulk approve/reject endpoint — Batch Records has always been
  // read-only per-record, "Individual approvals are disabled").
  const [recordSearch, setRecordSearch] = useState('');
  const [recordStatusFilter, setRecordStatusFilter] = useState('all');
  const [recordTypeFilter, setRecordTypeFilter] = useState('');
  const [recordVerifierFilter, setRecordVerifierFilter] = useState('');
  const [recordPage, setRecordPage] = useState(1);
  const [recordPageSize, setRecordPageSize] = useState(10);

  // Any filter/search/page-size change restarts at page 1 so a narrower
  // result set never leaves you stranded on an out-of-range page.
  useEffect(() => {
    setRecordPage(1);
  }, [recordSearch, recordStatusFilter, recordTypeFilter, recordVerifierFilter, recordPageSize]);
  const [selectedRecordIds, setSelectedRecordIds] = useState(() => new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  // Warranty batches carry product/serial/warranty-date records, not the
  // generic human/product verification shape this page renders — they never
  // link here from the list (handleOpenBatchDetails routes them to their own
  // modal instead), so a warranty batch id here only happens via a stale/
  // hand-edited URL. Bounce back to the list rather than rendering nothing.
  useEffect(() => {
    if (selectedBatch?.batchType === 'warranty') {
      navigate(`/admin/batch-monitor/warranty/${batchId}`, { replace: true });
    }
  }, [selectedBatch?.batchType, navigate]);

  // Pulls the org's SDC records and matches them to this batch's users by
  // email — same anchorTime-based issued/draft distinction used elsewhere.
  // Dhiway records are matched to batch users "by email or name" per the
  // backend docs — email alone isn't enough (test/dummy records often have
  // empty or non-matching email fields), so also index by title as a fallback.
  const refreshSdcCertificates = useCallback(async (batchIdArg = batchId, detailRecordsArg = null, sdcInfoArg = undefined) => {
    if (!batchIdArg) return;
    // Prefer the batch's own recorded verification_progress.sdc.{org_id,space_id}
    // — that's exactly what was used to generate this batch's certificates,
    // and is more reliable than the org's *current* profile setting (which
    // this falls back to only for older batches that predate this field).
    const sdcInfo = sdcInfoArg !== undefined ? sdcInfoArg : batchDetail?.verification_progress?.sdc;
    const orgId   = sdcInfo?.org_id || undefined;
    const spaceId = sdcInfo?.space_id || selectedBatch?.spaceId || undefined;
    setSdcCertsLoading(true);
    try {
      // GET /sdc/batches/{batch_id}/status's certificate_ids is the backend's
      // own authoritative "issued for this batch" set (same signal the org
      // side's BatchStatus.jsx already learned to trust — see its own
      // comment: "presence in certificate_ids already means issued, don't
      // also require anchorTime"). The bulk list's anchorTime/revoked fields
      // track actual on-chain anchoring, a separate and sometimes-delayed
      // step — a cert can be fully generated and downloadable well before
      // anchorTime is set, so anchorTime alone was mislabeling every such
      // cert "Draft". Treat either signal as sufficient.
      const certIds = await sdcAPI.getBatchStatus(batchIdArg)
        .then(({ data }) => new Set(Array.isArray(data?.certificate_ids) ? data.certificate_ids : []))
        .catch(() => new Set());
      const isIssued = (r) => !r.revoked && (!!r.anchorTime || certIds.has(r.publicId));

      const allRecords = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data } = await sdcAPI.getRecords({ active: 1, page, pageSize: 100, org_id: orgId, space_id: spaceId });
        const pageRecords = Array.isArray(data?.records) ? data.records : [];
        allRecords.push(...pageRecords);
        const totalPages = Number(data?.totalPages || data?.total_pages || 0);
        hasMore = totalPages > 0 ? page < totalPages : pageRecords.length === 100;
        page += 1;
      }

      const byEmail = {};
      const byName = {};
      allRecords.forEach((r) => {
        const issued = isIssued(r);
        const entry = {
          id: r.id, publicId: r.publicId, title: r.title, issued,
          recipients: Array.isArray(r.recipients) ? r.recipients : [],
          anchorTime: r.anchorTime || null, revoked: !!r.revoked,
          active: !!r.active, latest: !!r.latest, edited: !!r.edited,
          createdAt: r.createdAt || null, updatedAt: r.updatedAt || null,
        };
        (r.recipients || []).forEach((email) => {
          if (email) byEmail[email.toLowerCase()] = entry;
        });
        if (r.title?.trim()) byName[r.title.trim().toLowerCase()] = entry;
      });
      setSdcRecordsByEmail(byEmail);
      setSdcRecordsByName(byName);

      const detailRecords = detailRecordsArg || batchDetail?.users || selectedBatch?.records || [];
      const matchedRecords = [];
      const matchedByRecordId = {};
      const seenPublicIds = new Set();
      detailRecords.forEach((record) => {
        // Confirmed via the live batch-details response: each user is keyed
        // by `user_id`, not `id` — check all three since the shape can vary.
        const recordId = record?.id || record?.user_id || record?.entity_id;
        const recordEmail = record?.email?.trim().toLowerCase();
        const recordName = recordTitle(record)?.trim().toLowerCase();
        const match = allRecords.find((item) => {
          const recipients = (item?.recipients || []).map((value) => value?.trim().toLowerCase()).filter(Boolean);
          const itemTitle = item?.title?.trim().toLowerCase();
          return (recordEmail && recipients.includes(recordEmail)) || (recordName && itemTitle === recordName);
        });
        if (match?.publicId && !seenPublicIds.has(match.publicId)) {
          seenPublicIds.add(match.publicId);
          matchedRecords.push(match);
        }
        if (match?.publicId && recordId) {
          matchedByRecordId[recordId] = {
            id: match.id,
            publicId: match.publicId,
            title: match.title,
            recipients: match.recipients || [],
            anchorTime: match.anchorTime || null,
            revoked: !!match.revoked,
            issued: isIssued(match),
            active: !!match.active,
            latest: !!match.latest,
            edited: !!match.edited,
            createdAt: match.createdAt || null,
            updatedAt: match.updatedAt || null,
          };
        }
      });

      // Product records never match by the pass above — they have no email,
      // and Dhiway echoes the certificate's own publicId into `title` for
      // this batch type (confirmed live), so title === recordName never
      // holds either. The list endpoint carries nothing identity-based for
      // products, but a single-record detail fetch does: credentialSubject.
      // product_id (confirmed live via GET /sdc/records/{publicId}). Only
      // chase this down for whichever records are still unmatched, and only
      // among the most-recently-created still-unclaimed certs, so this stays
      // a handful of extra requests rather than one per cert in the space.
      const currentBatchType = batchDetail?.batch_type || selectedBatch?.batchType;
      const unmatchedProductRecords = detailRecords.filter((record) => {
        const recordId = record?.id || record?.user_id || record?.entity_id;
        return isProductRecord(record, currentBatchType) && recordId && !matchedByRecordId[recordId];
      });

      if (unmatchedProductRecords.length > 0) {
        const candidatePool = allRecords
          .filter((item) => item?.publicId && !seenPublicIds.has(item.publicId))
          .sort((a, b) => new Date(b.createdAt || b.anchorTime || 0) - new Date(a.createdAt || a.anchorTime || 0))
          .slice(0, Math.max(unmatchedProductRecords.length * 4, 20));

        const detailed = await Promise.all(
          candidatePool.map((item) =>
            sdcAPI.getRecord(item.publicId)
              .then(({ data }) => ({ item, productId: getCertificateProductId(data) }))
              .catch(() => null)
          )
        );

        const certByProductId = new Map();
        detailed.forEach((entry) => {
          if (entry?.productId && !certByProductId.has(entry.productId)) {
            certByProductId.set(entry.productId, entry.item);
          }
        });

        unmatchedProductRecords.forEach((record) => {
          const recordId = record?.id || record?.user_id || record?.entity_id;
          const match = certByProductId.get(recordId);
          if (!match?.publicId || seenPublicIds.has(match.publicId)) return;
          seenPublicIds.add(match.publicId);
          matchedRecords.push(match);
          matchedByRecordId[recordId] = {
            id: match.id,
            publicId: match.publicId,
            title: match.title,
            recipients: match.recipients || [],
            anchorTime: match.anchorTime || null,
            revoked: !!match.revoked,
            issued: isIssued(match),
            active: !!match.active,
            latest: !!match.latest,
            edited: !!match.edited,
            createdAt: match.createdAt || null,
            updatedAt: match.updatedAt || null,
          };
        });
      }

      setBatchSdcRecords(matchedRecords);
      setBatchSdcByRecordId(matchedByRecordId);
    } catch {
      // silent — certificate column just stays blank if this fails
      setBatchSdcRecords([]);
      setBatchSdcByRecordId({});
    } finally {
      setSdcCertsLoading(false);
    }
  }, [batchDetail?.users, batchDetail?.verification_progress?.sdc, selectedBatch?.records, selectedBatch?.spaceId, batchId]);

  const matchSdcRecord = useCallback((record) => {
    const recordId = record?.id || record?.user_id || record?.entity_id;
    if (recordId && batchSdcByRecordId[recordId]) return batchSdcByRecordId[recordId];
    const byEmail = record?.email ? sdcRecordsByEmail[record.email.toLowerCase()] : null;
    if (byEmail) return byEmail;
    const title = recordTitle(record)?.trim().toLowerCase();
    return title ? sdcRecordsByName[title] || null : null;
  }, [batchSdcByRecordId, sdcRecordsByEmail, sdcRecordsByName]);

  // ── Action: Generate SDC — poll GET /status until done, mirrors the flow
  // used in SDCVerification.jsx so the still-open panel can update itself
  // once Dhiway actually finishes issuing (instead of staying stuck on
  // "pending").
  const pollSdcStatusUntilDone = useCallback((polledBatchId) => {
    let attempts = 0;
    const maxAttempts = 10;
    setSdcPollingBatchId(polledBatchId);
    const tick = async () => {
      attempts += 1;
      try {
        const { data } = await sdcAPI.getBatchStatus(polledBatchId);
        if (data.done) {
          setSdcLiveStatus({ batchId: polledBatchId, ready: data.ready, total: data.total });
          setSdcPollingBatchId((current) => (current === polledBatchId ? null : current));
          setData((prev) => (prev || []).map((b) => (
            b.id === polledBatchId ? { ...b, sdcInfo: { ...(b.sdcInfo || {}), status: 'sdc_created' } } : b
          )));
          toast.success(`Certificates ready — ${data.ready}/${data.total} issued`);
          refreshSdcCertificates();
          return;
        }
      } catch {
        // transient error — keep polling, only give up after maxAttempts
      }
      if (attempts < maxAttempts) {
        setTimeout(tick, 8000);
      } else {
        setSdcPollingBatchId((current) => (current === polledBatchId ? null : current));
        toast.error('Still processing — check the batch again shortly');
      }
    };
    tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetches (or refreshes) manual-assignments on its own — deliberately not
  // folded into the detail+reports Promise.all below, since its failure must
  // never block the rest of the page from rendering. Feeds the Verification
  // Records table's Verifier column and the verifier filter; reused for the
  // initial load and the post-Smart-Send refresh, so there's exactly one
  // place that knows how to fetch this.
  const loadManualAssignments = useCallback(async (batchIdArg) => {
    const id = batchIdArg || batchId;
    if (!id) return;
    try {
      const { data } = await verificationAPI.getManualAssignments(id);
      setManualAssignments(data);
    } catch (err) {
      toast.error(getApiError(err, 'Unable to load verifier assignments'));
    }
  }, [batchId]);

  // Loads batch detail + submitted reports + (if already generated) SDC
  // certificates whenever the routed batchId changes — the routed
  // equivalent of the old modal's "on open" fetch.
  useEffect(() => {
    if (!batchId || selectedBatch?.batchType === 'warranty') return;
    let cancelled = false;
    setBatchDetail(null);
    setSubmittedReports(null);
    setManualAssignments(null);
    setSdcRecordsByEmail({});
    setSdcRecordsByName({});
    setBatchSdcRecords([]);
    setBatchSdcByRecordId({});
    setLoadingDetail(true);
    setLoadingReports(true);

    (async () => {
      try {
        const [detailRes, reportsRes] = await Promise.all([
          verificationAPI.getBatchDetails(batchId),
          verificationAPI.getSubmittedReports(batchId).catch(() => ({ data: null })),
        ]);
        if (cancelled) return;
        const detailData = detailRes?.data || null;
        setBatchDetail(detailData);
        setSubmittedReports(reportsRes?.data || null);

        // SDC generation is a separate workflow from the local Review→Verifier→
        // Verified pipeline — gate on the batch's actual SDC status (only present
        // on the detail response, the list endpoint never returns it).
        const sdcInfo = detailData?.verification_progress?.sdc;
        if (sdcInfo?.status) {
          await refreshSdcCertificates(batchId, detailData?.users || [], sdcInfo);
        }
      } catch (err) {
        if (!cancelled) toast.error(getApiError(err, 'Failed to load batch details'));
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
          setLoadingReports(false);
        }
      }
    })();

    loadManualAssignments(batchId);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  // Superadmin-only: permanently removes one customer from this batch.
  // Updates batchDetail locally (removes the row, decrements the count shown
  // in the "N records" badge) and refreshes the outer batch list so its
  // total_users/status stay in sync with what the backend recomputed.
  const handleDeleteBatchUser = useCallback(async (batchIdArg, record) => {
    const batchUserId = record.id || record.user_id;
    if (!batchUserId) return;
    setDeletingUserId(batchUserId);
    try {
      await verificationAPI.deleteBatchUser(batchIdArg, batchUserId);
      toast.success('Customer removed from batch');
      setBatchDetail((prev) => prev ? {
        ...prev,
        users: (prev.users || []).filter((u) => (u.id || u.user_id) !== batchUserId),
      } : prev);
      setConfirmDeleteUserId(null);
      fetchData();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to delete customer'));
    } finally {
      setDeletingUserId(null);
    }
  }, [fetchData]);

  // Smart Send needs actual per-user records to assign — the list endpoint
  // (GET /verification/batches) never returns a `users` array, only the
  // detail endpoint does. This page's own batchDetail is very likely already
  // loaded (this IS the Control Center), so reuse it instead of a redundant
  // fetch — the list page's own copy of this always fetches fresh since it
  // has no batchDetail cached at all.
  const openSmartSend = useCallback(async (batch) => {
    const cachedId = batchDetail?.batch_id || batchDetail?.id;
    if (batch.id === cachedId && Array.isArray(batchDetail?.users) && batchDetail.users.length) {
      setSmartSendBatch({ ...batch, records: batchDetail.users, verificationTypes: batchDetail?.verification_types || [] });
      setSmartSendOpen(true);
      return;
    }
    try {
      const { data } = await verificationAPI.getBatchDetails(batch.id);
      setSmartSendBatch({
        ...batch,
        records: Array.isArray(data?.users) ? data.users : batch.records,
        verificationTypes: data?.verification_types || [],
      });
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load batch records'));
      setSmartSendBatch(batch);
    }
    setSmartSendOpen(true);
  }, [batchDetail]);

  // Opens a blank tab synchronously (in the same tick as the click) and
  // redirects it once the URL arrives — awaiting the fetch first and only
  // then calling window.open gets silently blocked by most browsers since
  // it's no longer seen as a direct response to the user gesture.
  const openSdcCertificate = useCallback(async (publicId, kind = 'pdf') => {
    if (!publicId) return;
    setDownloadingSdcId(publicId);
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    try {
      const { data } = await sdcAPI.getRecord(publicId);
      const url = kind === 'verify' ? data?.verify : data?.pdf;
      if (url) {
        if (win) win.location.href = url;
      } else {
        win?.close();
        // Anchoring is async on Dhiway's side — a cert can show up in the
        // batch's certificate_ids (and so read as "Ready" here) slightly
        // before its .vc endpoint actually has a PDF/verify link. This is a
        // brief, expected finalizing window, not a real failure — a plain
        // error toast made it look broken.
        toast(`This certificate is still finalizing — try again in a moment.`, { icon: '⏳' });
      }
    } catch (err) {
      win?.close();
      toast.error(getApiError(err, 'Failed to fetch certificate'));
    } finally {
      setDownloadingSdcId(null);
    }
  }, []);

  const handleBulkSent = (batch, result) => {
    const sentRequests = result?.results || [];
    updateBatchWorkflow(batch.id, {
      sentRequests,
      uploadLink: sentRequests[0]?.upload_link || null,
    });
    fetchData(true);
    // Smart Send just persisted new verifier -> user assignment rows —
    // refetch so the Verification Records table's Verifier column and the
    // verifier filter reflect them immediately, no full page reload required.
    loadManualAssignments(batch.id);
  };

  const handleResend = async (requestId, verifierEmail) => {
    setResending(requestId);
    try {
      await verificationAPI.resendManualVerification(requestId);
      toast.success(`Verification link resent to ${verifierEmail}`);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to resend verification link'));
    } finally {
      setResending(null);
    }
  };

  // ── Action: Send to Organization ──────────────────────────────────────────
  // Real, persisted backend action — POST /verification/batches/{id}/
  // share-with-organization sets shared_with_org/shared_at/shared_by and
  // commits it. This is the actual security gate: until it succeeds, the org
  // caller's GET /sdc/batches/{id}/status returns certificate_ids: [] and
  // GET /sdc/records/{public_id} 403s, regardless of anything shown here. The
  // success toast must never fire before the API call actually succeeds, and
  // the UI must reflect the backend's own state afterward — not a locally
  // guessed value — hence the refetch rather than an optimistic local flip.
  const handleSendToOrganization = async (batch) => {
    setSendingToOrg(true);
    try {
      await verificationAPI.shareWithOrganization(batch.id);
      toast.success(`${batch.name} shared with the organization`);
      await fetchData(true);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to share batch with organization'));
    } finally {
      setSendingToOrg(false);
    }
  };

  if (!listLoading && !selectedBatch) {
    return (
      <AuthLayout title="Batch Control Center">
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-sm font-semibold text-brand-dark font-inter">Batch not found</p>
          <p className="text-xs text-gray-400 font-inter">It may have been deleted, or the link is out of date.</p>
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/admin/batch-monitor')}>
            Back to Batch Monitor
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (!selectedBatch) {
    return (
      <AuthLayout title="Batch Control Center">
        <div className="flex items-center justify-center py-24 gap-2">
          <RefreshCw size={18} className="animate-spin text-brand-blue" />
          <p className="text-sm text-gray-400 font-inter">Loading batch…</p>
        </div>
      </AuthLayout>
    );
  }

  // "Email to Verifiers" visibility is driven entirely by the batch's own
  // check labels from GET /verification/batches/{id} — never by any
  // hardcoded verification name. Each entry carries label: "automatic" |
  // "manual". `verification_checks` is the current field; `verification_types`
  // is the older name for the same list, kept as a fallback for batch
  // details that predate the rename. Shown when any manual check exists,
  // hidden only when every check is automatic — automatic checks run on
  // their own with no trigger needed from here. Anything not explicitly
  // "automatic" counts as manual, and an unknown/not-yet-loaded list shows
  // the button so the existing manual workflow is never hidden.
  const selectedBatchChecks = Array.isArray(batchDetail?.verification_checks)
    ? batchDetail.verification_checks
    : (Array.isArray(batchDetail?.verification_types) ? batchDetail.verification_types : []);
  const batchHasManualCheck =
    selectedBatchChecks.length === 0 ||
    selectedBatchChecks.some((c) => c?.label !== 'automatic');

  // The list endpoint (GET /verification/batches) never returns
  // verification_progress, so selectedBatch.sdcInfo is always stale —
  // prefer the detail response (batchDetail), which does have it.
  const sdcInfo = batchDetail?.verification_progress?.sdc || selectedBatch.sdcInfo || null;
  const detailRecords = batchDetail?.users || selectedBatch.records || [];
  const activeWorkflowIndex = WORKFLOW_STEPS.findIndex((item) => item.id === (batchDetail?.status || selectedBatch.status));

  // Category — not captured by the list-normaliser today; read defensively
  // off a couple of plausible raw field names and simply omit the row below
  // if none are present, rather than guessing/fabricating a value.
  const batchCategory = batchDetail?.industry_type || batchDetail?.category_name || batchDetail?.sector_name || null;

  // Stat-card "View X" links jump straight to the Verification Records
  // table, pre-filtered — there are no tabs to switch between any more.
  const scrollToRecords = (statusFilter) => {
    setRecordStatusFilter(statusFilter);
    requestAnimationFrame(() => document.getElementById('records-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // ── Per-verification-type aggregate across every record in the batch —
  // real data, derived from the same record.verification_type_status the
  // Batch Records tab already reads, just summed across all records instead
  // of shown per-record.
  const verificationTypeSummary = (() => {
    const map = {};
    detailRecords.forEach((record) => {
      Object.entries(record.verification_type_status || {}).forEach(([name, info]) => {
        if (!map[name]) map[name] = { name, approved: 0, total: 0 };
        map[name].total += 1;
        if (info?.status === 'approved') map[name].approved += 1;
      });
    });
    return Object.values(map);
  })();
  const allVerificationTypeNames = verificationTypeSummary.map((t) => t.name);

  // ── Verifier filter options — built from manual-assignments, the exact
  // persisted verifier -> assigned-user mapping, never from submittedReports
  // or verification types (Task F). Unique verifier identity prefers
  // verifier_id; falls back to verifier_email only when verifier_id is null,
  // so the same verifier appearing under several verification types still
  // collapses to exactly one global filter entry.
  const verifierOptions = (() => {
    const map = new Map();
    (manualAssignments?.assignments || []).forEach((a) => {
      const key = a.verifier_id || a.verifier_email;
      if (!key) return;
      if (!map.has(key)) map.set(key, { key, email: a.verifier_email || key });
    });
    return Array.from(map.values());
  })();

  // ── Per-record, per-verification-type verifier — the same manual-
  // assignments data, indexed the other way round for the table/modal: given
  // a record's exact BatchUser id and a verification type name, which
  // verifier (if any) is assigned to it. Never matched by name/email — only
  // assignment.users[].batch_user_id, exactly as Task I requires. A manual
  // type with no match here genuinely has no assignment recorded (not
  // "Automatic" — that's reserved for a type whose own label says so).
  const verifierByRecordAndType = (() => {
    const map = {};
    (manualAssignments?.assignments || []).forEach((a) => {
      const type = a.verification_type_name;
      if (!type) return;
      (a.users || []).forEach((u) => {
        if (!u.batch_user_id) return;
        if (!map[u.batch_user_id]) map[u.batch_user_id] = {};
        map[u.batch_user_id][type] = a.verifier_email || null;
      });
    });
    return map;
  })();

  // ── Exact verifier (+ optional verification-type) assignment lookup —
  // Task G/H. manual-assignments is the only source of truth for which
  // batch_user_id belongs to which verifier; this is never inferred from
  // verification_type_status, submitted reports, name, or email. When a
  // verification type is also selected, only assignment rows for that exact
  // type+verifier combination contribute ids (the true intersection); with
  // "All Verification Types" selected, every assignment row for that
  // verifier contributes.
  const selectedVerifierAssignedIds = (() => {
    if (!recordVerifierFilter) return null;
    const ids = new Set();
    (manualAssignments?.assignments || []).forEach((a) => {
      const verifierKey = a.verifier_id || a.verifier_email;
      if (verifierKey !== recordVerifierFilter) return;
      if (recordTypeFilter && a.verification_type_name !== recordTypeFilter) return;
      (a.users || []).forEach((u) => { if (u.batch_user_id) ids.add(u.batch_user_id); });
    });
    return ids;
  })();

  // ── Batch Records — search/status/type/verifier filters, all client-side
  // over already-loaded records. Verifier filtering (with or without a type
  // also selected) matches the record's exact BatchUser id — the same field
  // used everywhere else on this page (record.id, falling back to user_id/
  // entity_id for older shapes) — against selectedVerifierAssignedIds above.
  // With no verifier selected, the verification-type filter falls back to
  // its previous behavior: does this record carry that type at all.
  const filteredRecords = detailRecords.filter((record) => {
    if (recordStatusFilter !== 'all') {
      const label = record.overall_status_label
        || (record.verification_status === 'approved' ? 'verified' : record.verification_status) || 'pending';
      if (label !== recordStatusFilter) return false;
    }
    if (recordVerifierFilter) {
      const recordId = record.id || record.user_id || record.entity_id;
      if (!selectedVerifierAssignedIds || !selectedVerifierAssignedIds.has(recordId)) return false;
    } else if (recordTypeFilter && !(record.verification_type_status && recordTypeFilter in record.verification_type_status)) {
      return false;
    }
    if (recordSearch.trim()) {
      const q = recordSearch.trim().toLowerCase();
      const recordId = record.id || record.user_id || record.entity_id || '';
      const hay = `${recordTitle(record)} ${record.email || ''} ${recordId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Pagination over the filtered set (Export still exports the whole
  // filtered set, not just the visible page).
  const recordTotalPages = Math.max(1, Math.ceil(filteredRecords.length / recordPageSize));
  const safeRecordPage = Math.min(recordPage, recordTotalPages);
  const recordPageStart = (safeRecordPage - 1) * recordPageSize;
  const pagedRecords = filteredRecords.slice(recordPageStart, recordPageStart + recordPageSize);

  const toggleRecordSelected = (id) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportRecordsToExcel = (records, filenameSuffix) => {
    if (records.length === 0) { toast.error('No records to export'); return; }
    const rows = records.map((record) => {
      const checkEntries = Object.entries(record.verification_type_status || {});
      const rejections = checkEntries.filter(([, v]) => v?.status === 'rejected').map(([n, v]) => `${n}: ${v?.rejection_reason || 'rejected'}`);
      return {
        'Name / Email': recordTitle(record),
        'Email': record.email || '',
        'Overall Status': record.overall_status_label || record.verification_status || 'pending',
        'Verification Types': checkEntries.map(([n, v]) => `${n} (${v?.status || 'pending'})`).join('; '),
        'Issues / Rejection Reason': rejections.join('; ') || '-',
        'Last Updated': record.verified_at || record.updated_at || '',
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Records');
    XLSX.writeFile(workbook, `${selectedBatch.name.replace(/[^a-z0-9]+/gi, '-')}-${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${rows.length} record${rows.length === 1 ? '' : 's'}`);
  };

  return (
    <AuthLayout title="Batch Monitor">
      <div className="space-y-5">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/batch-monitor')}
            className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-brand-blue font-inter hover:underline"
          >
            <ArrowLeft size={14} /> Back to Batch Monitor
          </button>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <h1 className="font-sora text-2xl font-bold text-brand-dark truncate">{selectedBatch.name}</h1>
              <Badge status={selectedBatch.statusMeta.badge}>{selectedBatch.statusMeta.label}</Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline" size="sm" icon={Share2}
                disabled={!sdcInfo?.status || selectedBatch.sharedWithOrganization || sendingToOrg}
                title={selectedBatch.sharedWithOrganization ? 'Already shared with the organization' : (!sdcInfo?.status ? 'Generate SDC certificates first' : undefined)}
                onClick={() => handleSendToOrganization(selectedBatch)}
              >
                {selectedBatch.sharedWithOrganization ? 'Shared' : 'Share'}
              </Button>
              <Button variant="primary" size="sm" icon={Pencil} onClick={() => setEditBatchOpen(true)}>
                Edit Batch
              </Button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHeaderMenuOpen((p) => !p)}
                  className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-brand-dark transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
                {headerMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setHeaderMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => { setHeaderMenuOpen(false); setDeleteBatchTarget(selectedBatch); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-inter text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} /> Delete Batch
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 font-inter">
            <span className="flex items-center gap-1.5"><Building2 size={13} className="text-gray-400" /> {selectedBatch.orgName}</span>
            <span className="flex items-center gap-1.5"><Calendar size={13} className="text-gray-400" /> Created on {formatCreatedAt(selectedBatch.createdAt)}</span>
            <span className="flex items-center gap-1.5"><Users size={13} className="text-gray-400" /> {selectedBatch.total} Records</span>
            {batchCategory && <span className="flex items-center gap-1.5"><Package size={13} className="text-gray-400" /> {batchCategory}</span>}
            <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-gray-400" /> Stage {(activeWorkflowIndex + 1) || 1} of {WORKFLOW_STEPS.length}</span>
          </div>
        </div>

        {/* ── Success banner — only for the exact state it describes ───────── */}
        {(batchDetail?.status || selectedBatch.status) === 'sdc_generated' && batchDetail?.all_verifiers_submitted && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <CheckCircle size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 font-inter">SDC Generated Successfully</p>
                <p className="text-xs text-emerald-700 font-inter">All verifiers have submitted their reports.</p>
              </div>
            </div>
            <CheckCircle size={18} className="text-emerald-500 shrink-0" />
          </div>
        )}

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {[
            { key: 'total', label: 'Total Records', value: selectedBatch.total, icon: Users, tone: 'bg-blue-50 text-brand-blue', link: 'View all', onClick: () => scrollToRecords('all') },
            { key: 'pending', label: 'Pending', value: selectedBatch.pending, pct: selectedBatch.total ? Math.round((selectedBatch.pending / selectedBatch.total) * 100) : 0, icon: Clock, tone: 'bg-amber-50 text-amber-600', link: 'View pending', onClick: () => scrollToRecords('pending') },
            { key: 'verified', label: 'Verified', value: selectedBatch.verified, pct: selectedBatch.total ? Math.round((selectedBatch.verified / selectedBatch.total) * 100) : 0, icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-600', link: 'View verified', onClick: () => scrollToRecords('verified') },
            { key: 'failed', label: 'Failed', value: selectedBatch.failed, pct: selectedBatch.total ? Math.round((selectedBatch.failed / selectedBatch.total) * 100) : 0, icon: XCircle, tone: 'bg-red-50 text-red-500', link: 'View failed', onClick: () => scrollToRecords('rejected') },
            { key: 'verifiers', label: 'Verifiers Submission', value: `${batchDetail?.verifiers_submitted ?? 0}/${batchDetail?.verifiers_total ?? 0}`, pct: batchDetail?.verifiers_total ? Math.round(((batchDetail.verifiers_submitted || 0) / batchDetail.verifiers_total) * 100) : 0, icon: Users, tone: 'bg-indigo-50 text-indigo-600', link: 'View verifiers', onClick: () => navigate('/admin/verifiers') },
          ].map((card) => (
            <div key={card.key} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${card.tone}`}>
                  <card.icon size={16} />
                </div>
                {typeof card.pct === 'number' && (
                  <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-400 font-inter">{card.pct}%</span>
                )}
              </div>
              <p className="mt-2.5 text-xs text-gray-400 font-inter">{card.label}</p>
              <p className="font-sora font-bold text-xl text-brand-dark">{card.value}</p>
              <button type="button" onClick={card.onClick} className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand-blue font-inter hover:underline">
                {card.link} <ArrowRight size={10} />
              </button>
            </div>
          ))}
        </div>

        {/* ══ Overview ════════════════════════════════════════════════════════ */}
        <div id="overview-section">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">
            <div className="min-w-0 h-full">
              {/* Batch Workflow — h-full + flex-col so its content vertically
                  centers when this card stretches to match the taller Batch
                  Actions column, instead of leaving a dead gap below it. */}
              <div className="h-full flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-sora font-semibold text-brand-dark">Batch Workflow</p>
                    <p className="text-xs text-gray-400 font-inter mt-1">Track the progress of this batch through all stages</p>
                  </div>
                  {typeof batchDetail?.verifiers_total === 'number' && batchDetail.verifiers_total > 0 && (
                    <Badge status={batchDetail.all_verifiers_submitted ? 'success' : 'default'}>
                      {batchDetail.verifiers_submitted ?? 0}/{batchDetail.verifiers_total} verifiers submitted
                    </Badge>
                  )}
                </div>
                {/* Circles and connector lines share one items-center row, so
                    each line — a plain flex child, not a manually-guessed
                    margin-top offset — centers exactly through the circles'
                    height on its own. Labels are a second row built with the
                    identical w-16/flex-1 column pattern, so each one still
                    lands centered directly under its own circle. */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center">
                    {WORKFLOW_STEPS.map((step, index) => {
                      const completed = index < activeWorkflowIndex;
                      const active    = index === activeWorkflowIndex;
                      const StepIcon  = step.icon;
                      return (
                        <React.Fragment key={step.id}>
                          <div className="flex w-16 shrink-0 justify-center">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-colors ${
                              completed ? 'bg-brand-blue border-brand-blue text-white'
                                : active ? 'bg-white border-brand-blue text-brand-blue'
                                : 'bg-white border-gray-200 text-gray-300'
                            }`}>
                              {completed ? <CheckCircle size={16} /> : <StepIcon size={16} />}
                            </div>
                          </div>
                          {index < WORKFLOW_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 rounded-full transition-colors ${index < activeWorkflowIndex ? 'bg-brand-blue' : 'bg-gray-200'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex">
                    {WORKFLOW_STEPS.map((step, index) => {
                      const reached = index <= activeWorkflowIndex;
                      return (
                        <React.Fragment key={step.id}>
                          <span className={`w-16 shrink-0 text-center text-[11px] font-semibold font-inter leading-tight ${reached ? 'text-brand-dark' : 'text-gray-400'}`}>
                            {step.label}
                          </span>
                          {index < WORKFLOW_STEPS.length - 1 && <div className="flex-1" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Batch Actions */}
            <div className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-5 h-fit">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-sora font-semibold text-brand-dark">Batch Actions</p>
                  <p className="text-xs text-gray-400 font-inter mt-1">Whole-batch controls only</p>
                </div>
                {selectedBatch.sharedWithOrganization && <Badge status="success">Shared</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {batchHasManualCheck
                  && (selectedBatch.status === 'pending' || selectedBatch.status === 'processing' || selectedBatch.status === 'verification_in_progress') && (
                  <Button variant="primary" size="sm" icon={Zap} className="!px-2 text-xs text-center leading-tight"
                    onClick={() => openSmartSend(selectedBatch)}>
                    Email to Verifiers
                  </Button>
                )}
                <Button variant="outline" size="sm" icon={Sparkles} className="!px-2 text-xs text-center leading-tight"
                  disabled={!batchDetail?.can_generate_sdc}
                  title={!batchDetail?.can_generate_sdc ? 'This batch is not ready for SDC generation yet' : undefined}
                  onClick={() => setSdcGenerateBatch(selectedBatch)}>
                  {sdcInfo?.status ? 'Regenerate SDC' : 'Generate SDC'}
                </Button>
                <Button variant="outline" size="sm" icon={Send} className="!px-2 text-xs text-center leading-tight"
                  onClick={() => setRejectedListTarget(selectedBatch)}>
                  Send Rejected List
                </Button>
                {!!sdcInfo?.status && !selectedBatch.sharedWithOrganization && (
                  <Button variant="success" size="sm" icon={sendingToOrg ? RefreshCw : Send}
                    className="!px-2 text-xs text-center leading-tight" disabled={sendingToOrg}
                    onClick={() => handleSendToOrganization(selectedBatch)}>
                    {sendingToOrg ? 'Sending…' : 'Send to Organization'}
                  </Button>
                )}
                {!!sdcInfo?.status && (
                  <Button variant="outline" size="sm" icon={RefreshCw} className={`!px-2 text-xs text-center leading-tight ${sdcCertsLoading ? 'animate-pulse' : ''}`}
                    disabled={sdcCertsLoading}
                    onClick={() => refreshSdcCertificates(selectedBatch.id, batchDetail?.users || selectedBatch.records || [], batchDetail?.verification_progress?.sdc)}>
                    {sdcCertsLoading ? 'Refreshing…' : 'Refresh Certificates'}
                  </Button>
                )}
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5">
                <Info size={12} className="mt-0.5 shrink-0 text-brand-blue" />
                <p className="text-[11px] text-blue-700 font-inter leading-relaxed">
                  This will send an Excel file with all users who have at least one rejected verification, including rejection reasons.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Verification Records ─────────────────────────────────────────── */}
          <div id="records-section" className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div>
                <h4 className="font-sora font-semibold text-brand-dark">Verification Records</h4>
                <p className="text-xs text-gray-400 font-inter mt-1">View and manage verification status for each individual in this batch.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Button variant="outline" size="sm" icon={ChevronDown} onClick={() => setBulkMenuOpen((p) => !p)}>
                    Bulk Actions
                  </Button>
                  {bulkMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setBulkMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
                        <button
                          type="button"
                          disabled={selectedRecordIds.size === 0}
                          onClick={() => {
                            setBulkMenuOpen(false);
                            const selected = filteredRecords.filter((r) => selectedRecordIds.has(r.id || r.user_id || r.entity_id));
                            exportRecordsToExcel(selected, 'selected');
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-inter text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Download size={14} /> Export Selected ({selectedRecordIds.size})
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <Button variant="primary" size="sm" icon={Download} onClick={() => exportRecordsToExcel(filteredRecords, 'records')}>
                  Export
                </Button>
              </div>
            </div>

            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 flex-1 min-w-[220px]">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  placeholder="Search by name, email or record ID..."
                  className="w-full text-sm font-inter outline-none placeholder:text-gray-400"
                />
              </div>
              <CustomSelect
                className="w-full sm:w-40"
                value={recordStatusFilter}
                onChange={setRecordStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'verified', label: 'Verified' },
                  { value: 'partially_verified', label: 'Partially Verified' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
              <CustomSelect
                className="w-full sm:w-52"
                value={recordTypeFilter}
                onChange={setRecordTypeFilter}
                placeholder="All Verification Types"
                options={[
                  { value: '', label: 'All Verification Types' },
                  ...allVerificationTypeNames.map((name) => ({ value: name, label: name })),
                ]}
              />
              <CustomSelect
                className="w-full sm:w-52"
                value={recordVerifierFilter}
                onChange={setRecordVerifierFilter}
                placeholder="All Verifiers"
                options={[
                  { value: '', label: 'All Verifiers' },
                  ...verifierOptions.map((v) => ({ value: v.key, label: v.email })),
                ]}
              />
              <button
                type="button"
                onClick={() => { setRecordSearch(''); setRecordStatusFilter('all'); setRecordTypeFilter(''); setRecordVerifierFilter(''); }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold font-inter text-gray-500 hover:bg-gray-50"
              >
                <RefreshCw size={13} /> Reset
              </button>
            </div>

            <div className="overflow-x-auto">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <RefreshCw size={16} className="animate-spin text-brand-blue" />
                  <p className="text-sm text-gray-400 font-inter">Loading records…</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400 font-inter">{detailRecords.length === 0 ? 'No records found for this batch' : 'No records match the selected filters.'}</p>
                </div>
              ) : (
                <table className="w-full min-w-[1300px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 w-10">
                        <input
                          type="checkbox"
                          checked={pagedRecords.length > 0 && pagedRecords.every((r) => selectedRecordIds.has(r.id || r.user_id || r.entity_id))}
                          onChange={(e) => {
                            const ids = pagedRecords.map((r) => r.id || r.user_id || r.entity_id);
                            setSelectedRecordIds((prev) => {
                              const next = new Set(prev);
                              ids.forEach((id) => (e.target.checked ? next.add(id) : next.delete(id)));
                              return next;
                            });
                          }}
                          className="accent-brand-blue"
                        />
                      </th>
                      <th className="px-2 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">#</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Record</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter w-48">Verification</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter w-48">Verifier</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter w-36">Report</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Overall</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter">Certificate</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-gray-500 font-inter w-44">Issues</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase text-gray-500 font-inter">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedRecords.map((record, pageIndex) => {
                      const index = recordPageStart + pageIndex;
                      const status = statusBadge(record.overall_status_label || record.verification_status);
                      const batchUserId = record.id || record.user_id || record.entity_id;
                      const checkEntries = Object.entries(record.verification_type_status || {});
                      const rejections = checkEntries.filter(([, v]) => v?.status === 'rejected' && v?.rejection_reason);
                      // Certificate — same matchSdcRecord() this page already
                      // uses for the modal's SDC column, keyed by stable
                      // BatchUser/product identity, never by display name.
                      const certMatch = matchSdcRecord(record);
                      const certState = certMatch ? (certMatch.issued ? 'Ready' : 'Draft') : 'Not Generated';
                      const certBadgeStatus = certMatch ? (certMatch.issued ? 'info' : 'pending') : 'default';
                      return (
                        <tr key={batchUserId} className="hover:bg-gray-50/70 transition-colors align-top">
                          <td className="px-4 py-3.5">
                            <input
                              type="checkbox"
                              checked={selectedRecordIds.has(batchUserId)}
                              onChange={() => toggleRecordSelected(batchUserId)}
                              className="accent-brand-blue"
                            />
                          </td>
                          <td className="px-2 py-3.5 text-sm text-gray-400 font-inter">{index + 1}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold font-inter ${avatarTone(batchUserId)}`}>
                                {getInitials(recordTitle(record))}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-brand-dark font-inter truncate">{recordTitle(record)}</p>
                                <p className="text-xs text-gray-400 font-inter truncate">{record.email || '—'}</p>
                              </div>
                            </div>
                          </td>
                          {/* Verification — one compact line per type: dot + name + status. */}
                          <td className="px-4 py-3.5">
                            {checkEntries.length === 0 ? (
                              <span className="text-xs text-gray-300 font-inter">—</span>
                            ) : (
                              <div className="space-y-1">
                                {checkEntries.map(([name, info]) => {
                                  const checkStatus = info?.status || 'pending';
                                  const dotTone = checkStatus === 'approved' ? 'bg-green-500' : checkStatus === 'rejected' ? 'bg-red-500' : 'bg-amber-400';
                                  const textTone = checkStatus === 'approved' ? 'text-green-600' : checkStatus === 'rejected' ? 'text-red-500' : 'text-amber-600';
                                  const label = checkStatus === 'approved' ? 'Verified' : checkStatus === 'rejected' ? 'Rejected' : 'Pending';
                                  return (
                                    <div key={name} className="flex min-w-0 items-start gap-1.5" title={name}>
                                      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dotTone}`} />
                                      <div className="min-w-0">
                                        <p className="truncate text-[11px] text-gray-600 font-inter">{name}</p>
                                        <p className={`text-[11px] font-semibold font-inter ${textTone}`}>{label}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          {/* Verifier — per type, from manual-assignments (exact
                              batch_user_id match), never inferred from name/email. */}
                          <td className="px-4 py-3.5">
                            {checkEntries.length === 0 ? (
                              <span className="text-xs text-gray-300 font-inter">—</span>
                            ) : (
                              <div className="space-y-1.5">
                                {checkEntries.map(([name, info]) => {
                                  const isAutomatic = info?.label === 'automatic';
                                  const verifierEmail = verifierByRecordAndType[batchUserId]?.[name];
                                  return (
                                    <div key={name} className="min-w-0">
                                      <p className="truncate text-[10px] uppercase tracking-wide text-gray-400 font-inter">{name}</p>
                                      <p className="truncate text-[11px] font-medium text-gray-600 font-inter" title={verifierEmail || undefined}>
                                        {isAutomatic ? 'Automatic' : (verifierEmail || '—')}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          {/* Report — availability per type, from the same
                              verification_type_status.report_url every "View
                              Report" action already uses; never a raw gs://
                              path treated as directly openable. */}
                          <td className="px-4 py-3.5">
                            {checkEntries.length === 0 ? (
                              <span className="text-xs text-gray-300 font-inter">—</span>
                            ) : (
                              <div className="space-y-1.5">
                                {checkEntries.map(([name, info]) => {
                                  const reportUrl = info?.report_url;
                                  const canView = typeof reportUrl === 'string' && /^https?:\/\//i.test(reportUrl);
                                  const state = canView ? 'Available' : (reportUrl ? 'Pending' : 'Not Uploaded');
                                  const tone = canView ? 'text-green-600' : 'text-gray-400';
                                  return (
                                    <p key={name} className={`text-[11px] font-medium font-inter ${tone}`}>{state}</p>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge status={status.variant}>{status.label}</Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge status={certBadgeStatus}>{certState}</Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            {rejections.length === 0 ? (
                              <span className="text-xs text-gray-300 font-inter">-</span>
                            ) : (
                              <p className="text-xs text-red-500 font-inter leading-snug">
                                {rejections[0][1].rejection_reason}
                                {rejections.length > 1 && <span className="text-gray-400"> (+{rejections.length - 1} more)</span>}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setVerificationDetailsRecord(record)}
                                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold font-inter text-brand-blue hover:bg-blue-50 transition-colors"
                              >
                                <Eye size={12} /> View
                              </button>
                              {confirmDeleteUserId === batchUserId ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={deletingUserId === batchUserId}
                                    onClick={() => handleDeleteBatchUser(selectedBatch.id, record)}
                                    className="rounded-md px-2 py-1 text-xs font-semibold font-inter text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                                  >
                                    {deletingUserId === batchUserId ? '…' : 'Yes'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingUserId === batchUserId}
                                    onClick={() => setConfirmDeleteUserId(null)}
                                    className="rounded-md px-2 py-1 text-xs font-semibold font-inter text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  title="Permanently delete this customer from the batch"
                                  onClick={() => setConfirmDeleteUserId(batchUserId)}
                                  className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {!loadingDetail && (
              <TablePagination
                page={recordPage}
                pageSize={recordPageSize}
                total={filteredRecords.length}
                onPageChange={setRecordPage}
                onPageSizeChange={setRecordPageSize}
              />
            )}
          </div>
        {/* ── Manual Verifications Sent — resend-link utility, distinct from the
            removed standalone Submitted Reports section; report status/
            verifier/report data now lives in Verification Records + its View
            modal instead. ── */}
        <div id="reports-section">
            {selectedBatch.sentRequests?.length > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-white p-5 mb-4">
                <div className="mb-4">
                  <p className="font-sora font-semibold text-brand-dark">Manual Verifications Sent</p>
                  <p className="text-xs text-gray-400 font-inter mt-1">Resend the link if a verifier didn't receive it.</p>
                </div>
                <div className="space-y-3">
                  {selectedBatch.sentRequests.map((req) => (
                    <div
                      key={req.request_id || req.verification_type_name}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                        req.status === 'failed' ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${req.status === 'failed' ? 'bg-red-100 text-red-500' : 'bg-brand-blue/10 text-brand-blue'}`}>
                          <Mail size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-brand-dark font-inter truncate">{req.verification_type_name}</p>
                          <p className="text-xs text-gray-500 font-inter truncate">{req.verifier_email}</p>
                          {req.error && <p className="text-xs text-red-500 font-inter mt-0.5">{req.error}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge status={req.status === 'failed' ? 'error' : 'success'}>{req.status || 'sent'}</Badge>
                        {req.status !== 'failed' && (
                          <button
                            type="button"
                            disabled={resending === (req.request_id || req.token)}
                            onClick={() => handleResend(req.request_id || req.token, req.verifier_email)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-white text-xs font-semibold font-inter text-brand-blue hover:bg-blue-50 disabled:opacity-50 transition-colors"
                          >
                            <RefreshCw size={12} className={resending === (req.request_id || req.token) ? 'animate-spin' : ''} />
                            {resending === (req.request_id || req.token) ? 'Resending...' : 'Resend'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

        </div>
      </div>

      {/* ── Edit Batch Modal (local-only display rename) ────────────────── */}
      <EditBatchModal
        batch={editBatchOpen ? selectedBatch : null}
        onClose={() => setEditBatchOpen(false)}
        onSave={(name) => updateBatchWorkflow(selectedBatch.id, { edited: { name } })}
      />

      {/* ── Delete Batch Modal ───────────────────────────────────────────── */}
      <DeleteBatchModal
        batch={deleteBatchTarget}
        onClose={() => setDeleteBatchTarget(null)}
        onDeleted={() => { setDeleteBatchTarget(null); navigate('/admin/batch-monitor'); }}
      />

      {/* ── Smart Send Modal ────────────────────────────────────────────── */}
      <SmartSendModal
        isOpen={smartSendOpen}
        onClose={() => { setSmartSendOpen(false); setSmartSendBatch(null); }}
        onSent={(result) => { handleBulkSent(smartSendBatch, result); setSmartSendOpen(false); setSmartSendBatch(null); }}
        batch={smartSendBatch}
      />

      {/* ── Send Rejected List Modal ─────────────────────────────────────────── */}
      <SendRejectedListModal
        batch={rejectedListTarget}
        onClose={() => setRejectedListTarget(null)}
      />

      {/* ── Verification Details Modal (per-type status/verifier/report + certificate) ─── */}
      {(() => {
        const vdRecordId = verificationDetailsRecord
          ? (verificationDetailsRecord.id || verificationDetailsRecord.user_id || verificationDetailsRecord.entity_id)
          : null;
        const vdCertMatch = verificationDetailsRecord ? matchSdcRecord(verificationDetailsRecord) : null;
        const vdCertificate = verificationDetailsRecord
          ? {
              status: vdCertMatch ? (vdCertMatch.issued ? 'ready' : 'draft') : 'not_generated',
              label: vdCertMatch ? (vdCertMatch.issued ? 'Ready' : 'Draft') : 'Not Generated',
              canView: !!vdCertMatch,
              canDownload: !!vdCertMatch,
              downloading: vdCertMatch ? downloadingSdcId === vdCertMatch.publicId : false,
            }
          : null;
        return (
          <VerificationDetailsModal
            record={verificationDetailsRecord}
            title={verificationDetailsRecord ? recordTitle(verificationDetailsRecord) : ''}
            subtitle={verificationDetailsRecord?.email || verificationDetailsRecord?.product_name || ''}
            onClose={() => setVerificationDetailsRecord(null)}
            verifierByType={vdRecordId ? verifierByRecordAndType[vdRecordId] : undefined}
            certificate={vdCertificate}
            onViewCertificate={() => vdCertMatch && openSdcCertificate(vdCertMatch.publicId, 'verify')}
            onDownloadCertificate={() => vdCertMatch && openSdcCertificate(vdCertMatch.publicId, 'pdf')}
          />
        );
      })()}

      {/* ── Generate SDC Modal — same component/flow as SDC Verification ─── */}
      {sdcGenerateBatch && (
        <GenerateSDCModal
          batch={sdcGenerateBatch}
          records={batchDetail?.users || sdcGenerateBatch.records || []}
          liveStatus={sdcLiveStatus?.batchId === sdcGenerateBatch.id ? sdcLiveStatus : null}
          polling={sdcPollingBatchId === sdcGenerateBatch.id}
          onClose={() => { setSdcGenerateBatch(null); setSdcLiveStatus(null); }}
          onGenerated={() => {
            const generatedBatchId = sdcGenerateBatch.id;
            setData((prev) => (prev || []).map((b) => (
              b.id === generatedBatchId ? { ...b, sdcInfo: { ...(b.sdcInfo || {}), status: 'draft_created' } } : b
            )));
            pollSdcStatusUntilDone(generatedBatchId);
          }}
        />
      )}

      <CertificateDetailModal
        record={detailRecord}
        sdcMatch={detailRecord ? matchSdcRecord(detailRecord) : null}
        instanceKey="de"
        onClose={() => setDetailRecord(null)}
      />
    </AuthLayout>
  );
};

export default BatchControlCenter;
