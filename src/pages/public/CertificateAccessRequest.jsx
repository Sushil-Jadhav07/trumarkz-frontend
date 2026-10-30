import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Clock, Download, FileText, Hourglass, Link2, Lock, Mail, RefreshCw, ShieldX, XCircle,
} from 'lucide-react';
import { OTPInput } from '@/components/ui/OTPInput';
import {
  PublicAccessShell, AccessCard, AccessState, PrimaryButton, SecondaryButton,
} from '@/components/shared/PublicAccessShell';
import { certificateAccessAPI, fetchReportBlob, getApiError, reportApiBaseUrl } from '@/services/api';
import { parseReportReference, referenceFromParams, reportUrlFromReference, retryAfterText } from '@/utils/reportAccess';
import { isValidEmail, visitorStatusView, validateAccessRequestCreated, validateAccessRequestStatus } from '@/utils/certificateAccess';

// Visitor flow for a protected (holder_approval) report — web change report §4d.
// 1. ask for access with an email  2. enter the emailed code  3. wait for the
// certificate holder  4. view the report with the visitor access token.
// The token is shown once by the server and kept only in this tab's session.

const STORAGE_KEY = 'trumarkz_cert_access_request';

const readStored = () => {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
};
const writeStored = (value) => {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* storage blocked: the flow still works for this page view */ }
};

const describeError = (err, fallback) => {
  const status = err?.response?.status;
  const retryAfter = err?.response?.headers?.['retry-after'];
  if (status === 429) return { status, message: `Too many attempts. ${retryAfterText(retryAfter)}` };
  if (status === 503) return { status, message: 'This service is temporarily unavailable. Please try again in a few minutes.' };
  return { status, message: getApiError(err, err?.message || fallback) };
};

const ReportViewer = ({ report, onClose }) => {
  const isPdf = report.blob.type === 'application/pdf';
  const isImage = report.blob.type.startsWith('image/');
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <p className="flex items-center gap-2 text-xs font-medium text-gray-700"><FileText size={14} /> Verification report</p>
        <div className="flex items-center gap-3">
          <a href={report.url} download="verification-report" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"><Download size={13} /> Download</a>
          <button type="button" onClick={onClose} className="text-xs font-medium text-gray-500 hover:text-gray-700">Close</button>
        </div>
      </div>
      {isPdf ? <iframe src={report.url} title="Verification report" className="h-[70vh] w-full border-0" />
        : isImage ? <img src={report.url} alt="Verification report" className="mx-auto max-h-[70vh] w-auto" />
          : <p className="px-4 py-6 text-center text-sm text-gray-600">This file can’t be previewed here. Use Download to open it.</p>}
    </div>
  );
};

export const CertificateAccessRequest = () => {
  const [params] = useSearchParams();
  return <CertificateAccessRequestContent key={params.toString()} params={params} />;
};

