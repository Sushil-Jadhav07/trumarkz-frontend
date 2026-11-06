import { AlertTriangle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { shareResultMessage } from '@/utils/partialSdc';

const TONE = {
  success: { box: 'border-green-100 bg-green-50 text-green-800', Icon: CheckCircle2 },
  warning: { box: 'border-amber-100 bg-amber-50 text-amber-800', Icon: AlertTriangle },
  info: { box: 'border-blue-100 bg-blue-50 text-blue-800', Icon: Info },
};

// What "Send to Organization" did, from the share response (email_status): the website share always
// succeeded when this is shown; the email part may not have. A failed email can be retried.
export const ShareResultNote = ({ result, onRetry, retrying = false, className = '' }) => {
  if (!result) return null;
  const msg = shareResultMessage(result);
  const { box, Icon } = TONE[msg.tone] || TONE.info;
  return (
    <div role="status" className={`flex flex-wrap items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs font-inter ${box} ${className}`}>
      <p className="flex min-w-0 flex-1 items-start gap-2"><Icon size={14} className="mt-0.5 shrink-0" /><span>{msg.text}</span></p>
      {msg.retry && onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className="inline-flex shrink-0 items-center gap-1.5 font-semibold underline disabled:opacity-60">
          <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} /> {retrying ? 'Retrying…' : 'Retry email'}
        </button>
      )}
    </div>
  );
};

export default ShareResultNote;
