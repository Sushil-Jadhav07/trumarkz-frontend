import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Mail, RefreshCw, UserX } from 'lucide-react';
import { verificationAPI, getApiError } from '@/services/api';
import { describeUserRef, emailAccepted, requestIdOf, smartSendHeadline } from '@/utils/smartSend';

const typeLabel = (name) => String(name || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// The server's answer to a Smart Send, shown as it is: created requests, requests that were already open,
// failures (with the real error) and skipped users. Resend uses the existing resend endpoint and is offered
// whenever the response carries a request id (also after an email failure, since the request exists).
export const SmartSendResult = ({ summary, recordsById = {}, onResent }) => {
  const [resending, setResending] = useState('');
  const [resendNotes, setResendNotes] = useState({}); // request id -> { ok, text }

  const resend = async (entry) => {
    const id = requestIdOf(entry);
    if (!id || resending) return;
    setResending(id);
    try {
      await verificationAPI.resendManualVerification(id);
      setResendNotes((notes) => ({ ...notes, [id]: { ok: true, text: `Link resent to ${entry.verifier_email || 'the verifier'}` } }));
      onResent?.(entry);
    } catch (err) {
      setResendNotes((notes) => ({ ...notes, [id]: { ok: false, text: getApiError(err, 'Failed to resend the verification link') } }));
    } finally {
      setResending('');
    }
  };

  const Row = ({ entry, tone, icon: Icon, children }) => {
    const id = requestIdOf(entry);
    const note = id ? resendNotes[id] : null;
    return (
      <li className={`flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${tone}`}>
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon size={15} className="mt-0.5 shrink-0" />
          <div className="min-w-0 text-xs font-inter">
            <p className="truncate text-sm font-semibold text-brand-dark">{typeLabel(entry.verification_type_name) || 'Verification'}{entry.verifier_email ? ` → ${entry.verifier_email}` : ''}</p>
            {children}
            {id && <p className="mt-0.5 text-[11px] text-gray-500">Request ID: <span className="font-mono">{id}</span></p>}
            {note && <p role="status" className={`mt-1 font-medium ${note.ok ? 'text-emerald-700' : 'text-red-600'}`}>{note.text}</p>}
          </div>
        </div>
        {id && (
          <button
            type="button"
            disabled={resending === id}
            onClick={() => resend(entry)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-blue font-inter hover:bg-blue-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={resending === id ? 'animate-spin' : ''} /> {resending === id ? 'Resending…' : 'Resend'}
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3" data-testid="smart-send-result">
      <p className="text-sm font-semibold text-brand-dark font-inter">{smartSendHeadline(summary)}</p>

      {summary.sent.length > 0 && (
        <section aria-label="Requests created">
          <ul className="space-y-2">
            {summary.sent.map((entry, i) => (
              <Row key={requestIdOf(entry) || `s${i}`} entry={entry} tone="border-emerald-100 bg-emerald-50/50 text-emerald-700" icon={CheckCircle}>
                <p className="text-emerald-700">Request created{emailAccepted(entry) ? ' — email accepted by mail server' : ''}</p>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {summary.alreadyOpen.length > 0 && (
        <section aria-label="Already open">
          <ul className="space-y-2">
            {summary.alreadyOpen.map((entry, i) => (
              <Row key={requestIdOf(entry) || `o${i}`} entry={entry} tone="border-blue-100 bg-blue-50/50 text-brand-blue" icon={Clock}>
                <p className="text-brand-dark">A request is already open for this user and verification — no new request was created.</p>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {summary.failed.length > 0 && (
        <section aria-label="Failed">
          <ul className="space-y-2">
            {summary.failed.map((entry, i) => (
              <Row key={requestIdOf(entry) || `f${i}`} entry={entry} tone="border-red-100 bg-red-50 text-red-600" icon={AlertTriangle}>
                <p className="text-red-700">{entry.error || 'Failed'}</p>
                {requestIdOf(entry) && <p className="text-gray-600">The request was created; only the email failed. Resend it when ready.</p>}
              </Row>
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
