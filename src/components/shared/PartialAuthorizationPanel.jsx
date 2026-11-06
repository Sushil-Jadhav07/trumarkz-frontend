import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Ban, CheckCircle2, Clock, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { sdcAPI, getApiError } from '@/services/api';
import {
  AUTHORIZATION_STATUS, ITEM_STATE_LABEL, authorizableHolders, authorizationIsStale, buildAuthorizationBody,
  holderAuthorizationState, holderName, isApprovedStatus, parseAuthorizationErrors,
} from '@/utils/partialSdc';

const TONES = {
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-brand-blue',
  gray: 'bg-gray-100 text-gray-600',
};

const typeChip = (status) => {
  if (isApprovedStatus(status)) return 'border-green-200 bg-green-50 text-green-700';
  if (['rejected', 'failed'].includes(String(status).toLowerCase())) return 'border-red-200 bg-red-50 text-red-600';
  return 'border-gray-200 bg-gray-50 text-gray-500';
};

// Organization: choose which holders that are not fully verified may receive an SDC carrying only
// their approved verification types, and track those authorizations. The SuperAdmin generates the SDC;
// nothing here (or anywhere in the organization interface) generates one.
export const PartialAuthorizationPanel = ({ batchId, records = [], onChanged }) => {
  const [auths, setAuths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState({}); // { batchUserId: Set(types) }
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({ message: '', byHolder: {} });
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!batchId) return;
    if (!quiet) setLoading(true);
    try {
      const { data } = await sdcAPI.getBatchPartialAuthorizations(batchId);
      setAuths(Array.isArray(data?.authorizations) ? data.authorizations : []);
    } catch (err) {
      if (!quiet) toast.error(getApiError(err, 'Could not load partial SDC authorizations'));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { load(); }, [load]);

  const holders = useMemo(() => authorizableHolders(records), [records]);
  const fullyVerifiedCount = useMemo(() => records.filter((r) => holderAuthorizationState(r).fullyVerified).length, [records]);
  const latestByHolder = useMemo(() => {
    const map = {};
    auths.forEach((a) => {
      const current = map[a.batch_user_id];
      if (!current || new Date(a.created_at || 0) > new Date(current.created_at || 0)) map[a.batch_user_id] = a;
    });
    return map;
  }, [auths]);

  const toggleType = (id, type) => {
    setErrors((e) => ({ ...e, byHolder: { ...e.byHolder, [id]: undefined } }));
    setSelection((prev) => {
      const next = new Set(prev[id] || []);
      if (next.has(type)) next.delete(type); else next.add(type);
      return { ...prev, [id]: next };
    });
  };
  const toggleHolder = (holder) => {
    setSelection((prev) => {
      const has = (prev[holder.id] || new Set()).size > 0;
      return { ...prev, [holder.id]: has ? new Set() : new Set(holder.approvedTypes) };
    });
  };
  const selectAll = () => setSelection(Object.fromEntries(holders.map((h) => [h.id, new Set(h.approvedTypes)])));
  const clearAll = () => setSelection({});

  const body = buildAuthorizationBody(selection);
  const selectedHolders = body?.holders.length || 0;

  const submit = async () => {
    if (!body || submitting) return;
    setSubmitting(true);
    setErrors({ message: '', byHolder: {} });
    try {
      const { data } = await sdcAPI.createPartialAuthorizations(batchId, body.holders);
      const count = Array.isArray(data?.authorizations) ? data.authorizations.length : body.holders.length;
      toast.success(`Authorized ${count} holder${count === 1 ? '' : 's'} for a partial SDC`);
      setSelection({});
      await load(true);
      onChanged?.();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400) {
        // All-or-nothing: nothing was saved. Show each holder's own reasons next to that holder.
        setErrors(parseAuthorizationErrors(err));
        toast.error('Nothing was saved. Fix the highlighted holders and try again.');
      } else if (status === 409) {
        toast.error(getApiError(err, 'Another save just happened. Try again.'));
        load(true);
      } else if (status === 403) {
        toast.error('Only the organization that owns this batch can authorize a partial SDC.');
      } else {
        toast.error(getApiError(err, 'Could not save the authorization'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await sdcAPI.cancelPartialAuthorization(cancelTarget.id);
      toast.success('Authorization cancelled');
      setCancelTarget(null);
      await load(true);
      onChanged?.();
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.error('This authorization is no longer active.');
        setCancelTarget(null);
        load(true);
      } else {
        toast.error(getApiError(err, 'Could not cancel the authorization'));
      }
    } finally {
      setCancelling(false);
    }
  };

  const reauthorize = (auth) => {
    const holder = holders.find((h) => h.id === auth.batch_user_id);
    if (!holder) {
      toast('This holder has no approved types to authorize right now.', { icon: 'ℹ️' });
      return;
    }
    setSelection((prev) => ({ ...prev, [holder.id]: new Set(holder.approvedTypes) }));
    document.getElementById('partial-auth-picker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section aria-label="Partial SDC authorization" className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="flex items-center gap-3.5">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><ShieldCheck size={21} strokeWidth={1.6} /></span>
          <div>
            <h2 className="font-sora text-base font-semibold text-brand-dark">Partial SDC authorization</h2>
            <p className="mt-0.5 text-[13px] text-gray-500 font-inter">Let a holder who is not fully verified receive an SDC with only their approved verifications. The SuperAdmin generates it.</p>
          </div>
        </div>
        <button type="button" onClick={() => load()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 font-inter">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Picker */}
      <div id="partial-auth-picker" className="px-5 pb-4 pt-4">
        {holders.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-4 py-4 text-sm text-gray-600 font-inter">
            No holder is waiting on a partial SDC. A holder appears here once at least one of their verifications is approved and others are still pending or rejected.
            {fullyVerifiedCount > 0 && <span className="mt-1 block text-xs text-gray-500">{fullyVerifiedCount} fully verified holder{fullyVerifiedCount === 1 ? '' : 's'} get a full SDC from the SuperAdmin; no authorization is needed.</span>}
          </p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-600 font-inter">Choose the holders and the approved verifications each may carry. Pending and rejected ones cannot be selected.</p>
              <div className="flex items-center gap-3 text-xs font-medium font-inter">
                <button type="button" onClick={selectAll} className="text-brand-blue hover:underline">Select all</button>
                <button type="button" onClick={clearAll} className="text-gray-500 hover:text-brand-dark">Clear</button>
              </div>
            </div>
            {errors.message && Object.keys(errors.byHolder).length === 0 && <p role="alert" className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 font-inter">{errors.message}</p>}
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
              {holders.map((holder) => {
                const chosen = selection[holder.id] || new Set();
                const latest = latestByHolder[holder.id];
                const holderErrors = errors.byHolder[holder.id];
                return (
                  <li key={holder.id} className={`px-4 py-3 ${holderErrors?.length ? 'bg-red-50/40' : ''}`}>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={chosen.size > 0} onChange={() => toggleHolder(holder)} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-dark font-inter">{holderName(holder.record)}</span>
                      {latest?.status === 'active' && !authorizationIsStale(latest) && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-medium text-green-700">Already authorized</span>}
                      {authorizationIsStale(latest) && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">Results changed</span>}
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2 pl-7">
                      {holder.types.map((t) => {
                        const approved = isApprovedStatus(t.status);
                        const on = chosen.has(t.name);
                        return (
                          <label
                            key={t.name}
                            title={approved ? 'Available for partial SDC' : `Not approved (${t.status}). It cannot be authorized.`}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium font-inter ${typeChip(t.status)} ${approved ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'} ${on ? 'ring-2 ring-brand-blue/40' : ''}`}
                          >
                            <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" disabled={!approved} checked={on} onChange={() => toggleType(holder.id, t.name)} />
                            {t.name}
                            <span className="text-[10px] font-normal capitalize opacity-80">{approved ? 'available' : t.status}</span>
                          </label>
                        );
                      })}
                    </div>
                    {holderErrors?.length > 0 && (
                      <ul role="alert" className="mt-2 space-y-0.5 pl-7 text-xs text-red-600 font-inter">{holderErrors.map((m, i) => <li key={i}>{m}</li>)}</ul>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500 font-inter">
                {selectedHolders} holder{selectedHolders === 1 ? '' : 's'} selected{fullyVerifiedCount > 0 ? ` · ${fullyVerifiedCount} fully verified holder${fullyVerifiedCount === 1 ? '' : 's'} need no authorization` : ''}
              </p>
              <Button variant="primary" size="sm" icon={ShieldCheck} loading={submitting} disabled={!body || submitting} onClick={submit}>Authorize selected</Button>
            </div>
          </>
        )}
      </div>

      {/* Status */}
      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <h3 className="font-sora text-sm font-semibold text-brand-dark">Authorizations</h3>
        {loading && auths.length === 0 ? (
          <p className="mt-3 text-xs text-gray-500 font-inter">Loading…</p>
        ) : auths.length === 0 ? (
          <p className="mt-3 text-xs text-gray-500 font-inter">No authorizations for this batch yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {auths.map((auth, i) => {
              const meta = AUTHORIZATION_STATUS[auth.status] || { label: auth.status, tone: 'gray' };
              const stale = authorizationIsStale(auth);
              const staleTypes = auth.stale_verification_types || [];
              return (
                <motion.li key={auth.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-brand-dark font-inter">{auth.holder_name || 'Holder'}</p>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TONES[meta.tone] || TONES.gray}`}>
                      {auth.status === 'active' ? <CheckCircle2 size={12} /> : auth.status === 'generating' ? <Clock size={12} /> : <Ban size={12} />}{meta.label}
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {(auth.items || []).map((item) => (
                      <li key={item.verification_type_name} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-inter ${item.current_state === 'valid' ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                        {item.current_state === 'valid' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {item.verification_type_name}
                        <span className="text-[10px] opacity-80">{ITEM_STATE_LABEL[item.current_state] || item.current_state}</span>
                      </li>
                    ))}
                  </ul>
                  {stale && (
                    <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2">
                      <p className="flex items-start gap-2 text-xs text-amber-800 font-inter"><AlertTriangle size={14} className="mt-0.5 shrink-0" />Results changed (re-verified){staleTypes.length ? `: ${staleTypes.join(', ')}` : ''} — authorize again.</p>
                      <button type="button" onClick={() => reauthorize(auth)} className="text-xs font-semibold text-brand-blue hover:underline font-inter">Authorize again</button>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 font-inter">
                    <span>
                      Authorized {auth.created_at ? new Date(auth.created_at).toLocaleString('en-IN') : ''}
                      {auth.status === 'consumed' && auth.consumed_at ? ` · SDC generated ${new Date(auth.consumed_at).toLocaleString('en-IN')}` : ''}
                      {auth.status === 'cancelled' && auth.cancelled_at ? ` · Cancelled ${new Date(auth.cancelled_at).toLocaleString('en-IN')}` : ''}
                    </span>
                    {auth.status === 'active' && (
                      <button type="button" onClick={() => setCancelTarget(auth)} className="text-xs font-semibold text-red-600 hover:underline">Cancel authorization</button>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal isOpen={!!cancelTarget} onClose={() => !cancelling && setCancelTarget(null)} title="Cancel authorization?" size="sm">
        <p className="text-sm text-gray-600 font-inter">
          {cancelTarget?.holder_name || 'This holder'} will no longer be able to receive a partial SDC until you authorize again. An SDC that was already generated is not affected.
        </p>
        <Modal.Footer className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCancelTarget(null)} disabled={cancelling}>Keep it</Button>
          <Button variant="danger" onClick={cancel} loading={cancelling} disabled={cancelling}>Cancel authorization</Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
};

export default PartialAuthorizationPanel;
