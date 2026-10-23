import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { automaticChecks, automaticRetryDisabledReason } from '@/utils/automaticVerification';
import { consentAllowsProcessing } from '@/utils/consent';

export const AutomaticVerificationStatus = ({ state }) => {
  const { user } = useAuth();
  if ((state.batch && state.batch.batch_type !== 'human') || !automaticChecks(state.record).length) return null;
  const waitingForConsent = state.batch && !consentAllowsProcessing(state.record, state.batch);
  const disabledReason = automaticRetryDisabledReason(state.record, state.batch);
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 p-3 text-xs">
    {waitingForConsent ? <p role="status" className="text-amber-700">Consent must be accepted before automatic verification can run.</p>
      : state.checking && <p role="status" className="text-gray-500">Checking automatic verification. Reports may take a few minutes.</p>}
    {state.message && <p role="status" className="w-full text-gray-600">{state.message}</p>}
    {user?.role === 'super-admin' && state.batch?.batch_type === 'human' && <div className="space-y-1.5">
      <button type="button" disabled={!state.canRetry || state.busy || state.waiting} title={disabledReason || undefined} onClick={state.retry} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 font-semibold text-brand-blue disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={14} className={state.busy ? 'animate-spin' : ''} />{state.busy ? 'Scheduling…' : state.waiting ? 'Verification in progress…' : 'Retry Automatic Verification'}</button>
      {disabledReason && !waitingForConsent && <p className="text-gray-500">{disabledReason}</p>}
    </div>}
    {!state.checking && <button type="button" disabled={state.busy} onClick={state.refresh} className="font-medium text-brand-blue">Refresh status</button>}
  </div>;
};
