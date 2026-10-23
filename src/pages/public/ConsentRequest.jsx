import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Clock, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { verificationAPI } from '@/services/api';
import { consentDisplay, formatConsentDeadline } from '@/utils/consent';

const states = {
  pending: { title: 'Permission Request', text: 'Review this request and choose whether this organization may use your information for verification.', icon: ShieldCheck, tone: 'bg-blue-50 text-brand-blue' },
  accepted: { title: 'Permission Granted', text: 'You have allowed this organization to continue verification. Any automatic checks run in the background; reports may take a few minutes to appear in the organization’s account.', icon: CheckCircle, tone: 'bg-green-50 text-green-700' },
  rejected: { title: 'Permission Declined', text: 'You have declined this verification request.', icon: XCircle, tone: 'bg-red-50 text-red-700' },
  expired: { title: 'Permission Request Expired', text: 'This request can no longer be responded to. Contact the requesting organization if you need assistance.', icon: Clock, tone: 'bg-gray-100 text-gray-600' },
  unavailable: { title: 'Request Unavailable', text: 'The current permission status could not be confirmed. Contact the requesting organization.', icon: XCircle, tone: 'bg-amber-50 text-amber-700' },
};

export const ConsentRequest = () => {
  const { token } = useParams();
  const [snapshot, setSnapshot] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [decisionError, setDecisionError] = useState('');
  const activeToken = useRef(token);
  activeToken.current = token;
  const requestId = useRef(0);
  const decisionLock = useRef(false);
  const decisionId = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++requestId.current;
    setSnapshot((previous) => ({ token, phase: 'loading', info: previous?.token === token ? previous.info : null }));
    try {
      const { data } = await verificationAPI.getConsentInfo(token);
      if (!data || !['pending', 'accepted', 'rejected'].includes(data.consent_status) || typeof data.expired !== 'boolean') throw new Error('Consent status unavailable');
      if (activeToken.current === token && requestId.current === sequence) setSnapshot({ token, phase: 'ready', info: data });
    } catch (error) {
      if (activeToken.current === token && requestId.current === sequence) setSnapshot({ token, phase: error.response?.status === 404 ? 'invalid' : 'error', info: null });
    }
  }, [token]);

  useEffect(() => {
    decisionId.current += 1;
    decisionLock.current = false;
    setSubmitting(null);
    setDecisionError('');
    load();
    const onFocus = () => { if (!decisionLock.current) load(); };
    window.addEventListener('focus', onFocus);
    return () => { requestId.current += 1; window.removeEventListener('focus', onFocus); };
  }, [load]);

  const current = snapshot?.token === token ? snapshot : null;
  const info = current?.info;
  const display = consentDisplay(info);
  // Refresh from the server at its persisted deadline; never invent a new
  // 24-hour period or write an expiry decision from the browser.
  useEffect(() => {
    if (display !== 'pending' || !info?.consent_deadline) return;
    const remaining = new Date(info.consent_deadline).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    const timer = setTimeout(() => { if (!decisionLock.current) load(); }, Math.min(remaining + 250, 2147483647));
    return () => clearTimeout(timer);
  }, [display, info?.consent_deadline, load]);

  const decide = async (decision) => {
    if (decisionLock.current || current?.phase !== 'ready' || display !== 'pending') return;
    decisionLock.current = true;
    const attempt = ++decisionId.current;
    setSubmitting(decision);
    setDecisionError('');
    try {
      const { data } = await verificationAPI.submitConsentDecision(token, decision);
      if (activeToken.current !== token || decisionId.current !== attempt) return;
      if (!['accepted', 'rejected'].includes(data?.consent_status)) throw new Error('Decision status unavailable');
      requestId.current += 1;
      setSnapshot({ token, phase: 'ready', info: { ...info, consent_status: data.consent_status, consent_responded_at: data.consent_responded_at } });
    } catch (error) {
      if (activeToken.current !== token || decisionId.current !== attempt) return;
      if (error.response?.status === 404) setSnapshot({ token, phase: 'invalid', info: null });
      else {
        if (error.response?.status !== 409) setDecisionError('Your decision could not be confirmed. The latest request status is shown below.');
        await load(); // 409 and uncertain network outcomes always read real state.
      }
    } finally {
      if (decisionId.current === attempt) {
        decisionLock.current = false;
        if (activeToken.current === token) setSubmitting(null);
      }
    }
  };

  const phase = current?.phase || 'loading';
  const meta = states[display];
  const Icon = meta.icon;
  return <div className="min-h-dvh bg-brand-bg font-inter text-brand-dark">
    <header className="border-b border-gray-100 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-5"><Logo size="md" /><span className="flex items-center gap-1.5 text-xs font-medium text-gray-500"><ShieldCheck size={15} className="shrink-0" /><span className="hidden sm:inline">Secure permission request</span><span className="sm:hidden">Secure request</span></span></div></header>
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-14">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8" aria-live="polite" aria-busy={phase === 'loading' || Boolean(submitting)}>
        {phase === 'loading' ? <LoadingSkeleton variant="consent" label="Loading permission request" />
          : phase === 'invalid' ? <><XCircle size={28} className="mb-4 text-gray-400" /><h1 className="font-sora text-xl font-semibold">Verification Request Not Found</h1><p className="mt-3 text-sm leading-6 text-gray-500">This consent link is invalid or no longer available.</p></>
          : phase === 'error' ? <><h1 className="font-sora text-xl font-semibold">Unable to load request</h1><p role="alert" className="mt-3 text-sm leading-6 text-gray-500">We could not load your permission request. Please check your connection and try again.</p><button type="button" onClick={load} className="mt-5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">Try again</button></>
          : <>
            <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${meta.tone}`}><Icon size={25} strokeWidth={1.7} /></div>
            <h1 className="font-sora text-2xl font-semibold tracking-tight">{meta.title}</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">{meta.text}</p>
            {decisionError && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">{decisionError}</p>}
            <dl className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-100 px-4 text-sm">{[['Name', info.full_name], ['Requesting organization', info.organization_name], ['Batch', info.batch_name], ['Status', display === 'pending' ? 'Pending' : display === 'accepted' ? 'Accepted' : display === 'rejected' ? 'Rejected' : display === 'expired' ? 'Expired' : 'Unavailable'], ['Consent deadline', formatConsentDeadline(info.consent_deadline)]].map(([label, value]) => <div key={label} className="py-3"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 break-words font-medium text-gray-800">{value || 'Not available'}</dd></div>)}</dl>
            {display === 'pending' && <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"><button type="button" disabled={Boolean(submitting)} onClick={() => decide('rejected')} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-50">{submitting === 'rejected' ? 'Submitting…' : 'Reject'}</button><button type="button" disabled={Boolean(submitting)} onClick={() => decide('accepted')} className="rounded-xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-50">{submitting === 'accepted' ? 'Submitting…' : 'Allow Verification'}</button></div>}
          </>}
      </section>
      <footer className="mt-6 flex justify-center gap-5 text-xs text-gray-500"><Link to="/privacy-policy" className="hover:text-brand-blue focus-visible:underline">Privacy Policy</Link><Link to="/terms-of-service" className="hover:text-brand-blue focus-visible:underline">Terms of Service</Link></footer>
    </main>
  </div>;
};
export default ConsentRequest;
