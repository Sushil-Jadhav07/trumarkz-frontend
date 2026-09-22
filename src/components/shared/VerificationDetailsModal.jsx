import React, { useState } from 'react';
import { CheckCircle, Clock, Download, Eye, RefreshCw, XCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { triggerBlobDownload } from '@/services/api';

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

// overall_status_label — new, purely-presentational per-user field
// (verified/partially_verified/rejected/pending), computed server-side from
// every verification_type_status entry. Shared by admin and organization
// views so both read the exact same four labels/tones. Distinct from the
// internal verification_status the backend logic still reads unchanged —
// never feed this back into any eligibility check.
export const OVERALL_STATUS_META = {
  verified:           { label: 'Verified',           badge: 'success' },
  partially_verified: { label: 'Partially Verified',  badge: 'partial' },
  rejected:           { label: 'Rejected',            badge: 'error' },
  pending:            { label: 'Pending',             badge: 'pending' },
};

const CHECK_META = {
  approved: { icon: CheckCircle, tone: 'text-green-600', ring: 'bg-green-100 text-green-600', label: 'Verified' },
  rejected: { icon: XCircle,     tone: 'text-red-500',   ring: 'bg-red-100 text-red-600',     label: 'Rejected' },
  pending:  { icon: Clock,       tone: 'text-amber-500', ring: 'bg-amber-100 text-amber-600',  label: 'Pending' },
};

// The User → Verification Type → Status → Rejection Reason → Report
// hierarchy, read straight off record.verification_type_status (already
// present on every user returned by GET /verification/batches/{batch_id} —
// no separate fetch needed). Shared by BatchMonitor (admin) and BatchStatus
// (organization) — same data shape, same rules, on both sides.
//
// report_url here is either the manual/third-party public HTTPS proxy shape
// (…/verification/manual/reports/{request_id}/view/{file_index} — its last
// path segment is a numeric file_index, never a real filename, so it's never
// used as a display label) or, for an automatic check, a raw gs:// storage
// path — only the former is ever safe to open directly, so canView guards on
// an actual http(s) URL rather than assuming every report_url is browser-openable.
const TypeRow = ({ name, info }) => {
  const [downloading, setDownloading] = useState(false);
  const checkStatus = info?.status || 'pending';
  const meta = CHECK_META[checkStatus] || CHECK_META.pending;
  const StatusIcon = meta.icon;
  const reportUrl = info?.report_url;
  const canView = typeof reportUrl === 'string' && /^https?:\/\//i.test(reportUrl);

  // report_url is the same public proxy link "View Report" opens — fetched
  // as a blob so it saves to disk instead of just navigating to it. Falls
  // back to opening it in a new tab if the fetch itself fails (e.g. a
  // CORS-restricted host), so the click never does nothing.
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(reportUrl);
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      triggerBlobDownload(blob, `${name.replace(/\s+/g, '_')}_report`);
    } catch {
      window.open(reportUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.ring}`}>
            <StatusIcon size={14} />
          </span>
          <p className="min-w-0 truncate text-sm font-semibold text-brand-dark font-inter">{name}</p>
          {info?.label && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 font-inter">
              {info.label}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
          {canView && (
            <>
              <button
                type="button"
                onClick={() => window.open(reportUrl, '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold font-inter text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Eye size={12} /> View Report
              </button>
              {/* A rejected report was already found unusable — no reason to
                  offer a fresh download of it, only viewing it for reference. */}
              {checkStatus !== 'rejected' && (
                <button
                  type="button"
                  disabled={downloading}
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold font-inter text-brand-blue hover:bg-blue-50 disabled:opacity-50 transition-colors"
                >
                  {downloading ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                  Download
                </button>
              )}
            </>
          )}
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold font-inter ${meta.ring}`}>
            {meta.label}
          </span>
        </div>
      </div>
      {checkStatus === 'rejected' && info?.rejection_reason && (
        <p className="mt-2.5 ml-9 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-600 font-inter">
          <span className="font-semibold">Reason: </span>{info.rejection_reason}
        </p>
      )}
    </div>
  );
};

export const VerificationDetailsModal = ({ record, title, subtitle, onClose }) => {
  if (!record) return null;
  const checkEntries = Object.entries(record.verification_type_status || {});
  const overallMeta = OVERALL_STATUS_META[record.overall_status_label] || null;

  return (
    <Modal
      isOpen={!!record}
      onClose={onClose}
      title="Verification Details"
      description="View verification information for this record."
      size="2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold font-sora ${avatarTone(title || 'record')}`}>
              {getInitials(title)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-dark font-inter truncate">{title}</p>
              {subtitle && <p className="text-xs text-gray-400 font-inter truncate">{subtitle}</p>}
            </div>
          </div>
          {overallMeta && <Badge status={overallMeta.badge}>{overallMeta.label}</Badge>}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 font-inter">
            Verification Item{checkEntries.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-2.5">
            {checkEntries.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400 font-inter">No verification types recorded for this record.</p>
            ) : (
              checkEntries.map(([name, info]) => <TypeRow key={name} name={name} info={info} />)
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default VerificationDetailsModal;
