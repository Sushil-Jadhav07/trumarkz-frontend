import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, LockOpen, RefreshCw, ShieldCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { certificateAccessAPI, getApiError } from '@/services/api';
import {
  ACCESS_MODES, isProtectedMode, grantStatusMeta, canRevokeGrant, formatAccessDate,
} from '@/utils/certificateAccess';

// "Reports protected" pill for batch lists and headers (certificate_access_mode).
export const ReportsProtectedBadge = ({ mode, className = '' }) => (
  isProtectedMode(mode) ? (
    <span title="Report links open only for your organization and visitors the certificate holder approves" className={`inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-brand-blue font-inter ${className}`}>
      <Lock size={11} /> Reports protected
    </span>
  ) : null
);

// Report access for one Human batch (web change report §4c): the batch's mode,
// the one allowed switch (public → holder approval, for batches created before
// the feature) and every visitor grant, with revoke. Organization (own batches)
// and SuperAdmin (any batch) use the same panel.
export const CertificateAccessPanel = ({ batchId, onModeChange, canProtect = true }) => {
  const [state, setState] = useState({ loading: true, data: null, error: null, unavailable: false });
  const [confirmProtect, setConfirmProtect] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [revokeId, setRevokeId] = useState(null);
  const [revoking, setRevoking] = useState(null);
  // Kept in a ref so an inline parent callback never re-triggers the load effect.
  const onModeChangeRef = useRef(onModeChange);
  onModeChangeRef.current = onModeChange;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await certificateAccessAPI.getBatchAccess(batchId);
      setState({ loading: false, data, error: null, unavailable: false });
      onModeChangeRef.current?.(data?.mode);
    } catch (err) {
      // 404/405 here means this server doesn't have the feature yet (or the batch isn't visible):
      // the panel stays out of the way rather than showing a broken control.
      const status = err?.response?.status;
      setState({ loading: false, data: null, error: getApiError(err, 'Could not load report access.'), unavailable: status === 404 || status === 405 });
    }
  }, [batchId]);

  useEffect(() => { if (batchId) load(); }, [batchId, load]);

  const protect = async () => {
    setSwitching(true);
    try {
      const { data } = await certificateAccessAPI.setBatchAccessMode(batchId, ACCESS_MODES.HOLDER_APPROVAL);
      setState({ loading: false, data, error: null, unavailable: false });
      onModeChangeRef.current?.(data?.mode);
      setConfirmProtect(false);
      toast.success('Reports in this batch now need the holder’s approval');
    } catch (err) {
      // 409 explains why the mode can't change (Open batch, etc.) — shown as the server wrote it.
      toast.error(getApiError(err, 'Could not change report access.'));
      setConfirmProtect(false);
    } finally {
      setSwitching(false);
    }
  };

  const revoke = async (grant) => {
    setRevoking(grant.id);
    try {
      const { data } = await certificateAccessAPI.revokeGrant(batchId, grant.id);
      setState((s) => ({
        ...s,
        data: { ...s.data, grants: (s.data?.grants || []).map((g) => (g.id === grant.id ? { ...g, ...data } : g)) },
      }));
      toast.success(`Access revoked for ${grant.grantee_email}`);
    } catch (err) {
      toast.error(getApiError(err, 'Could not revoke this access.'));
      load();
    } finally {
      setRevoking(null);
      setRevokeId(null);
    }
  };

  if (state.unavailable) return null;

  const mode = state.data?.mode;
  const protectedMode = isProtectedMode(mode);
  const grants = Array.isArray(state.data?.grants) ? state.data.grants : [];

  return (
    <section aria-labelledby={`report-access-${batchId}`} className="rounded-xl border border-gray-100 bg-white">
      <div className="flex flex-col gap-3 px-5 pb-3 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id={`report-access-${batchId}`} className="flex items-center gap-2 font-sora text-base font-semibold text-brand-dark">
            <ShieldCheck size={18} strokeWidth={1.75} className="text-brand-blue" /> Report access
            {!state.loading && mode && (
              protectedMode
                ? <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-brand-blue font-inter"><Lock size={11} /> Holder approval required</span>
                : <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 font-inter"><LockOpen size={11} /> Public</span>
            )}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500 font-inter">
            {state.loading ? 'Loading report access…'
              : protectedMode
                ? 'Report links in this batch’s certificates open only for your organization, TruMarkZ admins, and visitors the certificate holder has approved. Holders need an email and date of birth on their record to approve a request.'
                : canProtect
                  ? 'Anyone with a report link from this batch’s certificates can open it.'
                  : 'This is an Open batch, so anyone with a report link from its certificates can open it.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!state.loading && mode === ACCESS_MODES.PUBLIC && canProtect && (
            <button
              type="button"
              onClick={() => setConfirmProtect(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-blue/70 bg-white px-3 text-xs font-semibold text-brand-blue font-inter hover:bg-blue-50"
            >
              <Lock size={13} /> Require holder approval
            </button>
          )}
          <button
            type="button"
            onClick={load}
            disabled={state.loading}
            aria-label="Reload report access"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={state.loading ? 'animate-spin motion-reduce:animate-none' : ''} />
          </button>
        </div>
      </div>

      {state.error && !state.loading && (
        <p role="alert" className="mx-5 mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 font-inter">
          {state.error} <button type="button" onClick={load} className="font-semibold underline">Retry</button>
        </p>
      )}

      {!state.loading && !state.error && (
        grants.length === 0 ? (
          <p className="border-t border-gray-100 px-5 py-4 text-xs text-gray-500 font-inter">
            {protectedMode ? 'No one has asked to view these reports yet.' : 'Visitors only need to ask for access once reports are protected.'}
          </p>
        ) : (
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full min-w-[760px] text-left text-xs font-inter">
              <thead className="bg-gray-50/80 text-gray-600">
                <tr>
                  {['Visitor', 'Status', 'Requested', 'Email verified', 'Decided', 'Access until', ''].map((h) => (
                    <th key={h || 'actions'} className="px-5 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grants.map((grant) => {
                  const meta = grantStatusMeta(grant.status);
                  return (
                    <tr key={grant.id}>
                      <td className="max-w-[240px] truncate px-5 py-2.5 text-brand-dark" title={grant.grantee_email}>{grant.grantee_email || '—'}</td>
                      <td className="px-5 py-2.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}>{meta.label}</span></td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-gray-500">{formatAccessDate(grant.requested_at)}</td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-gray-500">{formatAccessDate(grant.email_verified_at)}</td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-gray-500">{formatAccessDate(grant.status === 'revoked' ? grant.revoked_at : grant.decided_at)}</td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-gray-500">{grant.status === 'approved' ? formatAccessDate(grant.expires_at) : '—'}</td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-right">
                        {canRevokeGrant(grant) && (revokeId === grant.id ? (
                          <span className="inline-flex items-center gap-2">
                            <button type="button" onClick={() => revoke(grant)} disabled={revoking === grant.id} className="inline-flex h-7 items-center gap-1 rounded-md bg-red-600 px-2.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                              {revoking === grant.id && <RefreshCw size={11} className="animate-spin motion-reduce:animate-none" />} Revoke access
                            </button>
                            <button type="button" onClick={() => setRevokeId(null)} disabled={revoking === grant.id} className="h-7 rounded-md px-2 text-[11px] font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setRevokeId(grant.id)} className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 px-2.5 text-[11px] font-medium text-red-600 hover:bg-red-50">
                            <UserX size={12} /> Revoke
                          </button>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal
        isOpen={confirmProtect}
        onClose={() => !switching && setConfirmProtect(false)}
        title="Require the holder’s approval?"
        description="This also protects certificates already issued for this batch."
        size="md"
      >
        <div className="space-y-3 text-sm text-gray-600 font-inter">
          <p>Report links in certificates that have already been shared will stop opening for the public. Anyone who scans them will need the certificate holder’s approval first.</p>
          <p>Your organization and TruMarkZ admins can still open every report.</p>
          <p className="text-xs text-gray-500">This is only allowed for Permission Required batches. If the batch is Open, the server will say so and nothing changes.</p>
        </div>
        <Modal.Footer>
          <button type="button" onClick={() => setConfirmProtect(false)} disabled={switching} className="h-9 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={protect} disabled={switching} className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-brand-blue-hover disabled:opacity-60">
            {switching ? <RefreshCw size={14} className="animate-spin motion-reduce:animate-none" /> : <Lock size={14} />} Require approval
          </button>
        </Modal.Footer>
      </Modal>
    </section>
  );
};

export default CertificateAccessPanel;
