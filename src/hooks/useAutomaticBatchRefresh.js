import { useEffect, useRef, useState } from 'react';
import { verificationAPI } from '@/services/api';
import { automaticChecks, missingAutomaticReports, startAutomaticPolling } from '@/utils/automaticVerification';

// Authenticated batch views observe consent-triggered work; the public consent
// page deliberately cannot read private reports with a consent token.
export const useAutomaticBatchRefresh = ({ batchId, batchType, records, onUpdate }) => {
  const callback = useRef(onUpdate); callback.current = onUpdate;
  const [focus, setFocus] = useState(0);
  const needed = batchType === 'human' && (records || []).some((row) => automaticChecks(row).length && missingAutomaticReports(row).length);
  useEffect(() => {
    if (!batchId || !needed) return;
    const refresh = () => setFocus((value) => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [batchId, needed]);
  useEffect(() => {
    if (!batchId || !needed) return;
    return startAutomaticPolling({
      isVisible: () => document.visibilityState !== 'hidden',
      read: async () => {
        const { data } = await verificationAPI.getBatchDetails(batchId);
        if (String(data?.batch_id) !== String(batchId) || !Array.isArray(data.users)) throw new Error('Batch status unavailable');
        return { data, watch: data.batch_type === 'human' && data.users.some((row) => automaticChecks(row).length && missingAutomaticReports(row).length) };
      },
      onValue: ({ data }) => callback.current(data),
      onError: () => {}, // Existing explicit refresh remains available; no POST retry.
      onTimeout: () => {},
    });
  }, [batchId, needed, focus]);
};
