import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Mail, RefreshCw } from 'lucide-react';
import { OTPInput } from '@/components/ui/OTPInput';
import { PublicAccessShell, AccessCard, AccessState, PrimaryButton, SecondaryButton } from '@/components/shared/PublicAccessShell';
import { ApprovedReports, CheckStatusChip } from '@/components/shared/CertificateAccessChecks';
import { certificateAccessAPI, getApiError, reportApiBaseUrl } from '@/services/api';
import { retryAfterText } from '@/utils/reportAccess';
import { formatAccessDate, grantStatusMeta, isValidEmail, validateAccessRequestCreated, validateAccessRequestStatus } from '@/utils/certificateAccess';
import {
  approvedReportsWithExpiry, cachedTokenFor, expiryText, normalizeStatusChecks, readAccessCache, statusErrorKind, writeAccessCache,
} from '@/utils/accessChecks';

// The page the decision email links to: /certificate-access/status/{requestId}.
// The permissions live on the server. This browser only caches the last token as a convenience, so a status
// link opened somewhere else (or after the token is gone) asks the visitor to verify their email again
// (POST /requests/{id}/resume → a NEW request id and an OTP, then /verify as usual).

const FIELD = 'h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20';

const describe = (err, fallback) => {
  const status = err?.response?.status;
  if (status === 429) return `Too many attempts. ${retryAfterText(err?.response?.headers?.['retry-after'])}`;
  if (status === 503) return 'This service is temporarily unavailable. Please try again in a few minutes.';
  return getApiError(err, err?.message || fallback);
};

export const CertificateAccessStatus = () => {
  const { requestId } = useParams();
  return <StatusContent key={requestId} requestId={requestId} />;
};

