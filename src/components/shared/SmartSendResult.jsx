import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Mail, RefreshCw, UserX } from 'lucide-react';
import { verificationAPI, getApiError } from '@/services/api';
import {
  describeUserRef, emailAccepted, groupByRequest, requestIdOf, resendErrorMessage, resendResultNote, smartSendHeadline,
} from '@/utils/smartSend';

const typeLabel = (name) => String(name || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// The server's answer to a Smart Send: created requests, requests that were already open, failures (with the real
// error) and skipped users. Smart Send never resends, so an already-open request is resent through
// POST /verification/manual/resend/{request_id} (a fresh link for the same holders; the old link stops working).
// Holders that share one request get ONE Resend button with their names listed under it.
export const SmartSendResult = ({ summary, recordsById = {}, onResent }) => {
  const [resending, setResending] = useState('');
  const [notes, setNotes] = useState({}); // request id -> { ok, text }

  const resend = async (group) => {
    const id = group.requestId;
    if (!id || resending) return;
    setResending(id);
    try {
      const { data } = await verificationAPI.resendManualVerification(id);
      setNotes((previous) => ({ ...previous, [id]: resendResultNote(data, group.entry?.verifier_email) }));
      onResent?.(group.entry);
    } catch (err) {
      const status = err?.response?.status;
      setNotes((previous) => ({ ...previous, [id]: { ok: false, text: resendErrorMessage(status, getApiError(err, '')) } }));
    } finally {
      setResending('');
    }
  };

  const Group = ({ group, tone, icon: Icon, children }) => {
    const id = group.requestId;
    const note = id ? notes[id] : null;
    const email = group.entry?.verifier_email;
    return (
      <li className={`rounded-xl border px-3.5 py-2.5 ${tone}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <Icon size={15} className="mt-0.5 shrink-0" />
            <div className="min-w-0 text-xs font-inter">
              <p className="truncate text-sm font-semibold text-brand-dark">{typeLabel(group.entry?.verification_type_name) || 'Verification'}{email ? ` → ${email}` : ''}</p>
              {children}
              {group.holders.length > 0 && (
                <p className="mt-0.5 text-gray-600">{group.holders.length} holder{group.holders.length === 1 ? '' : 's'}: {group.holders.join(', ')}</p>
              )}
              {id && <p className="mt-0.5 text-[11px] text-gray-500">Request ID: <span className="font-mono">{id}</span></p>}
            </div>
          </div>
          {id && (
            <button
              type="button"
              disabled={resending === id}
              onClick={() => resend(group)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-blue font-inter hover:bg-blue-50 disabled:opacity-50"
            >
              <RefreshCw size={12} className={resending === id ? 'animate-spin motion-reduce:animate-none' : ''} />
              {resending === id ? 'Resending…' : group.holders.length > 1 ? `Resend (${group.holders.length} holders)` : 'Resend'}
            </button>
          )}
        </div>
        {note && <p role="status" className={`mt-1.5 pl-[25px] text-xs font-medium font-inter ${note.ok ? 'text-emerald-700' : 'text-red-600'}`}>{note.text}</p>}
      </li>
    );
  };

  const sentGroups = groupByRequest(summary.sent, recordsById);
  const openGroups = groupByRequest(summary.alreadyOpen, recordsById);
  const failedGroups = groupByRequest(summary.failed, recordsById);

  return (
    <div className="space-y-3" data-testid="smart-send-result">
      <p className="text-sm font-semibold text-brand-dark font-inter">{smartSendHeadline(summary)}</p>

      {sentGroups.length > 0 && (
        <section aria-label="Requests created">
          <ul className="space-y-2">
            {sentGroups.map((group, i) => (
              <Group key={group.requestId || `s${i}`} group={group} tone="border-emerald-100 bg-emerald-50/50 text-emerald-700" icon={CheckCircle}>
                <p className="text-emerald-700">Request created{emailAccepted(group.entry) ? ' — email accepted by mail server' : ''}</p>
              </Group>
            ))}
          </ul>
        </section>
      )}

      {openGroups.length > 0 && (
        <section aria-label="Already open">
          <ul className="space-y-2">
            {openGroups.map((group, i) => (
              <Group key={group.requestId || `o${i}`} group={group} tone="border-blue-100 bg-blue-50/50 text-brand-blue" icon={Clock}>
                <p className="text-brand-dark">A request is already open for {group.holders.length > 1 ? 'these holders' : 'this holder'} — no new request was created. Resend to give the verifier a fresh link.</p>
              </Group>
            ))}
          </ul>
        </section>
      )}

      {failedGroups.length > 0 && (
        <section aria-label="Failed">
          <ul className="space-y-2">
            {failedGroups.map((group, i) => (
              <Group key={group.requestId || `f${i}`} group={group} tone="border-red-100 bg-red-50 text-red-600" icon={AlertTriangle}>
                <p className="text-red-700">{group.entry?.error || 'Failed'}</p>
                {group.requestId && <p className="text-gray-600">The request was created; only the email failed. Resend it when ready.</p>}
              </Group>
            ))}
          </ul>
        </section>
      )}

      {(summary.skippedUsers.length > 0 || summary.totals.skipped > 0) && (
        <section aria-label="Skipped users" className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 font-inter"><UserX size={13} /> {summary.totals.skipped} user{summary.totals.skipped === 1 ? '' : 's'} skipped</p>
          {summary.skippedUsers.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs text-gray-600 font-inter">
              {summary.skippedUsers.map((item, i) => {
                const user = describeUserRef(item, recordsById);
                return <li key={user.id || i}>{user.name}{user.reason ? <span className="text-gray-400"> — {user.reason}</span> : ''}</li>;
              })}
            </ul>
          )}
        </section>
      )}

      {summary.sent.length + summary.alreadyOpen.length + summary.failed.length === 0 && summary.totals.skipped === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500 font-inter"><Mail size={13} /> The server did not report any request.</p>
      )}
    </div>
  );
};
