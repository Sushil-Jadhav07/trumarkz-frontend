import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, FileText, LinkIcon, RefreshCw, UserCheck, XCircle } from 'lucide-react';
import {
  PublicAccessShell, AccessCard, AccessState, PrimaryButton, SecondaryButton,
} from '@/components/shared/PublicAccessShell';
import { certificateAccessAPI, getApiError } from '@/services/api';
import { retryAfterText } from '@/utils/reportAccess';
import {
  REPORT_DECISION_META, applyReportDecisions, formatAccessDate, holderApprovalReports, normalisePhoneInput,
  undecidedReports, validateHolderInfo,
} from '@/utils/certificateAccess';

// Certificate holder decides on a visitor's request — handoff section I.
// The approval email links to exactly /certificate-access/approve/{token}. The holder proves who they are
// with the DOB (and phone, when one is on record). Each requested report is approved or declined on its
// own; "Approve all" / "Decline all" decide every report still waiting in THIS request. The link stays
// valid while reports remain undecided (until the deadline).

const describeError = (err, fallback) => {
  const status = err?.response?.status;
  if (status === 429) return { status, message: `Too many attempts. ${retryAfterText(err?.response?.headers?.['retry-after'])}` };
  if (status === 503) return { status, message: 'This service is temporarily unavailable. Please try again in a few minutes.' };
  if (status === 403) return { status, message: 'The details you entered do not match our records.' };
  if (status === 422) return { status, message: 'That decision was not valid. Reload the page and try again.' };
  return { status, message: getApiError(err, err?.message || fallback) };
};

export const CertificateAccessApprove = () => {
  const { token } = useParams();
  return <CertificateAccessApproveContent key={token} token={token} />;
};

const FIELD = 'mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20';

