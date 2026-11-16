import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, History, Info, Mail, RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { EmailChipsInput } from '@/components/shared/EmailChipsInput';
import { sdcEmailSharesAPI, getApiError } from '@/services/api';
import {
  buildBulkPayload, buildHolderWisePayload, errorText, holderStatusMeta, invalidEmails, normalizeHistory, normalizeLimits,
  normalizeShareHolders, recipientStatusMeta, remainingAfterBulk, remainingAfterHolderWise, resultTone, sendErrorMessage,
  shareableHolders, summaryParts, validEmails, validateBulk, validateHolderWise,
} from '@/utils/sdcEmailShare';

const MODES = [{ value: 'bulk', label: 'Bulk' }, { value: 'holder_wise', label: 'Holder-wise' }];

const Chip = ({ meta }) => <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium font-inter ${meta.tone}`}>{meta.label}</span>;

const when = (value) => {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime()) ? d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '';
};

// Share SDC via Email — the individual Human batch page, SuperAdmin and Organization. Emails the already-generated SDC PDFs of
// this batch to any address typed here. It never generates or changes an SDC and does not change who can open the reports
// behind the QR codes. An organization sees it only after the batch was sent to it (the API answers 403 before that).
export const SdcEmailShare = ({ batchId, audience = 'admin', className = '' }) => {
  const [state, setState] = useState({ loading: true, error: '', hidden: false, holders: [], limits: normalizeLimits(), permissionBased: false });
  const [mode, setMode] = useState('bulk');
  const [selected, setSelected] = useState(() => new Set());
  const [bulkEmails, setBulkEmails] = useState([]);
  const [rows, setRows] = useState({}); // user_id -> [emails]
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null); // { mode, data }
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState({ loading: false, error: '', total: 0, items: [] });
  const [historyKey, setHistoryKey] = useState(0);
  const sendingRef = useRef(false);

  const load = useCallback(async () => {
    if (!batchId) return;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await sdcEmailSharesAPI.load(batchId);
      setState({ loading: false, error: '', hidden: false, holders: normalizeShareHolders(data), limits: normalizeLimits(data?.limits), permissionBased: data?.permission_based === true });
    } catch (err) {
      const status = err?.response?.status;
      // Not available here: an organization before "Send to Organization" (403), or a batch that isn't Human (400).
      if (status === 400 || (status === 403 && audience === 'org')) { setState((s) => ({ ...s, loading: false, hidden: true })); return; }
      setState((s) => ({ ...s, loading: false, error: sendErrorMessage(status, getApiError(err, '')) }));
    }
  }, [batchId, audience]);

  useEffect(() => { load(); }, [load]);

  const { holders, limits } = state;
  const shareable = useMemo(() => shareableHolders(holders), [holders]);
  const shareableIds = useMemo(() => shareable.map((h) => h.id), [shareable]);
  const allSelected = shareable.length > 0 && shareable.every((h) => selected.has(h.id));

  // History: only an audit trail, loaded when opened and refreshed after every send.
  useEffect(() => {
    if (!historyOpen || !batchId) return undefined;
    let active = true;
    setHistory((h) => ({ ...h, loading: true, error: '' }));
    sdcEmailSharesAPI.history(batchId, { limit: 50, offset: 0 })
      .then(({ data }) => { if (active) setHistory({ loading: false, error: '', ...normalizeHistory(data) }); })
      .catch((err) => { if (active) setHistory((h) => ({ ...h, loading: false, error: getApiError(err, 'The history could not be loaded.') })); });
    return () => { active = false; };
  }, [historyOpen, batchId, historyKey]);

  const toggleHolder = (id) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const setRow = (id, emails) => setRows((prev) => ({ ...prev, [id]: emails }));

  const announce = (data) => {
    const tone = resultTone(data);
    const line = data?.message || (tone === 'success' ? 'SDC email sent successfully.' : tone === 'partial' ? 'SDC email sent to some recipients.' : 'No SDC email was sent.');
    if (tone === 'success') toast.success(line);
    else if (tone === 'partial') toast(line, { icon: '⚠️', duration: 7000 });
    else toast.error(line);
  };

  const send = async () => {
    if (sendingRef.current) return;
    setFormError('');
    const holderWise = mode === 'holder_wise';
    const problem = holderWise
      ? validateHolderWise({ rowsById: rows, limits })
      : validateBulk({ selectedCount: selected.size, emails: bulkEmails, limits });
    if (problem) { setFormError(problem); return; }
    sendingRef.current = true;
    setSending(true);
    try {
      const { data } = holderWise
        ? await sdcEmailSharesAPI.sendHolderWise(batchId, buildHolderWisePayload(rows))
        : await sdcEmailSharesAPI.sendBulk(batchId, buildBulkPayload({ selectedIds: selected, shareableIds, emails: bulkEmails }));
      // Accepted addresses are cleared; failed, partly accepted, not sent and invalid ones stay so they can be corrected.
      if (holderWise) setRows((prev) => remainingAfterHolderWise(prev, data));
      else setBulkEmails((prev) => remainingAfterBulk(prev, data));
      setResult({ mode: holderWise ? 'holder_wise' : 'bulk', data });
      announce(data);
      setHistoryKey((k) => k + 1);
    } catch (err) {
      const retry = err?.response?.headers?.['retry-after'];
      setFormError(sendErrorMessage(err?.response?.status, err?.response?.data?.detail ?? getApiError(err, ''), retry));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (state.hidden) return null;

  const bulkInvalid = invalidEmails(bulkEmails);
  const canSend = mode === 'bulk'
    ? selected.size > 0 && validEmails(bulkEmails).length > 0
    : Object.values(rows).some((emails) => validEmails(emails).length > 0);

  return (
    <section aria-label="Share SDC via Email" className={`overflow-hidden rounded-2xl border border-gray-100 bg-white ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-start gap-3.5">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><Mail size={19} strokeWidth={1.6} /></span>
          <div>
            <h2 className="font-sora text-base font-semibold text-brand-dark">Share SDC via Email</h2>
            <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-gray-500 font-inter">
              Email the SDCs already generated for this batch to any address. This does not generate or change an SDC. Every recipient gets their own email.
            </p>
          </div>
        </div>
        <SlidingTabs variant="segmented" ariaLabel="Sharing mode" value={mode} onChange={(v) => { setMode(v); setFormError(''); }} tabs={MODES} />
      </div>

      <div className="space-y-4 px-5 pb-5 pt-4">
        {state.permissionBased && (
          <p className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs leading-5 text-blue-800 font-inter">
            <Info size={14} className="mt-0.5 shrink-0" /> Reports linked from these certificates still require the holder’s approval. Recipients get no access to them by email.
          </p>
        )}

        {state.loading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 font-inter"><RefreshCw size={16} className="animate-spin motion-reduce:animate-none text-brand-blue" /> Loading holders…</div>
        ) : state.error ? (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700 font-inter">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{state.error} <button type="button" onClick={load} className="font-semibold underline">Try again</button></span>
          </div>
        ) : holders.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500 font-inter">No holders in this batch yet.</p>
        ) : (
          <>
            {mode === 'bulk' ? (
              <>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-gray-600 font-inter">Holders ({selected.size} of {shareable.length} selected)</p>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand-blue font-inter">
                      <input type="checkbox" checked={allSelected} disabled={shareable.length === 0 || sending} onChange={() => setSelected(allSelected ? new Set() : new Set(shareableIds))} className="accent-brand-blue" /> Select all
                    </label>
                  </div>
                  <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
                    {holders.map((h) => (
                      <li key={h.id}>
                        <label title={h.canShare ? undefined : h.reason} className={`flex items-center gap-3 px-3.5 py-2 ${h.canShare ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed bg-gray-50/60'}`}>
                          <input type="checkbox" aria-label={`Select ${h.name}`} checked={selected.has(h.id)} disabled={!h.canShare || sending} onChange={() => toggleHolder(h.id)} className="accent-brand-blue disabled:opacity-40" />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-medium font-inter ${h.canShare ? 'text-brand-dark' : 'text-gray-400'}`}>{h.name}</span>
                            {!h.canShare && h.reason && <span className="block truncate text-[11px] text-gray-500 font-inter">{h.reason}</span>}
                          </span>
                          {h.canShare && <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 font-inter">SDC ready</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-gray-600 font-inter">Send to <span className="font-normal text-gray-400">— the same selected SDCs go to every address below</span></p>
                  <EmailChipsInput value={bulkEmails} onChange={setBulkEmails} disabled={sending} ariaLabel="Recipient email addresses" onDuplicate={(n) => toast(`${n} address${n === 1 ? ' was' : 'es were'} already added`, { icon: 'ℹ️' })} />
                  <p className="mt-1.5 text-[11px] text-gray-500 font-inter">
                    Paste several addresses at once (commas, spaces or new lines).
                    {bulkInvalid.length > 0 && <span className="ml-1 font-medium text-red-600">{bulkInvalid.length} not valid — fix or remove them.</span>}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="mb-1.5 text-xs text-gray-500 font-inter">Each holder’s own SDC goes to the addresses you enter on that holder’s row. Leave a row empty to skip it.</p>
                <ul className="max-h-[420px] divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
                  {holders.map((h) => (
                    <li key={h.id} className="grid grid-cols-1 gap-2 px-3.5 py-3 sm:grid-cols-[200px_1fr] sm:items-start">
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-medium font-inter ${h.canShare ? 'text-brand-dark' : 'text-gray-400'}`}>{h.name}</p>
                        {!h.canShare && <p className="text-[11px] leading-4 text-gray-500 font-inter">{h.reason || 'No SDC to share.'}</p>}
                      </div>
                      {h.canShare ? (
                        <EmailChipsInput value={rows[h.id] || []} onChange={(emails) => setRow(h.id, emails)} disabled={sending} ariaLabel={`Email addresses for ${h.name}`} placeholder="Email addresses for this holder" />
                      ) : (
                        <div className="flex min-h-[42px] items-center rounded-xl border border-gray-100 bg-gray-50 px-3 text-xs text-gray-400 font-inter" title={h.reason}>Not available</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {formError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 font-inter"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {formError}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] leading-4 text-gray-500 font-inter">
                Up to {limits.max_sdcs_per_request} SDCs and {limits.max_recipients_per_request} recipients per send; {limits.max_attachments_per_email} PDFs or 15 MB per email.
                {sending && <span className="ml-1 font-medium text-brand-blue">Sending can take several seconds…</span>}
              </p>
              <button type="button" onClick={send} disabled={sending || !canSend}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60 font-inter">
                {sending ? <RefreshCw size={15} className="animate-spin motion-reduce:animate-none" /> : <Send size={15} />}
                {sending ? 'Sending…' : 'Send SDC by Email'}
              </button>
            </div>

            {result && <ShareResult result={result} holders={holders} onClose={() => setResult(null)} />}

            <div className="border-t border-gray-100 pt-3">
              <button type="button" onClick={() => setHistoryOpen((o) => !o)} aria-expanded={historyOpen} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-brand-dark font-inter">
                <History size={13} /> Recent sends <ChevronDown size={13} className={`transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
              </button>
              {historyOpen && (
                <div className="mt-2">
                  {history.loading && history.items.length === 0 ? (
                    <p className="text-xs text-gray-500 font-inter">Loading…</p>
                  ) : history.error ? (
                    <p role="alert" className="text-xs text-red-600 font-inter">{history.error}</p>
                  ) : history.items.length === 0 ? (
                    <p className="text-xs text-gray-500 font-inter">Nothing has been sent from this batch yet.</p>
                  ) : (
                    <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
                      {history.items.map((item) => (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 text-xs font-inter">
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-brand-dark">{item.email}</span>
                            <span className="text-gray-500">{item.mode} · {item.holders} SDC{item.holders === 1 ? '' : 's'}{item.by ? ` · by ${String(item.by).replace(/_/g, ' ')}` : ''}{when(item.at) ? ` · ${when(item.at)}` : ''}</span>
                            {item.error && item.status !== 'email_accepted' && <span className="block text-red-600">{item.error}</span>}
                          </span>
                          <Chip meta={recipientStatusMeta(item.status)} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1.5 text-[11px] text-gray-400 font-inter">History is a record only. It never stops you from sending again.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

// What the server reported for the last send: a summary, then per recipient (bulk) or per holder (holder-wise).
const ShareResult = ({ result, holders, onClose }) => {
  const { data } = result;
  const parts = summaryParts(data?.summary);
  const tone = resultTone(data);
  const names = Object.fromEntries(holders.map((h) => [h.id, h.name]));
  const toneClass = tone === 'success' ? 'border-green-100 bg-green-50 text-green-800' : tone === 'partial' ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-red-100 bg-red-50 text-red-700';

  return (
    <div role="status" className="space-y-3" data-testid="sdc-email-result">
      <div className={`flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${toneClass}`}>
        <div className="flex min-w-0 items-start gap-2 text-xs font-inter">
          {tone === 'success' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
          <div>
            <p className="font-semibold">{data?.message || (tone === 'success' ? 'SDC email sent successfully.' : 'Review the entries below.')}</p>
            {parts.length > 0 && <p className="mt-0.5">{parts.join(' · ')}</p>}
            <p className="mt-0.5 opacity-80">“Accepted” means our mail server accepted the email, not that it reached the inbox.</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 text-[11px] font-semibold underline">Dismiss</button>
      </div>

      {result.mode === 'bulk' ? (
        <>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
            {(data?.recipients || []).map((r) => (
              <li key={r.email} className="flex flex-wrap items-start justify-between gap-2 px-3.5 py-2.5 text-xs font-inter">
                <div className="min-w-0">
                  <p className="truncate font-medium text-brand-dark">{r.email}</p>
                  <p className="text-gray-500">{(r.certificate_ids || []).length} SDC{(r.certificate_ids || []).length === 1 ? '' : 's'} accepted{(r.user_ids || []).length ? ` of ${(r.user_ids || []).length}` : ''}</p>
                  {errorText(r) && r.status !== 'email_accepted' && <p className="mt-0.5 text-red-600">{errorText(r)}</p>}
                </div>
                <Chip meta={recipientStatusMeta(r.status)} />
              </li>
            ))}
          </ul>
          {(data?.holders || []).some((h) => ['unavailable', 'not_sent', 'failed'].includes(h.status)) && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3.5 py-2.5">
              <p className="text-xs font-semibold text-amber-800 font-inter">SDCs that were not attached</p>
              <ul className="mt-1 space-y-0.5 text-xs text-amber-900 font-inter">
                {data.holders.filter((h) => ['unavailable', 'not_sent', 'failed'].includes(h.status)).map((h) => (
                  <li key={h.user_id}><span className="font-medium">{h.full_name || names[h.user_id] || h.user_id}</span> — {errorText(h) || 'Not sent.'}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
          {(data?.holders || []).map((h) => (
            <li key={h.user_id} className="px-3.5 py-2.5 text-xs font-inter">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-brand-dark">{h.full_name || names[h.user_id] || h.user_id}</p>
                <Chip meta={holderStatusMeta(h.status)} />
              </div>
              {errorText(h) && h.status !== 'email_accepted' && <p className="mt-0.5 text-red-600">{errorText(h)}</p>}
              {(h.recipients || []).length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {h.recipients.map((r) => (
                    <li key={r.email} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1">
                      <span className="truncate text-gray-700">{r.email}{errorText(r) && r.status !== 'email_accepted' ? <span className="ml-1 text-red-600">— {errorText(r)}</span> : null}</span>
                      <Chip meta={recipientStatusMeta(r.status)} />
                    </li>
                  ))}
                </ul>
              )}
              {(h.invalid_emails || []).length > 0 && <p className="mt-1 text-red-600">Not valid: {h.invalid_emails.map((i) => i.value).join(', ')}</p>}
            </li>
          ))}
        </ul>
      )}

      {(data?.invalid_emails || []).length > 0 && result.mode === 'bulk' && (
        <p className="text-xs text-red-600 font-inter">Not valid (kept in the box so you can fix them): {data.invalid_emails.map((i) => i.value).join(', ')}</p>
      )}
    </div>
  );
};

export default SdcEmailShare;
