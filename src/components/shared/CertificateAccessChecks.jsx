import { useEffect, useState } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { fetchReportBlob } from '@/services/api';
import { retryAfterText } from '@/utils/reportAccess';
import { checkStatusMeta, expiryText, isSelectableCheck, legacyNote } from '@/utils/accessChecks';
import { formatAccessDate } from '@/utils/certificateAccess';

export const CheckStatusChip = ({ status }) => {
  const meta = checkStatusMeta(status);
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.tone}`}>{meta.label}</span>;
};

// The checks in the holder's SDC, by name only. Approved, requested, declined and expired checks are shown but
// cannot be ticked; a legacy combined report toggles with the checks it covers.
export const ChecksSelector = ({ checks, selected, onToggle, disabled = false }) => (
  <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
    {checks.map((check) => {
      const selectable = isSelectableCheck(check) && !disabled;
      const note = legacyNote(check);
      const left = check.status === 'approved' ? expiryText(check.expiresAt) : '';
      return (
        <li key={check.id}>
          <label className={`flex items-start gap-3 px-4 py-3 ${selectable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}>
            <input
              type="checkbox"
              checked={selected.has(check.id)}
              disabled={!selectable}
              onChange={() => onToggle(check.id)}
              aria-label={`Request ${check.name}`}
              className="mt-1 accent-brand-blue disabled:opacity-40"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-800">{check.name}</span>
              {note && <span className="mt-0.5 block text-xs leading-5 text-amber-700">{note}</span>}
              {check.status === 'approved' && check.expiresAt && (
                <span className="mt-0.5 block text-xs text-gray-500">Access until {formatAccessDate(check.expiresAt)}{left ? ` · ${left}` : ''}</span>
              )}
              {check.status === 'expired' && <span className="mt-0.5 block text-xs text-gray-500">The access period ended or the certificate changed. Start a new request to ask again.</span>}
              {check.status === 'rejected' && <span className="mt-0.5 block text-xs text-gray-500">The holder declined this check.</span>}
            </span>
            <CheckStatusChip status={check.status} />
          </label>
        </li>
      );
    })}
  </ul>
);

const ReportViewer = ({ report, onClose }) => {
  const isPdf = report.blob.type === 'application/pdf';
  const isImage = report.blob.type.startsWith('image/');
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <p className="flex items-center gap-2 text-xs font-medium text-gray-700"><FileText size={14} /> {report.label || 'Verification report'}</p>
        <div className="flex items-center gap-3">
          <a href={report.url} download="verification-report" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"><Download size={13} /> Download</a>
          <button type="button" onClick={onClose} className="text-xs font-medium text-gray-500 hover:text-gray-700">Close</button>
        </div>
      </div>
      {isPdf ? <iframe src={report.url} title="Verification report" className="h-[70vh] w-full border-0" />
        : isImage ? <img src={report.url} alt="Verification report" className="mx-auto max-h-[70vh] w-auto" />
          : <p className="px-4 py-6 text-center text-sm text-gray-600">This file can’t be previewed here. Use Download to open it.</p>}
    </div>
  );
};

// The reports the holder approved, each opened by fetching it with the token and showing a blob (no URL is ever
// stored). A 403 means the access ended; `onExpired` lets the page refresh its list.
export const ApprovedReports = ({ reports, accessToken, onExpired, onRefresh, refreshing = false }) => {
  const [openKey, setOpenKey] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => () => { if (report?.url) URL.revokeObjectURL(report.url); }, [report]);

  const open = async (item) => {
    if (openKey || !accessToken) return;
    setOpenKey(item.key);
    setError('');
    try {
      const blob = await fetchReportBlob(item.url, { accessToken });
      const url = URL.createObjectURL(blob);
      setReport({ blob, label: item.label, url });
    } catch (err) {
      if (err?.status === 403) {
        setError('You do not have access to this report.');
        onExpired?.();
      } else {
        setError(err?.status === 429 ? `Too many attempts. ${retryAfterText(err.retryAfter)}` : (err?.message || 'The report could not be opened.'));
      }
    } finally {
      setOpenKey('');
    }
  };

  if (!reports.length) return null;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-gray-700">Approved reports ({reports.length})</p>
        {onRefresh && (
          <button type="button" onClick={onRefresh} disabled={refreshing} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline disabled:opacity-60">
            <RefreshCw size={12} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} /> Refresh
          </button>
        )}
      </div>
      <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100">
        {reports.map((item) => {
          const left = expiryText(item.expiresAt);
          return (
            <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-800"><FileText size={14} className="shrink-0 text-gray-500" />{item.label}</span>
                {(item.expiresAt || item.checks.length > 0) && (
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {item.checks.length > 0 ? `${item.checks.join(', ')}` : ''}{item.checks.length > 0 && item.expiresAt ? ' · ' : ''}{item.expiresAt ? `Access until ${formatAccessDate(item.expiresAt)}${left ? ` (${left})` : ''}` : ''}
                  </span>
                )}
              </span>
              <button type="button" onClick={() => open(item)} disabled={!!openKey} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                {openKey === item.key && <RefreshCw size={13} className="animate-spin motion-reduce:animate-none" />} View
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      {report && <ReportViewer report={report} onClose={() => setReport(null)} />}
    </div>
  );
};
