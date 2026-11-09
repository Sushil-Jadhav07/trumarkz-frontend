import { useEffect, useMemo, useState } from 'react';
import { Info, RefreshCw, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SmartSendResult } from '@/components/shared/SmartSendResult';
import { verificationAPI, verifiersAPI, getApiError } from '@/services/api';
import { batchUserIdOf, canSendToVerifier, summarizeSmartSend } from '@/utils/smartSend';

const label = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const defaultSubject = (typeName) => `Verification Request: ${label(typeName)}`;
const defaultBody = (typeName) =>
  `Hi,\n\nPlease find the attached Excel file with the candidates assigned to you for ${label(typeName)}.\n\nComplete the verification and upload your report using the secure link provided.\n\nRegards,\nTruMarkZ Admin`;
const nameOf = (r) => r?.full_name || r?.product_name || r?.email || batchUserIdOf(r);

// Batch Actions → Send to Verifier: pick ONE verification type, then the users whose check for that type is
// still pending (all are selected by default), then a verifier. One Smart Send call carries exactly the
// selected users' ids. Users whose check is approved (or rejected) are never listed or sent.
export const SendToVerifierModal = ({ isOpen, onClose, batchId, records = [], onDone }) => {
  const types = useMemo(() => {
    const seen = [];
    records.forEach((r) => Object.keys(r?.verification_type_status || {}).forEach((name) => {
      if (canSendToVerifier(r, name) && !seen.includes(name)) seen.push(name);
    }));
    return seen;
  }, [records]);

  const [typeName, setTypeName] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [verifiers, setVerifiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [verifierId, setVerifierId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  const usersForType = useMemo(() => (typeName ? records.filter((r) => canSendToVerifier(r, typeName)) : []), [records, typeName]);

  // Opening (or the type changing) starts from "everyone still pending for this type".
  useEffect(() => {
    if (!isOpen) return;
    setTypeName(types.length === 1 ? types[0] : '');
    setVerifierId(''); setError(''); setSummary(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  useEffect(() => {
    setSelectedIds(new Set(usersForType.map((r) => String(batchUserIdOf(r)))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeName]);

  useEffect(() => {
    if (!isOpen || !typeName) { setVerifiers([]); setLoading(false); return undefined; }
    let active = true;
    setVerifiers([]); setVerifierId(''); setLoadError(''); setLoading(true);
    verifiersAPI.getByType(typeName)
      .then(({ data }) => { if (active) setVerifiers((Array.isArray(data?.verifiers) ? data.verifiers : (Array.isArray(data) ? data : [])).filter((v) => v?.id)); })
      .catch((err) => { if (active) setLoadError(getApiError(err, 'Could not load verifiers for this verification type')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen, typeName]);

  const selected = useMemo(() => verifiers.find((v) => v.id === verifierId) || null, [verifiers, verifierId]);
  const toggle = (id) => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allSelected = usersForType.length > 0 && usersForType.every((r) => selectedIds.has(String(batchUserIdOf(r))));
  const chosenCount = usersForType.filter((r) => selectedIds.has(String(batchUserIdOf(r)))).length;

  const send = async () => {
    if (!selected || sending || chosenCount === 0) return;
    setSending(true);
    setError('');
    try {
      // Re-check on the server's latest data: only users whose check for this type is STILL pending go.
      const { data: latest } = await verificationAPI.getBatchDetails(batchId);
      const stillPending = new Set((Array.isArray(latest?.users) ? latest.users : []).filter((u) => canSendToVerifier(u, typeName)).map((u) => String(batchUserIdOf(u))));
      const userIds = usersForType.map((r) => String(batchUserIdOf(r))).filter((id) => selectedIds.has(id) && stillPending.has(id));
      if (userIds.length === 0) {
        setError(`${label(typeName)} is no longer pending for the selected users. Nothing was sent.`);
        onDone?.({ refreshOnly: true });
        return;
      }
      const { data } = await verificationAPI.smartSendManualVerification({
        batch_id: batchId,
        verification_assignments: [{
          verification_type_name: typeName,
          verifiers: [{ verifier_id: selected.id, email_subject: defaultSubject(typeName), email_body: defaultBody(typeName), user_ids: userIds }],
        }],
      });
      const result = summarizeSmartSend(data);
      setSummary(result);
      if (result.totals.sent > 0 || result.alreadyOpen.length > 0 || result.resendable.length > 0) onDone?.({ result });
    } catch (err) {
      // A validation / conflict answer is shown as the error it is — never as success.
      setError(getApiError(err, 'The request could not be created'));
    } finally {
      setSending(false);
    }
  };

  const recordsById = Object.fromEntries(records.map((r) => [String(batchUserIdOf(r)), nameOf(r)]));

  return (
    <Modal isOpen={isOpen} onClose={() => !sending && onClose()} title="Send to Verifier" size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-blue" />
          <p className="text-xs leading-relaxed text-blue-800 font-inter">
            Sent to the users you tick below for the chosen verification — every user whose check is still <strong>pending</strong> is ticked by default. Users who already completed it are never included.
          </p>
        </div>

        {summary ? (
          <>
            <SmartSendResult summary={summary} recordsById={recordsById} />
            <Modal.Footer><Button onClick={onClose} className="w-full">Done</Button></Modal.Footer>
          </>
        ) : types.length === 0 ? (
          <p className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-500 font-inter">No pending verification is waiting for a verifier in this batch.</p>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 font-inter">Verification type</label>
              <CustomSelect
                className="w-full"
                value={typeName}
                onChange={setTypeName}
                placeholder="Select a verification"
                ariaLabel="Verification type"
                options={types.map((name) => ({ value: name, label: name }))}
              />
            </div>

            {typeName && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500 font-inter">Pending users ({chosenCount} of {usersForType.length} selected)</p>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(allSelected ? new Set() : new Set(usersForType.map((r) => String(batchUserIdOf(r)))))}
                    className="text-xs font-semibold text-brand-blue hover:underline font-inter"
                  >
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
                  {usersForType.map((r) => {
                    const id = String(batchUserIdOf(r));
                    return (
                      <li key={id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50">
                          <input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggle(id)} className="accent-brand-blue" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-brand-dark font-inter">{nameOf(r)}{r.batch_serial ? ` (${r.batch_serial})` : ''}</span>
                            {r.email && <span className="block truncate text-xs text-gray-500 font-inter">{r.email}</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 font-inter">Verifier</label>
              {!typeName ? (
                <p className="text-xs text-gray-400 font-inter">Choose the verification type first.</p>
              ) : loading ? (
                <p className="text-xs text-gray-400 font-inter">Loading verifiers…</p>
              ) : loadError ? (
                <p role="alert" className="text-xs text-red-600 font-inter">{loadError}</p>
              ) : verifiers.length === 0 ? (
                <p className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-500 font-inter">No verifier is set up for {typeName}.</p>
              ) : (
                <CustomSelect
                  className="w-full"
                  value={verifierId}
                  onChange={setVerifierId}
                  placeholder="Select a verifier"
                  searchable={verifiers.length > 8}
                  ariaLabel="Verifier"
                  options={verifiers.map((v) => ({ value: v.id, label: `${v.name || v.email}${v.name && v.email ? ` — ${v.email}` : ''}` }))}
                />
              )}
              {selected?.email && <p className="mt-1.5 text-xs text-gray-600 font-inter">Email will go to <span className="font-semibold text-brand-dark">{selected.email}</span></p>}
            </div>

            {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 font-inter">{error}</p>}

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
              <Button variant="primary" icon={sending ? RefreshCw : Send} loading={sending} disabled={!selected || chosenCount === 0 || sending} onClick={send}>
                Send to Verifier{chosenCount > 1 ? ` (${chosenCount} users)` : ''}
              </Button>
            </Modal.Footer>
          </>
        )}
      </div>
    </Modal>
  );
};
