import { useEffect, useRef } from 'react';
import { verificationAPI } from '@/services/api';
import { batchIsSettled } from '@/utils/partialSdc';

// The backend never pushes verification results to the browser, so a batch that is still moving is
// re-read every 30-60 s (handoff E). Stops once the batch is verification_completed / sdc_generated,
// and skips ticks while the tab is hidden (it refreshes as soon as the tab is visible again).
export const useBatchPolling = ({ batchId, status, onUpdate, intervalMs = 45000, enabled = true }) => {
  const callback = useRef(onUpdate);
  callback.current = onUpdate;
  const settled = batchIsSettled(status);

  useEffect(() => {
    if (!batchId || !enabled || settled) return undefined;
    let stopped = false;
    let busy = false;
    const read = async () => {
      if (stopped || busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const { data } = await verificationAPI.getBatchDetails(batchId);
        if (!stopped && String(data?.batch_id) === String(batchId)) callback.current?.(data);
      } catch {
        // A missed refresh is harmless; the next tick tries again.
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(read, intervalMs);
    const onVisible = () => { if (document.visibilityState === 'visible') read(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [batchId, settled, enabled, intervalMs]);
};

export default useBatchPolling;
