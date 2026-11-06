import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { sdcAPI, getApiError } from '@/services/api';
import { holderKey, holderName } from '@/utils/partialSdc';

const shortId = (id) => (String(id).length > 14 ? `${String(id).slice(0, 8)}…${String(id).slice(-4)}` : String(id));

// SDC status notes (stalled generation, missing images) and the per-holder credential history
// (verification_progress.sdc.pid_history_by_user_id, oldest first; the last id is the latest).
// A holder who received an additional SDC shows the newest credential once Dhiway has issued it;
// older credentials stay live on Dhiway and are listed here.
export const SdcHistoryCard = ({ progress, records = [], status }) => {
  const [openingId, setOpeningId] = useState(null);
  const sdc = progress?.sdc || {};
  const history = sdc.pid_history_by_user_id || {};
  const latestIds = sdc.pid_by_user_id || {};
  const byId = useMemo(() => Object.fromEntries(records.map((r) => [holderKey(r), r])), [records]);
  const rows = Object.entries(history).filter(([, ids]) => Array.isArray(ids) && ids.length > 0);
  const missingImages = Array.isArray(status?.image_missing_serials) ? status.image_missing_serials : [];
  const stalled = !!status?.stalled;

  const view = async (publicId) => {
    setOpeningId(publicId);
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    try {
      const { data } = await sdcAPI.getRecord(publicId);
      const url = data?.pdf || data?.verify;
      if (url && tab) tab.location.href = url;
      else { tab?.close(); toast('This credential is still finalizing. Try again in a moment.', { icon: '⏳' }); }
    } catch (err) {
      tab?.close();
      toast.error(getApiError(err, 'Could not open the credential'));
    } finally {
      setOpeningId(null);
    }
  };

  if (!stalled && missingImages.length === 0 && rows.length === 0) return null;

  return (
    <section aria-label="SDC history" className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center gap-3.5 px-5 pt-4">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><History size={19} strokeWidth={1.6} /></span>
        <div>
          <h2 className="font-sora text-base font-semibold text-brand-dark">SDC status and history</h2>
          <p className="mt-0.5 text-[13px] text-gray-500 font-inter">Each holder shows their newest credential. Earlier credentials stay valid on Dhiway.</p>
        </div>
      </div>
      <div className="space-y-3 px-5 pb-5 pt-3">
        {stalled && (
          <div role="alert" className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 font-inter">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>SDC generation looks stalled{status?.stalled_reason ? `: ${status.stalled_reason}` : '.'} Ask your SuperAdmin to check it.</span>
          </div>
        )}
        {missingImages.length > 0 && (
          <div role="alert" className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 font-inter">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Images are missing for {missingImages.length} product{missingImages.length === 1 ? '' : 's'}: {missingImages.join(', ')}.</span>
          </div>
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
            {rows.map(([userId, ids]) => {
              const latest = latestIds[userId] || ids[ids.length - 1];
              const earlier = ids.filter((id) => id !== latest);
              return (
                <li key={userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-dark font-inter">{byId[userId] ? holderName(byId[userId]) : shortId(userId)}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-gray-500">Latest {shortId(latest)}{earlier.length ? ` · ${earlier.length} earlier credential${earlier.length === 1 ? '' : 's'}` : ''}</p>
                    {earlier.length > 0 && (
                      <p className="mt-0.5 font-mono text-[11px] text-gray-400">{earlier.map(shortId).join(' · ')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => view(latest)}
                    disabled={openingId === latest}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#c7d8f5] bg-[#f3f7fe] px-3 text-xs font-medium text-brand-blue hover:bg-blue-50 disabled:opacity-60 font-inter"
                  >
                    <Eye size={14} /> View latest
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SdcHistoryCard;
