import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Mail, RefreshCw, Send } from 'lucide-react';
import { holderSdcSharesAPI, getApiError } from '@/services/api';
import {
  HOLDER_SHARE_LIMIT, eligibleHolders, idsToSend, lastActivityText, resultDetail, resultMeta, selectAllEligible,
  sdcStatusMeta, shareErrorMessage, shareTotals, sharingStatusMeta, toggleHolder,
} from '@/utils/holderSdcShares';

// Share SDCs with individual holders. Each selected holder gets one email with only their own SDC PDF.
// SuperAdmin can use it on any batch; an organization only sees it once the batch is shared with it (a 403
// hides it). "Email accepted" means the mail server accepted it, never that it was delivered.
export const HolderSdcSharing = ({ batchId, audience = 'admin', className = '', confirmedUserIds }) => {
  const [state, setState] = useState({ loading: true, holders: [], error: '', hidden: false });
  const [selected, setSelected] = useState(() => new Set());
  const [resend, setResend] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [outcome, setOutcome] = useState(null); // last POST response

  const load = useCallback(async ({ keepOutcome = false } = {}) => {
    if (!batchId) return;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await holderSdcSharesAPI.list(batchId);
      const holders = Array.isArray(data?.holders) ? data.holders : [];
      setState({ loading: false, holders, error: '', hidden: false });
      // Drop anything that is no longer eligible.
      setSelected((prev) => new Set(idsToSend(prev, holders)));
      if (!keepOutcome) setOutcome(null);
    } catch (err) {
      const status = err?.response?.status;
      // An organization gets 403 until the batch is shared with it: the panel simply isn't there.
      if (status === 403 && audience === 'org') { setState({ loading: false, holders: [], error: '', hidden: true }); return; }
      setState({ loading: false, holders: [], error: shareErrorMessage(status, getApiError(err, '')), hidden: false });
    }
  }, [batchId, audience]);

  useEffect(() => { load(); }, [load]);

  const holders = state.holders;
  const eligible = useMemo(() => eligibleHolders(holders), [holders]);
  const allSelected = eligible.length > 0 && eligible.slice(0, HOLDER_SHARE_LIMIT).every((h) => selected.has(h.user_id));
  const resultsById = useMemo(() => Object.fromEntries((outcome?.results || []).map((r) => [r.user_id, r])), [outcome]);

  const send = async () => {
    const userIds = idsToSend(selected, holders);
    if (sending || userIds.length === 0) return;
    setSending(true);
    setSendError('');
    try {
      const { data } = await holderSdcSharesAPI.send(batchId, userIds, resend);
      setOutcome(data || {});
      setSelected(new Set());
      await load({ keepOutcome: true });
    } catch (err) {
      setSendError(shareErrorMessage(err?.response?.status, getApiError(err, '')));
    } finally {
      setSending(false);
    }
  };

  if (state.hidden) return null;
  const totals = outcome ? shareTotals(outcome) : null;

  return (
    <section aria-label="Share SDCs with individual holders" className={`overflow-hidden rounded-2xl border border-gray-100 bg-white ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-start gap-3.5">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><Mail size={19} strokeWidth={1.6} /></span>
          <div>
            <h2 className="font-sora text-base font-semibold text-brand-dark">Share SDCs with individual holders</h2>
            <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-gray-500 font-inter">
              Each selected holder receives one email with their own SDC PDF only. This does not change whether the batch is shared with the organization.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => load()} disabled={state.loading || sending} aria-label="Reload holders" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 font-inter">
          <RefreshCw size={13} className={state.loading ? 'animate-spin motion-reduce:animate-none' : ''} /> Refresh
        </button>
      </div>

      <div className="px-5 pb-5 pt-4">
        {state.error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700 font-inter"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {state.error}</p>}

        {state.loading && holders.length === 0 && !state.error ? (
          <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 font-inter"><RefreshCw size={16} className="animate-spin motion-reduce:animate-none text-brand-blue" /> Loading holders…</div>
        ) : holders.length === 0 && !state.error ? (
          <p className="py-6 text-center text-sm text-gray-500 font-inter">No holders in this batch yet.</p>
        ) : holders.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-gray-50">
                  <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">
                    <th className="w-10 px-3 py-2">
                      <input type="checkbox" aria-label="Select all eligible holders" checked={allSelected} disabled={eligible.length === 0 || sending}
                        onChange={() => setSelected(allSelected ? new Set() : selectAllEligible(holders))} className="accent-brand-blue" />
                    </th>
                    <th className="px-3 py-2">Holder</th>
                    <th className="px-3 py-2">SDC</th>
                    <th className="px-3 py-2">Individual sharing</th>
                    <th className="px-3 py-2">Last result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {holders.map((holder) => {
                    // "generated" here only means a certificate was created (it may still be a draft); "Issued" needs
                    // the batch status (certificates_by_user) to confirm it.
                    const confirmed = Array.isArray(confirmedUserIds) ? confirmedUserIds.includes(holder.user_id) : null;
                    const sdc = holder.sdc_status === 'generated' && confirmed !== null
                      ? (confirmed ? { label: 'Issued', tone: 'bg-green-50 text-green-700' } : { label: 'Created · issuing', tone: 'bg-blue-50 text-brand-blue' })
                      : sdcStatusMeta(holder.sdc_status);
                    const share = sharingStatusMeta(holder.sharing_status);
                    const result = resultsById[holder.user_id];
                    const rMeta = result ? resultMeta(result.status) : null;
                    const activity = lastActivityText(holder);
                    const canSend = holder.can_send === true;
                    return (
                      <tr key={holder.user_id} className="align-top">
                        <td className="px-3 py-2.5">
                          <input type="checkbox" aria-label={`Select ${holder.full_name || holder.email || 'holder'}`} checked={selected.has(holder.user_id)} disabled={!canSend || sending}
                            onChange={() => setSelected((prev) => toggleHolder(prev, holders, holder.user_id))} className="accent-brand-blue disabled:opacity-40" />
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-sm font-medium text-brand-dark font-inter">{holder.full_name || 'Holder'}</p>
                          <p className="text-xs text-gray-500 font-inter">{holder.email || 'No email'}{holder.email && holder.has_valid_email === false ? ' · not a valid email' : ''}</p>
                        </td>
                        <td className="px-3 py-2.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sdc.tone}`}>{sdc.label}</span></td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${share.tone}`}>{share.label}</span>
                          {holder.previous_certificate_shared && <p className="mt-1 text-[11px] text-gray-500 font-inter">An earlier certificate was shared</p>}
                          {activity && <p className={`mt-1 text-[11px] font-inter ${holder.sharing_status === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>{activity}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-inter">
                          {result ? (
                            <>
                              <p className={`flex items-center gap-1 font-semibold ${rMeta.tone}`}>{rMeta.ok && <CheckCircle2 size={13} />}{rMeta.label}</p>
                              {resultDetail(result) && result.status !== 'email_accepted' && <p className="mt-0.5 text-gray-600">{resultDetail(result)}</p>}
                              {result.recipient_email && <p className="mt-0.5 text-gray-500">{result.recipient_email}</p>}
                            </>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sendError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 font-inter">{sendError}</p>}

            {totals && (
              <p role="status" className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 font-inter">
                {totals.accepted} of {totals.requested} email{totals.requested === 1 ? '' : 's'} accepted by the mail server. The rest are explained in the table above.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 font-inter">
                <input type="checkbox" checked={resend} onChange={(e) => setResend(e.target.checked)} disabled={sending} className="accent-brand-blue" />
                Resend to holders who already received their SDC
                <span className="text-gray-400">(limited by a cooldown and a daily cap)</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-inter">{selected.size} selected{selected.size >= HOLDER_SHARE_LIMIT ? ` (max ${HOLDER_SHARE_LIMIT})` : ''}</span>
                <button type="button" onClick={send} disabled={sending || selected.size === 0}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60 font-inter">
                  {sending ? <RefreshCw size={15} className="animate-spin motion-reduce:animate-none" /> : <Send size={15} />}
                  {sending ? 'Sending…' : `Send SDC to Selected Users (${selected.size})`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default HolderSdcSharing;