const CertificateAccessRequestContent = ({ params }) => {
  const stored = useMemo(readStored, []);
  const paramRef = useMemo(() => referenceFromParams(params), [params]);
  const hasReference = ['document_id', 'request_id', 'file_index', 'report'].some((key) => params.has(key));
  // A stored request only resumes when it is for the same report (or no report was named).
  const resume = stored?.requestId && (!hasReference || (paramRef && JSON.stringify(stored.reference) === JSON.stringify(paramRef))) ? stored : null;

  const [reference, setReference] = useState(resume?.reference || paramRef);
  const [linkInput, setLinkInput] = useState('');
  const [email, setEmail] = useState(resume?.email || '');
  const [step, setStep] = useState(resume?.accessToken ? 'status' : resume?.requestId ? 'code' : 'email');
  // Visitor access-request ID; the report's ID stays in reference.request_id.
  const [requestId, setRequestId] = useState(resume?.requestId || null);
  const [accessToken, setAccessToken] = useState(resume?.accessToken || null);
  const [sentMessage, setSentMessage] = useState(resume?.message || '');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(hasReference && !paramRef ? { message: 'This report link is incomplete or invalid. Paste the full report link below to continue.' } : null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const busyRef = useRef(false);
  const activeRef = useRef(true);
  const generationRef = useRef(0);
  const statusReadsRef = useRef(0);
  const [pollPaused, setPollPaused] = useState(false);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; generationRef.current++; busyRef.current = false; };
  }, []);

  const reportUrl = reportUrlFromReference(reference, reportApiBaseUrl);

  useEffect(() => () => { if (report?.url) URL.revokeObjectURL(report.url); }, [report]);

  // Single-use codes and links: never let a double-click send the same request twice.
  const run = useCallback(async (fn) => {
    if (busyRef.current) return;
    const generation = generationRef.current;
    const current = () => activeRef.current && generationRef.current === generation;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try { await fn(current); } finally { if (current()) { busyRef.current = false; setBusy(false); } }
  }, []);

  const startOver = (keepEmail = true) => {
    generationRef.current++;
    busyRef.current = false;
    statusReadsRef.current = 0;
    setBusy(false); setPollPaused(false);
    writeStored(null);
    setRequestId(null); setAccessToken(null); setStatus(null); setOtp(''); setSentMessage('');
    setReport(null); setError(null);
    if (!keepEmail) setEmail('');
    setStep('email');
  };

  const submitLink = (event) => {
    event.preventDefault();
    const ref = parseReportReference(linkInput);
    if (!ref) { setError({ message: 'That isn’t a TruMarkZ report link. Copy the full link from the certificate and try again.' }); return; }
    setError(null);
    setReference(ref);
  };

  const requestAccess = (event) => {
    event.preventDefault();
    if (!isValidEmail(email)) { setError({ message: 'Enter a valid email address.' }); return; }
    if (!reportUrl) { setError({ message: 'Choose a valid report before requesting access.' }); return; }
    run(async (current) => {
      try {
        const { data } = await certificateAccessAPI.requestAccess({ visitor_email: email.trim(), ...reference });
        if (!current()) return;
        validateAccessRequestCreated(data);
        setRequestId(data.request_id);
        setSentMessage(data.message || 'If this report can be shared, we’ve sent a code to your email.');
        setOtp('');
        setStep('code');
        writeStored({ requestId: data.request_id, email: email.trim(), reference, message: data.message });
      } catch (err) {
        if (!current()) return;
        setError(describeError(err, 'We couldn’t send the request. Please try again.'));
      }
    });
  };

  const verifyCode = () => {
    if (!/^\d{6}$/.test(otp)) { setError({ message: 'Enter all 6 digits of the code.' }); return; }
    run(async (current) => {
      try {
        const { data } = await certificateAccessAPI.verifyRequest(requestId, otp);
        if (!current()) return;
        validateAccessRequestStatus(data, requestId, { verified: true });
        setAccessToken(data.access_token);
        setStatus(data.status);
        setStep('status');
        writeStored({ requestId, email: email.trim(), reference, accessToken: data.access_token });
      } catch (err) {
        if (!current()) return;
        const described = describeError(err, 'Invalid or expired code');
        setError({ ...described, canResend: described.status === 400 });
        setOtp('');
      }
    });
  };

  const checkStatus = useCallback(async ({ quiet = false } = {}) => {
    if (!requestId || !accessToken || busyRef.current) return;
    await run(async (current) => {
      try {
        statusReadsRef.current++;
        const { data } = await certificateAccessAPI.getRequestStatus(requestId, accessToken);
        if (!current()) return;
        validateAccessRequestStatus(data, requestId);
        setStatus(data.status);
        if (data.status !== 'approved') setReport(null);
        setPollPaused(statusReadsRef.current >= 30);
      } catch (err) {
        if (!current()) return;
        const described = describeError(err, 'We couldn’t check this request.');
        setReport(null);
        if (described.status === 404) { setStatus('not_found'); writeStored(null); }
        else { setStatus('failed'); setError(described); }
      }
    });
  }, [requestId, accessToken, run]);

  // Resume with a fresh read; only pending requests poll. Reads cannot overlap
  // manual actions, stop on errors/terminal states and pause on hidden tabs.
  useEffect(() => {
    if (step !== 'status') return undefined;
    if (status == null) { checkStatus(); return undefined; }
    if (!['pending_email', 'pending_approval'].includes(status)) return undefined;
    const timer = setInterval(() => {
      if (statusReadsRef.current >= 30) { clearInterval(timer); setPollPaused(true); return; }
      if (document.visibilityState === 'visible') checkStatus({ quiet: true });
    }, 60_000);
    return () => clearInterval(timer);
  }, [step, status, checkStatus]);

  const viewReport = () => {
    if (status !== 'approved' || !accessToken || !reportUrl) return;
    run(async (current) => {
    try {
      const blob = await fetchReportBlob(reportUrl, { accessToken });
      if (!current()) return;
      setReport((previous) => { if (previous?.url) URL.revokeObjectURL(previous.url); return { blob, url: URL.createObjectURL(blob) }; });
    } catch (err) {
      if (!current()) return;
      if (err?.status === 403) {
        setStatus('failed');
        setError({ message: 'This report isn’t available to you right now — your access may have expired or been revoked.' });
      } else {
        setError({ message: err?.status === 429 ? `Too many attempts. ${retryAfterText(err.retryAfter)}` : (err?.message || 'The report could not be opened.') });
      }
    }
    });
  };

  const view = step === 'status' ? (status == null ? 'checking' : status === 'not_found' ? 'not_found' : visitorStatusView(status)) : step;

  return (
    <PublicAccessShell badge="Protected report">
      <AccessCard>
        {!reference ? (
          <form onSubmit={submitLink} noValidate>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-brand-blue"><Lock size={20} strokeWidth={1.75} /></span>
            <h1 className="mt-4 font-sora text-xl font-bold">This report is protected</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">The certificate holder decides who can see their verification reports. Paste the report link from the certificate to ask for access.</p>
            <label htmlFor="report-link" className="mt-5 block text-xs font-medium text-gray-700">Report link</label>
            <div className="relative mt-1.5">
              <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input id="report-link" value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="https://…/verification/documents/…/view" className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
            </div>
            {error && <p role="alert" className="mt-2 text-xs text-red-600">{error.message}</p>}
            <PrimaryButton type="submit" className="mt-5 w-full">Continue</PrimaryButton>
          </form>
        ) : view === 'email' ? (
          <form onSubmit={requestAccess} noValidate>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-brand-blue"><Lock size={20} strokeWidth={1.75} /></span>
            <h1 className="mt-4 font-sora text-xl font-bold">Ask to view this report</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">This verification report is protected. We’ll email you a code to confirm your address, then ask the certificate holder to approve your request.</p>
            <label htmlFor="visitor-email" className="mt-5 block text-xs font-medium text-gray-700">Your email</label>
            <div className="relative mt-1.5">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input id="visitor-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
            </div>
            {error && <p role="alert" className="mt-2 text-xs text-red-600">{error.message}</p>}
            <PrimaryButton type="submit" loading={busy} className="mt-5 w-full">
              {busy && <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" />} Send code
            </PrimaryButton>
            <p className="mt-4 text-xs leading-5 text-gray-500">Confirming your email doesn’t give you access by itself — only the certificate holder can approve it.</p>
          </form>
        ) : view === 'code' ? (
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-brand-blue"><Mail size={20} strokeWidth={1.75} /></span>
            <h1 className="mt-4 font-sora text-xl font-bold">Enter the code</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">{sentMessage} Enter the verification code from your email.</p>
            <p className="mt-1 text-xs text-gray-500">Sent to <span className="font-medium text-gray-700">{email}</span></p>
            <div className="mt-6"><OTPInput value={otp} onChange={setOtp} error={error?.message} /></div>
            {error && <p role="alert" className="mt-3 text-center text-xs text-red-600">{error.message}</p>}
            <PrimaryButton type="button" onClick={verifyCode} loading={busy} disabled={otp.length !== 6} className="mt-6 w-full">
              {busy && <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" />} Verify code
            </PrimaryButton>
            <div className="mt-4 text-center text-xs">
              <button type="button" onClick={() => startOver(true)} disabled={busy} className="font-semibold text-brand-blue hover:underline disabled:opacity-60">{error?.canResend ? 'Request a new code' : 'Didn’t get it? Send a new code'}</button>
            </div>
          </div>
        ) : view === 'checking' ? (
          <AccessState icon={RefreshCw} title="Checking your access">
            <p role="status">Loading the latest decision for your request…</p>
          </AccessState>
        ) : view === 'approved' ? (
          <div>
            <AccessState icon={CheckCircle2} tone="bg-green-50 text-green-600" title="Access approved">
              The certificate holder approved your request. You can view the report while your access remains active.
            </AccessState>
            {error && <p role="alert" className="mt-4 text-center text-xs text-red-600">{error.message}</p>}
            {!report && (
              <div className="mt-6 flex justify-center">
                <PrimaryButton type="button" onClick={viewReport} loading={busy}>
                  {busy ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" /> : <FileText size={16} />} View report
                </PrimaryButton>
              </div>
            )}
            {report && <ReportViewer report={report} onClose={() => setReport(null)} />}
          </div>
        ) : view === 'waiting' ? (
          <AccessState
            icon={Hourglass}
            tone="bg-orange-50 text-orange-600"
            title="Waiting for the certificate holder"
            action={(
              <SecondaryButton onClick={() => checkStatus()} disabled={busy}>
                <RefreshCw size={15} className={busy ? 'animate-spin motion-reduce:animate-none' : ''} /> Check again
              </SecondaryButton>
            )}
          >
            <p>Your email is confirmed. We’ve asked the certificate holder to approve your request.</p>
            <p className="mt-2 text-xs text-gray-500">{pollPaused ? 'Automatic checks paused. Use Check again for the latest decision.' : 'Keep this tab open, or come back to it later in this browser. It checks for a decision every minute.'}</p>
            {error && <p role="alert" className="mt-3 text-xs text-red-600">{error.message}</p>}
          </AccessState>
        ) : view === 'failed' ? (
          <AccessState icon={AlertTriangle} tone="bg-red-50 text-red-600" title="Couldn’t confirm access" action={(
            <div className="flex flex-wrap justify-center gap-3">
              {requestId && accessToken && <SecondaryButton onClick={() => checkStatus()} disabled={busy}>Check again</SecondaryButton>}
              <SecondaryButton onClick={() => startOver(true)} disabled={busy}>Start a new request</SecondaryButton>
            </div>
          )}>
            <p role="alert">{error?.message || 'The access request could not be completed. Check its status again or start a new request.'}</p>
          </AccessState>
        ) : view === 'not_found' ? (
          <AccessState icon={AlertTriangle} tone="bg-gray-100 text-gray-600" title="Request not found" action={<PrimaryButton type="button" onClick={() => startOver(true)}>Start a new request</PrimaryButton>}>
            This request is no longer available. You can ask again.
          </AccessState>
        ) : (
          <AccessState
            icon={view === 'rejected' ? XCircle : view === 'revoked' ? ShieldX : Clock}
            tone={view === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}
            title={view === 'rejected' ? 'Request declined' : view === 'revoked' ? 'Access revoked' : 'Request expired'}
            action={<PrimaryButton type="button" onClick={() => startOver(true)}>Start a new request</PrimaryButton>}
          >
            {view === 'rejected' && 'The certificate holder declined your request to view this report.'}
            {view === 'revoked' && 'The organization that issued this certificate has withdrawn your access.'}
            {view === 'expired' && 'This request or its access period has ended.'}
          </AccessState>
        )}
      </AccessCard>
      <p className="mt-6 text-center text-xs leading-5 text-gray-500">Only the certificate holder can approve access. TruMarkZ never shares protected reports without their approval.</p>
    </PublicAccessShell>
  );
};

export default CertificateAccessRequest;