const CertificateAccessApproveContent = ({ token }) => {
  const [load, setLoad] = useState({ loading: true, info: null, error: null });
  const [reports, setReports] = useState([]);
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(null); // 'all-approve' | 'all-reject' | 'report:<id>:<decision>' | null
  const [formError, setFormError] = useState(null);
  const [result, setResult] = useState(null); // 'approved' | 'rejected' | 'done' | 'gone'
  const busyRef = useRef(false);
  const generationRef = useRef(0);

  const fetchInfo = async () => {
    const generation = ++generationRef.current;
    setLoad({ loading: true, info: null, error: null });
    try {
      const { data } = await certificateAccessAPI.getApproval(token);
      if (generationRef.current !== generation) return;
      validateHolderInfo(data);
      setReports(holderApprovalReports(data));
      setLoad({ loading: false, info: data, error: null });
    } catch (err) {
      if (generationRef.current !== generation) return;
      setLoad({ loading: false, info: null, error: describeError(err, 'This request could not be loaded.') });
    }
  };

  useEffect(() => { fetchInfo(); return () => { generationRef.current++; }; }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const { loading, info, error } = load;
  const hasReportList = reports.length > 0;
  const waiting = undecidedReports(reports);

  // Shared identity check for every decision.
  const identityProblem = () => {
    if (!dob) return 'Enter your date of birth.';
    if (info?.requires_phone_number && phone.replace(/\D/g, '').length < 10) return 'Enter the phone number on your record.';
    return null;
  };
  const identityBody = () => ({ dob, ...(info?.requires_phone_number ? { phone_number: phone.trim() } : {}) });

  // The link is single-use per decision: never send two at once.
  const send = async (key, call) => {
    if (busyRef.current || loading || error || !info) return;
    const problem = identityProblem();
    if (problem) { setFormError({ message: problem }); return; }
    busyRef.current = true;
    const generation = generationRef.current;
    setSubmitting(key);
    setFormError(null);
    try {
      await call(generation);
    } catch (err) {
      if (generationRef.current !== generation) return;
      const described = describeError(err, 'We couldn’t record your decision.');
      if (described.status === 404) setResult(reports.length && undecidedReports(reports).length === 0 ? 'done' : 'gone');
      else setFormError(described);
    } finally {
      if (generationRef.current === generation) { busyRef.current = false; setSubmitting(null); }
    }
  };

  const afterDecision = (nextReports) => {
    setReports(nextReports);
    if (undecidedReports(nextReports).length === 0) setResult('done');
  };

  // One report.
  const decideReport = (reportId, decision) => send(`report:${reportId}:${decision}`, async (generation) => {
    const decisions = [{ report_id: reportId, decision }];
    const { data } = await certificateAccessAPI.decideReports(token, { decisions, ...identityBody() });
    if (generationRef.current !== generation) return;
    afterDecision(applyReportDecisions(reports, data, decisions));
  });

  // Every report still waiting in this request (or, on an older server with no list, the single decision).
  const decideAll = (decision) => send(`all-${decision}`, async (generation) => {
    const { data } = await certificateAccessAPI.decideApproval(token, { decision, ...identityBody() });
    if (generationRef.current !== generation) return;
    if (!hasReportList) { setResult(decision === 'approve' ? 'approved' : 'rejected'); return; }
    const decisions = waiting.map((r) => ({ report_id: r.report_id, decision }));
    afterDecision(applyReportDecisions(reports, data, decisions));
  });

  const approvedCount = reports.filter((r) => r.status === 'approved').length;

  return (
    <PublicAccessShell badge="Certificate holder approval">
      <AccessCard>
        {loading ? (
          <div role="status" className="flex flex-col items-center py-10 text-sm text-gray-500">
            <RefreshCw size={20} className="mb-3 animate-spin text-brand-blue motion-reduce:animate-none" /> Loading request…
          </div>
        ) : result === 'approved' ? (
          <AccessState icon={CheckCircle2} tone="bg-green-50 text-green-600" title="Access approved">
            {info?.visitor_email} can now view your verification reports while the approved access remains active. This link has now been used.
          </AccessState>
        ) : result === 'rejected' ? (
          <AccessState icon={XCircle} tone="bg-gray-100 text-gray-600" title="Request declined">
            {info?.visitor_email} won’t be able to view your verification reports. This link has now been used.
          </AccessState>
        ) : result === 'done' ? (
          <div>
            <AccessState icon={CheckCircle2} tone="bg-green-50 text-green-600" title="All decisions recorded">
              {approvedCount > 0
                ? `${info?.visitor_email} can view ${approvedCount} of the ${reports.length} report${reports.length === 1 ? '' : 's'} you approved, while the approved access remains active.`
                : `${info?.visitor_email} won’t be able to view any of these reports.`}
            </AccessState>
            <ul className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-100 text-sm">
              {reports.map((r) => {
                const meta = REPORT_DECISION_META[r.status] || REPORT_DECISION_META.requested;
                return (
                  <li key={r.report_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span className="flex items-center gap-2 font-medium text-brand-dark"><FileText size={14} className="text-gray-500" />{r.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.tone}`}>{meta.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : result === 'gone' || error?.status === 404 ? (
          <AccessState icon={LinkIcon} tone="bg-gray-100 text-gray-600" title="This link has expired or was already used">
            The request is no longer available — it may have been answered already, or the time to respond has passed.
          </AccessState>
        ) : error ? (
          <AccessState
            icon={AlertTriangle}
            tone="bg-orange-50 text-orange-600"
            title="We couldn’t load this request"
            action={<SecondaryButton onClick={fetchInfo}><RefreshCw size={15} /> Try again</SecondaryButton>}
          >
            {error.message}
          </AccessState>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); decideAll('approve'); }} noValidate>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-brand-blue"><UserCheck size={20} strokeWidth={1.75} /></span>
            <h1 className="mt-4 font-sora text-xl font-bold">Someone wants to view your verification reports</h1>
            <dl className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100 text-sm">
              <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><dt className="text-gray-500">Requested by</dt><dd className="break-all font-medium text-brand-dark">{info?.visitor_email || '—'}</dd></div>
              <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><dt className="text-gray-500">Certificate issued by</dt><dd className="font-medium text-brand-dark">{info?.organization_name || '—'}</dd></div>
              <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><dt className="text-gray-500">Requested</dt><dd className="text-gray-700">{formatAccessDate(info?.requested_at)}</dd></div>
              <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><dt className="flex items-center gap-1.5 text-gray-500"><Clock size={13} /> Respond by</dt><dd className="font-medium text-orange-700">{formatAccessDate(info?.approval_deadline)}</dd></div>
            </dl>

            {hasReportList ? (
              <div className="mt-5">
                <p className="text-xs font-medium text-gray-700">Reports requested ({reports.length})</p>
                <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100">
                  {reports.map((r) => {
                    const meta = REPORT_DECISION_META[r.status] || REPORT_DECISION_META.requested;
                    const open = r.status === 'requested';
                    return (
                      <li key={r.report_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium text-brand-dark"><FileText size={14} className="shrink-0 text-gray-500" />{r.label}</p>
                          <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.tone}`}>{meta.label}</span>
                        </div>
                        {open && (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => decideReport(r.report_id, 'reject')} disabled={!!submitting} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                              {submitting === `report:${r.report_id}:reject` ? <RefreshCw size={13} className="animate-spin motion-reduce:animate-none" /> : <XCircle size={13} />} Decline
                            </button>
                            <button type="button" onClick={() => decideReport(r.report_id, 'approve')} disabled={!!submitting} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                              {submitting === `report:${r.report_id}:approve` ? <RefreshCw size={13} className="animate-spin motion-reduce:animate-none" /> : <CheckCircle2 size={13} />} Approve
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-gray-600">The visitor is asking to view the verification reports for your certificate.</p>
            )}
            <p className="mt-4 text-sm leading-6 text-gray-600">To confirm it’s you, enter the details on your certificate record. Nobody sees a report unless you approve it.</p>

            <label htmlFor="holder-dob" className="mt-5 block text-xs font-medium text-gray-700">Date of birth</label>
            <input id="holder-dob" type="date" required max={new Date().toISOString().slice(0, 10)} value={dob} onChange={(e) => setDob(e.target.value)} autoComplete="bday" className={FIELD} />

            {info?.requires_phone_number && (
              <>
                <label htmlFor="holder-phone" className="mt-4 block text-xs font-medium text-gray-700">Phone number</label>
                <input id="holder-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(normalisePhoneInput(e.target.value))} placeholder="+91 98765 43210" className={FIELD} />
                <p className="mt-1 text-xs text-gray-500">The number on your record, in any format.</p>
              </>
            )}

            {formError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{formError.message}</p>}

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SecondaryButton onClick={() => decideAll('reject')} disabled={!!submitting}>
                {submitting === 'all-reject' ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" /> : <XCircle size={16} />} {hasReportList && waiting.length > 1 ? 'Decline all' : 'Decline'}
              </SecondaryButton>
              <PrimaryButton type="submit" loading={submitting === 'all-approve'} disabled={!!submitting}>
                {submitting === 'all-approve' ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" /> : <CheckCircle2 size={16} />} {hasReportList && waiting.length > 1 ? 'Approve all' : 'Approve access'}
              </PrimaryButton>
            </div>
            <p className="mt-4 text-xs leading-5 text-gray-500">Didn’t expect this? Choose Decline. “All” applies only to the reports in this request that are still waiting.</p>
          </form>
        )}
      </AccessCard>
    </PublicAccessShell>
  );
};

export default CertificateAccessApprove;
