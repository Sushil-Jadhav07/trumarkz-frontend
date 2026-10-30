import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, LinkIcon, RefreshCw, UserCheck, XCircle } from 'lucide-react';
import {
  PublicAccessShell, AccessCard, AccessState, PrimaryButton, SecondaryButton,
} from '@/components/shared/PublicAccessShell';
import { certificateAccessAPI, getApiError } from '@/services/api';
import { retryAfterText } from '@/utils/reportAccess';
import { formatAccessDate, normalisePhoneInput } from '@/utils/certificateAccess';

// Certificate holder approves or rejects a visitor — web change report §4e.
// The backend's approval email links to exactly /certificate-access/approve/{token}.
// The holder proves who they are with the DOB (and phone, when one is on record)
// held on their batch record; the link itself is single-use.

const describeError = (err, fallback) => {
  const status = err?.response?.status;
  if (status === 429) return { status, message: `Too many attempts. ${retryAfterText(err?.response?.headers?.['retry-after'])}` };
  if (status === 503) return { status, message: 'This service is temporarily unavailable. Please try again in a few minutes.' };
  return { status, message: getApiError(err, fallback) };
};

export const CertificateAccessApprove = () => {
  const { token } = useParams();
  const [load, setLoad] = useState({ loading: true, info: null, error: null });
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(null); // 'approve' | 'reject' | null
  const [formError, setFormError] = useState(null);
  const [result, setResult] = useState(null); // 'approved' | 'rejected' | 'gone'
  const busyRef = useRef(false);

  const fetchInfo = async () => {
    setLoad({ loading: true, info: null, error: null });
    try {
      const { data } = await certificateAccessAPI.getApproval(token);
      setLoad({ loading: false, info: data, error: null });
    } catch (err) {
      setLoad({ loading: false, info: null, error: describeError(err, 'This request could not be loaded.') });
    }
  };

  useEffect(() => { fetchInfo(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (decision) => {
    if (busyRef.current) return; // the link is single-use: never send two decisions
    const info = load.info;
    if (!dob) { setFormError({ message: 'Enter your date of birth.' }); return; }
    if (info?.requires_phone_number && phone.replace(/\D/g, '').length < 10) {
      setFormError({ message: 'Enter the phone number on your record.' });
      return;
    }
    busyRef.current = true;
    setSubmitting(decision);
    setFormError(null);
    try {
      const body = { decision, dob };
      if (info?.requires_phone_number) body.phone_number = phone.trim();
      const { data } = await certificateAccessAPI.decideApproval(token, body);
      setResult(data?.status || (decision === 'approve' ? 'approved' : 'rejected'));
    } catch (err) {
      const described = describeError(err, 'We couldn’t record your decision.');
      if (described.status === 404) setResult('gone');
      else setFormError(described);
    } finally {
      busyRef.current = false;
      setSubmitting(null);
    }
  };

  const { loading, info, error } = load;

  return (
    <PublicAccessShell badge="Certificate holder approval">
      <AccessCard>
        {loading ? (
          <div role="status" className="flex flex-col items-center py-10 text-sm text-gray-500">
            <RefreshCw size={20} className="mb-3 animate-spin text-brand-blue motion-reduce:animate-none" /> Loading request…
          </div>
        ) : result === 'approved' ? (
          <AccessState icon={CheckCircle2} tone="bg-green-50 text-green-600" title="Access approved">
            {info?.visitor_email} can now view your verification reports for 72 hours. This link has now been used.
          </AccessState>
        ) : result === 'rejected' ? (
          <AccessState icon={XCircle} tone="bg-gray-100 text-gray-600" title="Request declined">
            {info?.visitor_email} won’t be able to view your verification reports. This link has now been used.
          </AccessState>
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
          <form onSubmit={(e) => { e.preventDefault(); decide('approve'); }} noValidate>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-brand-blue"><UserCheck size={20} strokeWidth={1.75} /></span>
            <h1 className="mt-4 font-sora text-xl font-bold">Someone wants to view your verification reports</h1>
            <dl className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100 text-sm">
              <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><dt className="text-gray-500">Requested by</dt><dd className="break-all font-medium text-brand-dark">{info?.visitor_email || '—'}</dd></div>
              <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><dt className="text-gray-500">Certificate issued by</dt><dd className="font-medium text-brand-dark">{info?.organization_name || '—'}</dd></div>
              <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><dt className="text-gray-500">Requested</dt><dd className="text-gray-700">{formatAccessDate(info?.requested_at)}</dd></div>
              <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><dt className="flex items-center gap-1.5 text-gray-500"><Clock size={13} /> Respond by</dt><dd className="font-medium text-orange-700">{formatAccessDate(info?.approval_deadline)}</dd></div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-gray-600">To confirm it’s you, enter the details on your certificate record. If you approve, they can view your reports for 72 hours.</p>

            <label htmlFor="holder-dob" className="mt-5 block text-xs font-medium text-gray-700">Date of birth</label>
            <input id="holder-dob" type="date" required max={new Date().toISOString().slice(0, 10)} value={dob} onChange={(e) => setDob(e.target.value)} autoComplete="bday" className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />

            {info?.requires_phone_number && (
              <>
                <label htmlFor="holder-phone" className="mt-4 block text-xs font-medium text-gray-700">Phone number</label>
                <input id="holder-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(normalisePhoneInput(e.target.value))} placeholder="+91 98765 43210" className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
                <p className="mt-1 text-xs text-gray-500">The number on your record, in any format.</p>
              </>
            )}

            {formError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{formError.message}</p>}

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SecondaryButton onClick={() => decide('reject')} disabled={!!submitting}>
                {submitting === 'reject' ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" /> : <XCircle size={16} />} Decline
              </SecondaryButton>
              <PrimaryButton type="submit" loading={!!submitting}>
                {submitting === 'approve' ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" /> : <CheckCircle2 size={16} />} Approve access
              </PrimaryButton>
            </div>
            <p className="mt-4 text-xs leading-5 text-gray-500">Didn’t expect this? Choose Decline. Nobody sees your reports unless you approve.</p>
          </form>
        )}
      </AccessCard>
    </PublicAccessShell>
  );
};

export default CertificateAccessApprove;
