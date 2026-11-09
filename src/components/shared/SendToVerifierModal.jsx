import { useEffect, useMemo, useState } from 'react';
import { Info, RefreshCw, Send, User } from 'lucide-react';
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

// Individual "Send to Verifier" for ONE user and ONE verification type, through the existing Smart Send
// endpoint with user_ids = [that user]. Nobody else on the batch is included.
export const SendToVerifierModal = ({ isOpen, onClose, batchId, record, typeName, onDone }) => {
  const userId = batchUserIdOf(record);
  const userName = record?.full_name || record?.product_name || record?.email || userId;
  const [verifiers, setVerifiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [verifierId, setVerifierId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!isOpen || !typeName) return undefined;
    let active = true;
    setVerifiers([]); setVerifierId(''); setError(''); setSummary(null); setLoadError(''); setLoading(true);
    verifiersAPI.getByType(typeName)
      .then(({ data }) => { if (active) setVerifiers((Array.isArray(data?.verifiers) ? data.verifiers : (Array.isArray(data) ? data : [])).filter((v) => v?.id)); })
      .catch((err) => { if (active) setLoadError(getApiError(err, 'Could not load verifiers for this verification type')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen, typeName]);

  const selected = useMemo(() => verifiers.find((v) => v.id === verifierId) || null, [verifiers, verifierId]);
  const eligible = canSendToVerifier(record, typeName);

  const send = async () => {
    if (!selected || sending || !userId) return;
    setSending(true);
    setError('');
    try {
      // Re-check on the server's latest data: this exact check must still be unapproved.
      const { data: latest } = await verificationAPI.getBatchDetails(batchId);
      const fresh = (Array.isArray(latest?.users) ? latest.users : []).find((u) => String(batchUserIdOf(u)) === String(userId));
      if (!fresh || !canSendToVerifier(fresh, typeName)) {
        setError(`${label(typeName)} is no longer pending for ${userName}. Nothing was sent.`);
        onDone?.({ refreshOnly: true });
        return;
      }
      const { data } = await verificationAPI.smartSendManualVerification({
        batch_id: batchId,
        verification_assignments: [{
          verification_type_name: typeName,
          verifiers: [{ verifier_id: selected.id, email_subject: defaultSubject(typeName), email_body: defaultBody(typeName), user_ids: [userId] }],
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

  return (
    <Modal isOpen={isOpen} onClose={() => !sending && onClose()} title="Send to Verifier" size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-blue" />
          <p className="text-xs leading-relaxed text-blue-800 font-inter">
            This assignment is for <strong>this individual user only</strong>. Other users in the batch are not included or re-assigned.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 px-4 py-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 font-inter">User</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-semibold text-brand-dark font-inter"><User size={13} className="shrink-0 text-gray-400" /> {userName}</dd>
            {record?.email && <dd className="truncate text-xs text-gray-500 font-inter">{record.email}</dd>}
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 font-inter">Verification type</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-brand-dark font-inter" title={typeName}>{typeName}</dd>
          </div>
        </dl>

        {summary ? (
          <>
            <SmartSendResult summary={summary} recordsById={{ [userId]: userName }} onResent={() => onDone?.({ resent: true })} />
            <Modal.Footer><Button onClick={onClose} className="w-full">Done</Button></Modal.Footer>
          </>
        ) : (
          <>
            {!eligible && (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 font-inter">This verification is already approved for this user, so it cannot be sent to a verifier.</p>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 font-inter">Verifier</label>
              {loading ? (
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
              <Button variant="primary" icon={sending ? RefreshCw : Send} loading={sending} disabled={!selected || !eligible || sending} onClick={send}>
                Send to Verifier
              </Button>
            </Modal.Footer>
          </>
        )}
      </div>
    </Modal>
  );
};
