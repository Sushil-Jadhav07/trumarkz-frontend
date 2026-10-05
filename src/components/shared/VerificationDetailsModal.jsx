import React from 'react';
import { CheckCircle, Clock, Download, Eye, RefreshCw, XCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { RecordDocuments } from '@/components/shared/RecordDocuments';

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
  approved: { icon: CheckCircle, tone: 'text-green-600', ring: 'bg-green-100 text-green-600', label: 'Approved' },
  rejected: { icon: XCircle,     tone: 'text-red-500',   ring: 'bg-red-100 text-red-600',     label: 'Rejected' },
  pending:  { icon: Clock,       tone: 'text-amber-500', ring: 'bg-amber-100 text-amber-600',  label: 'Pending' },
};

// The User → Verification Type → Status → Rejection Reason → Report
// hierarchy, read straight off record.verification_type_status (already
// present on every user returned by GET /verification/batches/{batch_id} —
// no separate fetch needed). Shared by BatchControlCenter (admin) and
// BatchStatus (organization) — same data shape, same rules, on both sides.
//
// report_url here is either the manual/third-party public HTTPS proxy shape
// (…/verification/manual/reports/{request_id}/view/{file_index} — its last
// path segment is a numeric file_index, never a real filename, so it's never
// used as a display label) or, for an automatic check, a raw gs:// storage
// path — only the former is ever safe to open directly, so canView guards on
// an actual http(s) URL rather than assuming every report_url is browser-openable.
//
// verifierEmail is optional — only the caller that has manual-assignments
// data (BatchControlCenter) passes it, matched by the record's exact
// BatchUser id, never by name/email. When absent this line is simply
// omitted rather than guessed.
const TypeRow = ({ name, info, verifierEmail }) => {
  const checkStatus = info?.status || 'pending';
  const meta = CHECK_META[checkStatus] || CHECK_META.pending;
  const StatusIcon = meta.icon;
  const reportUrl = info?.report_url;
  const canView = typeof reportUrl === 'string' && /^https?:\/\//i.test(reportUrl);
  const isAutomatic = info?.label === 'automatic';

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
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold font-inter ${meta.ring}`}>
            {meta.label}
          </span>
        </div>
      </div>
      {/* Assigned verifier — never a fake value; a manual type with no
          assignment match shows nothing here rather than guessing. */}
      {(isAutomatic || verifierEmail) && (
        <p className="mt-2 ml-9 text-xs text-gray-400 font-inter">
          <span className="font-semibold text-gray-500">Verifier: </span>
          {isAutomatic ? 'Automatic' : verifierEmail}
        </p>
      )}
      {checkStatus === 'rejected' && info?.rejection_reason && (
        <p className="mt-2 ml-9 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-600 font-inter">
          <span className="font-semibold">Reason: </span>{info.rejection_reason}
        </p>
      )}
      {!canView && checkStatus !== 'rejected' && (
        <p className="mt-2 ml-9 text-xs text-gray-400 font-inter">
          {reportUrl ? 'Report pending review.' : 'No report available.'}
        </p>
      )}
    </div>
  );
};

// certificate (optional, admin-only today): { status: 'ready'|'draft'|'not_generated', label, canView, canDownload, downloading }
const CertificateSection = ({ certificate, onView, onDownload }) => {
  if (!certificate) return null;
  const meta = certificate.status === 'ready'
    ? { badge: 'info', label: certificate.label || 'Ready' }
    : certificate.status === 'draft'
      ? { badge: 'pending', label: certificate.label || 'Draft' }
      : { badge: 'default', label: certificate.label || 'Not Generated' };

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 font-inter">Certificate</p>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3">
        <Badge status={meta.badge}>{meta.label}</Badge>
        {(certificate.canView || certificate.canDownload) && (
          <div className="flex items-center gap-2">
            {certificate.canView && (
              <button
                type="button"
                onClick={onView}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold font-inter text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Eye size={12} /> View Certificate
              </button>
            )}
            {certificate.canDownload && (
              <button
                type="button"
                disabled={certificate.downloading}
                onClick={onDownload}
                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold font-inter text-brand-blue hover:bg-blue-50 disabled:opacity-50 transition-colors"
              >
                {certificate.downloading ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                Download Certificate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// One verification check for ONE record — driven entirely by the exact
// { record, typeName } pair that was clicked. Reads only
// record.verification_type_status[typeName]; never searches other records or
// other types. verifierEmail is resolved by the caller for that same pair.
export const VerificationCheckDetailsModal = ({ selection, title, verifierEmail, onClose }) => {
  if (!selection) return null;
  const { record, typeName } = selection;
  const check = record?.verification_type_status?.[typeName];
  const rawStatus = String(check?.status || 'pending').toLowerCase();
  const isVerified = rawStatus === 'approved' || rawStatus === 'verified';
  const isRejected = rawStatus === 'rejected';
  const cardStatus = isVerified ? 'approved' : isRejected ? 'rejected' : 'pending';
  const meta = CHECK_META[cardStatus];
  const StatusIcon = meta.icon;
  const isAutomatic = check?.label === 'automatic';
  const typeLabel = check?.label ? String(check.label).toUpperCase() : null;
  const reportUrl = check?.report_url;
  const canViewReport = isVerified && typeof reportUrl === 'string' && /^https?:\/\//i.test(reportUrl);
  const rejectionReason = check?.rejection_reason || check?.reason || check?.detail;
  const verifierText = isAutomatic ? 'Automatic' : (verifierEmail || '—');

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Verification Details"
      description="Status and report for this verification check."
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold font-sora ${avatarTone(title || 'record')}`}>
            {getInitials(title)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-dark font-inter">{title}</p>
            {(record?.email || record?.product_name) && (
              <p className="truncate text-xs text-gray-400 font-inter">{record.email || record.product_name}</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.ring}`}>
                <StatusIcon size={15} />
              </span>
              <p className="min-w-0 text-sm font-semibold leading-snug text-brand-dark font-inter">{typeName}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold font-inter ${meta.ring}`}>
              {meta.label}
            </span>
          </div>

          <dl className="divide-y divide-gray-100 border-t border-gray-100 text-sm font-inter">
            {typeLabel && (
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-xs text-gray-400">Type</dt>
                <dd>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{typeLabel}</span>
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-xs text-gray-400">Verifier</dt>
              <dd className="min-w-0 break-all text-right font-medium text-gray-700">{verifierText}</dd>
            </div>
            {!isRejected && (
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-xs text-gray-400">Report</dt>
                <dd>
                  {canViewReport ? (
                    <button
                      type="button"
                      onClick={() => window.open(reportUrl, '_blank', 'noopener,noreferrer')}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-blue hover:bg-blue-50 transition-colors"
                    >
                      <Eye size={12} /> View Report
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {isVerified ? 'No report available' : 'Awaiting verifier decision'}
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>

          {isRejected && rejectionReason && (
            <div className="border-t border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400 font-inter">Rejection Reason</p>
              <p className="mt-1 text-sm text-red-600 font-inter">{rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export const VerificationDetailsModal = ({
  record, title, subtitle, onClose,
  verifierByType, certificate, onViewCertificate, onDownloadCertificate,
  showDocuments = false,
}) => {
  if (!record) return null;
  const checkEntries = Object.entries(record.verification_type_status || {});
  const overallMeta = OVERALL_STATUS_META[record.overall_status_label] || null;

  return (
    <Modal
      isOpen={!!record}
      onClose={onClose}
      title="Verification Details"
      description="View verification information for this record."
      size={showDocuments ? '6xl' : '2xl'}
      containerClassName={showDocuments ? 'w-full max-w-6xl' : ''}
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
            Verification Check{checkEntries.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-2.5">
            {checkEntries.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400 font-inter">No verification types recorded for this record.</p>
            ) : (
              checkEntries.map(([name, info]) => (
                <TypeRow key={name} name={name} info={info} verifierEmail={verifierByType?.[name]} />
              ))
            )}
          </div>
        </div>

        {showDocuments && <RecordDocuments key={record.id || record.user_id || record.entity_id} record={record} />}
        <CertificateSection certificate={certificate} onView={onViewCertificate} onDownload={onDownloadCertificate} />
      </div>
    </Modal>
  );
};

export default VerificationDetailsModal;