const StatusContent = ({ requestId }) => {
  const navigate = useNavigate();
  const cached = cachedTokenFor(requestId);
  const [token, setToken] = useState(cached?.accessToken || null);
  const [view, setView] = useState(cached ? 'loading' : 'verify'); // loading | ready | verify | error
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const activeRef = useRef(true);

  // verify-again flow
  const [email, setEmail] = useState(() => readAccessCache()?.email || '');
  const [step, setStep] = useState('email'); // email | code
  const [newRequestId, setNewRequestId] = useState(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [sentMessage, setSentMessage] = useState('');

  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; }; }, []);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!token) return;
    if (quiet) setRefreshing(true); else setView('loading');
    try {
      const { data: body } = await certificateAccessAPI.getRequestStatus(requestId, token);
      if (!activeRef.current) return;
      validateAccessRequestStatus(body, requestId);
      setData(body);
      setView('ready');
      setError('');
    } catch (err) {
      if (!activeRef.current) return;
      const kind = statusErrorKind(err?.response?.status);
      if (kind === 'verify_again') { setToken(null); setView('verify'); setStep('email'); return; }
      setError(describe(err, 'We couldn’t load this request.'));
      if (!quiet || view !== 'ready') setView('error');
    } finally {
      if (activeRef.current) setRefreshing(false);
    }
  }, [requestId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (token) load(); }, [token, load]);

  const checks = normalizeStatusChecks(data);
  const reports = approvedReportsWithExpiry(data, reportApiBaseUrl);
  const hasRequested = checks.some((c) => c.status === 'requested');

  // While something waits for the holder, look again every minute (visible tab, at most 30 times).
  useEffect(() => {
    if (view !== 'ready' || !hasRequested) return undefined;
    let reads = 0;
    const timer = setInterval(() => {
      if (++reads > 30) { clearInterval(timer); return; }
      if (document.visibilityState === 'visible') load({ quiet: true });
    }, 60_000);
    return () => clearInterval(timer);
  }, [view, hasRequested, load]);

  const sendCode = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!isValidEmail(email)) { setVerifyError('Enter a valid email address.'); return; }
    setBusy(true); setVerifyError('');
    try {
      const { data: created } = await certificateAccessAPI.resumeRequest(requestId, email.trim());
      if (!activeRef.current) return;
      validateAccessRequestCreated(created);
      setNewRequestId(created.request_id);
      setSentMessage(created.message || 'If this email can continue this request, we’ve sent a code to it.');
      setOtp(''); setStep('code');
    } catch (err) {
      if (activeRef.current) setVerifyError(describe(err, 'We couldn’t send the code. Please try again.'));
    } finally {
      if (activeRef.current) setBusy(false);
    }
  };

  const verify = async () => {
    if (busy || !/^\d{6}$/.test(otp)) { if (!/^\d{6}$/.test(otp)) setVerifyError('Enter all 6 digits of the code.'); return; }
    setBusy(true); setVerifyError('');
    try {
      const { data: verified } = await certificateAccessAPI.verifyRequest(newRequestId, otp);
      if (!activeRef.current) return;
      validateAccessRequestStatus(verified, newRequestId, { verified: true });
      writeAccessCache({ requestId: newRequestId, accessToken: verified.access_token, email: email.trim() });
      // The new request carries the earlier approvals for this same holder: open its status page.
      navigate(`/certificate-access/status/${encodeURIComponent(newRequestId)}`, { replace: true });
    } catch (err) {
      if (!activeRef.current) return;
      setVerifyError(describe(err, 'Invalid or expired code'));
      setOtp('');
    } finally {
      if (activeRef.current) setBusy(false);
    }
  };

  return (
    <PublicAccessShell badge="Report access status">
      <AccessCard>
        {view === 'loading' ? (
          <div role="status" className="flex flex-col items-center py-10 text-sm text-gray-500">
            <RefreshCw size={20} className="mb-3 animate-spin text-brand-blue motion-reduce:animate-none" /> Loading your request…
          </div>
        ) : view === 'verify' ? (
          step === 'email' ? (
            <form onSubmit={sendCode} noValidate>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-brand-blue"><Mail size={20} strokeWidth={1.75} /></span>
              <h1 className="mt-4 font-sora text-xl font-bold">Verify your email to continue</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">This browser doesn’t have your access yet. Enter the email you used for this request and we’ll send a code. Your earlier approvals for the same certificate holder carry over once you verify.</p>
              <label htmlFor="resume-email" className="mt-5 block text-xs font-medium text-gray-700">Your email</label>
              <div className="relative mt-1.5">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="resume-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={FIELD} />
              </div>
              {verifyError && <p role="alert" className="mt-2 text-xs text-red-600">{verifyError}</p>}
              <PrimaryButton type="submit" loading={busy} className="mt-5 w-full">
                {busy && <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" />} Send code
              </PrimaryButton>
            </form>
          ) : (
            <div>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-brand-blue"><Mail size={20} strokeWidth={1.75} /></span>
              <h1 className="mt-4 font-sora text-xl font-bold">Enter the code</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">{sentMessage}</p>
              <p className="mt-1 text-xs text-gray-500">Sent to <span className="font-medium text-gray-700">{email}</span></p>
              <div className="mt-6"><OTPInput value={otp} onChange={setOtp} error={verifyError} /></div>
              {verifyError && <p role="alert" className="mt-3 text-center text-xs text-red-600">{verifyError}</p>}
              <PrimaryButton type="button" onClick={verify} loading={busy} disabled={otp.length !== 6} className="mt-6 w-full">
                {busy && <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" />} Verify code
              </PrimaryButton>
              <div className="mt-4 text-center text-xs">
                <button type="button" onClick={() => { setStep('email'); setVerifyError(''); }} disabled={busy} className="font-semibold text-brand-blue hover:underline disabled:opacity-60">Use a different email or send a new code</button>
              </div>
            </div>
          )
        ) : view === 'error' ? (
          <AccessState icon={AlertTriangle} tone="bg-orange-50 text-orange-600" title="We couldn’t load this request"
            action={<SecondaryButton onClick={() => load()}><RefreshCw size={15} /> Try again</SecondaryButton>}>
            <p role="alert">{error}</p>
          </AccessState>
        ) : (
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-brand-blue"><ClipboardList size={20} strokeWidth={1.75} /></span>
            <h1 className="mt-4 font-sora text-xl font-bold">Your report access</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">Each check has its own permission. You can open only the reports the certificate holder approved.</p>

            <dl className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100 text-sm">
              <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><dt className="text-gray-500">Request</dt><dd className="font-medium text-brand-dark">{grantStatusMeta(data?.status).label}</dd></div>
              {data?.identity_type && <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><dt className="text-gray-500">Access as</dt><dd className="font-medium capitalize text-brand-dark">{String(data.identity_type).replace(/_/g, ' ')}</dd></div>}
            </dl>

            {checks.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-medium text-gray-700">Checks ({checks.length})</p>
                <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100">
                  {checks.map((check) => {
                    const left = check.status === 'approved' ? expiryText(check.expiresAt) : '';
                    return (
                      <li key={check.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-gray-800">{check.name}</span>
                          <span className="block text-xs text-gray-500">
                            {check.status === 'approved' && check.expiresAt ? `Access until ${formatAccessDate(check.expiresAt)}${left ? ` · ${left}` : ''}`
                              : check.decidedAt ? `Decided ${formatAccessDate(check.decidedAt)}`
                                : check.requestedAt ? `Requested ${formatAccessDate(check.requestedAt)}` : ''}
                          </span>
                        </span>
                        <CheckStatusChip status={check.status} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-5">
              {reports.length > 0 ? (
                <ApprovedReports reports={reports} accessToken={token} onRefresh={() => load({ quiet: true })} refreshing={refreshing} onExpired={() => load({ quiet: true })} />
              ) : (
                <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm leading-6 text-gray-600">
                  {data?.identity_type && data.identity_type !== 'third_party'
                    ? 'Open the original report link from the certificate to confirm your details and view your reports.'
                    : hasRequested ? 'No report is approved yet. We’ll email you when the holder decides, and this page checks again every minute.'
                      : 'No approved reports yet.'}
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs">
              <button type="button" onClick={() => load({ quiet: true })} disabled={refreshing} className="inline-flex items-center gap-1 font-semibold text-brand-blue hover:underline disabled:opacity-60">
                <RefreshCw size={12} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} /> Check again
              </button>
              <button type="button" onClick={() => { writeAccessCache(null); setToken(null); setStep('email'); setView('verify'); }} className="font-semibold text-gray-500 hover:underline">Verify again</button>
            </div>
          </div>
        )}
      </AccessCard>
      <p className="mt-6 text-center text-xs leading-5 text-gray-500">Approved access lasts for a limited time. After it ends, the report can no longer be opened.</p>
    </PublicAccessShell>
  );
};

export default CertificateAccessStatus;
