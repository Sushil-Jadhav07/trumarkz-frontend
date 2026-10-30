import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, Users, Search, FolderOpen, CheckCircle2, FileCheck2, X } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/shared/TablePagination';
import { verificationAPI, getApiError } from '@/services/api';
import { ViewReportButton } from '@/components/shared/ViewReportButton';
import { emailRecipientBatchOptions, recipientReportUrl } from '@/utils/emailDraftRecipients';

const recipientError = (err) => {
  const status = err?.response?.status;
  if (status === 404) return 'Recipients are unavailable for this batch and verification type. The batch or type may be unavailable, or this backend may not yet have the new recipients endpoint.';
  if (status === 400 || status === 422) return 'The backend could not accept this batch selection. Refresh the batch list and select a batch again.';
  if (status === 401 || status === 403) return 'You do not have access to these recipients. Check your Super Admin session.';
  return getApiError(err, 'Failed to load recipients. Please try again.');
};

export const EmailDraftRecipients = ({ verificationType, verificationSelector }) => {
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batchesError, setBatchesError] = useState(null);
  const [batchReload, setBatchReload] = useState(0);
  const [batchId, setBatchId] = useState('');
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    setBatchesLoading(true);
    setBatchesError(null);
    verificationAPI.getBatches()
      .then(({ data }) => {
        if (!active) return;
        const options = emailRecipientBatchOptions(data);
        setBatches(options);
        setBatchId((current) => options.some((option) => option.value === current) ? current : '');
      })
      .catch((err) => {
        if (!active) return;
        setBatches([]);
        setBatchId('');
        setBatchesError(getApiError(err, 'Failed to load batches. Please try again.'));
      })
      .finally(() => { if (active) setBatchesLoading(false); });
    return () => { active = false; };
  }, [batchReload]);

  useEffect(() => {
    setPage(1);
    setSearch('');
    if (!batchId || !verificationType) { setResult(null); return; }
    let active = true;
    const controller = new AbortController();
    const scope = { batchId, verificationType };
    setResult({ ...scope, loading: true, users: [], error: null });
    verificationAPI.getEmailDraftRecipients(verificationType, batchId, { signal: controller.signal })
      .then(({ data }) => {
        if (!active) return;
        if (!Array.isArray(data?.users)) throw new Error('The recipients response did not contain a users list. Check that this backend has the new recipients endpoint.');
        if (data.batch_id && String(data.batch_id) !== batchId) throw new Error('The backend returned recipients for a different batch. Refresh and try again.');
        setResult({ ...scope, loading: false, users: data.users, error: null });
      })
      .catch((err) => {
        if (active && !controller.signal.aborted) setResult({ ...scope, loading: false, users: [], error: recipientError(err) });
      });
    return () => { active = false; controller.abort(); };
  }, [batchId, verificationType, reload]);

  // Never show a previous batch/type's recipients while its replacement loads.
  const current = result?.batchId === batchId && result?.verificationType === verificationType ? result : null;
  const users = current?.users || [];
  const loading = Boolean(batchId && verificationType && (!current || current.loading));
  const filteredUsers = users.filter((user) => [user.full_name, user.email, user.phone_number, user.status, user.reason, user.rejection_reason].some((value) => String(value || '').toLowerCase().includes(search.trim().toLowerCase())));
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredUsers.length / pageSize)));
  const pagedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedBatch = batches.find((batch) => batch.value === batchId);
  const approved = users.filter((user) => ['approved', 'verified', 'completed'].includes(String(user.status).toLowerCase())).length;
  const reportCount = users.filter((user) => recipientReportUrl(user.report_url)).length;

  return (
    <section aria-label="Batch recipients" className="overflow-hidden rounded-2xl border border-gray-200 bg-white font-inter">
      <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-dark"><FolderOpen size={17} className="text-brand-blue" />Verification &amp; batch</div>
        <div className={`grid gap-4 ${verificationSelector ? 'lg:grid-cols-2 lg:gap-6' : ''}`}>
          {verificationSelector && <div className="min-w-0"><p className="mb-2 text-xs font-medium text-gray-600">Verification type <span className="text-brand-blue">*</span></p>{verificationSelector}</div>}
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-medium text-gray-600">Batch <span className="font-normal text-gray-400">· for recipients</span></p><span className="text-xs tabular-nums text-gray-400">{batchesLoading ? 'Loading…' : `${batches.length} available`}</span></div>
            <div className="flex items-start gap-2">
              <CustomSelect value={batchId} onChange={setBatchId}
                options={batches} placeholder={batchesLoading ? 'Loading batches…' : 'Choose a batch'}
                disabled={batchesLoading || batches.length === 0} searchable searchPlaceholder="Search batches or organizations"
                ariaLabel="Recipient batch" className="min-w-0 flex-1 [&>button]:min-h-11 [&>button]:rounded-xl [&>button]:px-3.5" />
              <button type="button" aria-label="Refresh batches" title="Refresh batches" disabled={batchesLoading} onClick={() => setBatchReload((value) => value + 1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 disabled:opacity-50"><RefreshCw size={15} className={batchesLoading ? 'animate-spin' : ''} /></button>
            </div>
          </div>
        </div>
        {selectedBatch && <p className="mt-3 break-words text-xs leading-5 text-gray-500"><span className="font-medium text-gray-600">Selected batch:</span> {selectedBatch.label}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <div className="flex items-center gap-2"><h3 className="text-base font-semibold text-brand-dark">Batch recipients</h3>{current && !loading && !current.error && <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-blue">{users.length}</span>}</div>
        {batchId && verificationType && <button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-blue disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Refresh recipients</button>}
      </div>
      {batchesError ? (
        <div role="alert" className="mx-5 mb-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700 sm:mx-6"><AlertTriangle size={16} className="mt-1 shrink-0" />{batchesError}</div>
      ) : batchesLoading || loading ? (
        <div role="status" aria-label={batchesLoading ? 'Loading batches' : 'Loading recipients'} className="space-y-3 px-5 pb-6 sm:px-6">{[1,2,3].map((key) => <div key={key} className="flex motion-safe:animate-pulse items-center gap-4 rounded-lg bg-gray-50 p-3"><div className="h-8 w-8 rounded-lg bg-gray-200/60" /><div className="h-3 w-1/3 rounded bg-gray-200/60" /><div className="ml-auto h-3 w-1/5 rounded bg-gray-200/60" /></div>)}</div>
      ) : batches.length === 0 || !batchId || !verificationType ? (
        <div className="mx-5 mb-5 flex flex-col items-start gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-5 sm:mx-6 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400"><Users size={21} strokeWidth={1.6} /></div>
          <div><p className="text-sm font-medium text-gray-700">{batches.length === 0 ? 'No batches available' : !verificationType ? 'Start with a verification type and batch' : 'Choose a batch to see its recipients'}</p><p className="mt-1 text-sm leading-6 text-gray-500">{batches.length === 0 ? 'Refresh the batch list to check for new batches.' : 'Review matching users, verification outcomes, and reports in one place.'}</p></div>
        </div>
      ) : current?.error ? (
        <div role="alert" className="mx-5 mb-5 space-y-3 rounded-xl border border-red-100 bg-red-50 p-4 sm:mx-6">
          <p className="flex items-start gap-2 text-sm leading-6 text-red-700"><AlertTriangle size={16} className="mt-1 shrink-0" />{current.error}</p>
          <button type="button" onClick={() => setReload((value) => value + 1)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Try again</button>
        </div>
      ) : users.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6"><p className="rounded-xl bg-gray-50 p-5 text-sm leading-6 text-gray-500">No recipients in this batch have {verificationType}. Choose a different batch or verification type.</p></div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500"><span className="inline-flex items-center gap-1.5"><Users size={13} />{users.length} matching users</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-600" />{approved} approved</span><span className="inline-flex items-center gap-1.5"><FileCheck2 size={13} className="text-brand-blue" />{reportCount} reports</span></div>
            <div className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10 sm:w-64"><Search size={14} className="shrink-0 text-gray-400" /><input aria-label="Search recipients" placeholder="Search recipients…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-700 outline-none" />{search && <button type="button" aria-label="Clear recipient search" onClick={() => { setSearch(''); setPage(1); }} className="text-gray-400 hover:text-gray-700"><X size={14} /></button>}</div>
          </div>
          <div className="max-h-[26rem] overflow-auto border-t border-gray-100 thin-scrollbar">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs text-gray-500"><tr>{['Recipient', 'Email', 'Phone', 'Status', 'Reason', 'Report'].map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {pagedUsers.map((user, index) => {
                  const status = String(user.status || 'pending');
                  const tone = ['approved', 'verified', 'completed'].includes(status.toLowerCase()) ? 'bg-green-50 text-green-700 ring-green-600/10' : ['rejected', 'failed'].includes(status.toLowerCase()) ? 'bg-red-50 text-red-700 ring-red-600/10' : 'bg-amber-50 text-amber-700 ring-amber-600/10';
                  const reportUrl = recipientReportUrl(user.report_url);
                  return <tr key={user.batch_user_id || index} className="align-top transition-colors hover:bg-gray-50/60">
                    <td className="px-5 py-3.5"><div className="flex items-center gap-2.5"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-brand-blue">{(user.full_name || '—').trim().slice(0,1).toUpperCase()}</span><span className="min-w-24 font-medium text-brand-dark">{user.full_name || '—'}</span></div></td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-600">{user.email || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs tabular-nums text-gray-600">{user.phone_number || '—'}</td>
                    <td className="px-5 py-4"><span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset ${tone}`}>{status.replaceAll('_', ' ')}</span></td>
                    <td className="max-w-xs break-words px-5 py-4 text-xs leading-5 text-gray-500">{user.rejection_reason || user.reason || '—'}</td>
                    <td className="px-5 py-3.5">{reportUrl ? <ViewReportButton url={reportUrl} icon={ExternalLink} iconSize={13} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-brand-blue transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 disabled:opacity-60">View report</ViewReportButton> : <span className="text-xs text-gray-400">{user.report_url ? 'Unavailable' : '—'}</span>}</td>
                  </tr>;
                })}
                {filteredUsers.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">No recipients match “{search}”.</td></tr>}
              </tbody>
            </table>
          </div>
          <TablePagination compact page={safePage} pageSize={pageSize} total={filteredUsers.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} noun="recipient" />
        </>
      )}
    </section>
  );
};
