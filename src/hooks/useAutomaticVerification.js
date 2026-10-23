import { useEffect, useRef, useState } from 'react';
import { verificationAPI, getApiError } from '@/services/api';
import { automaticRecordId, automaticChecks, missingAutomaticReports, canRetryAutomatic, retryOutcome, startAutomaticPolling } from '@/utils/automaticVerification';

export const useAutomaticVerification = ({ record, batchId, batchType, onUpdate }) => {
  const id = automaticRecordId(record);
  const targetBatch = batchId || record?.batch_id;
  const key = `${targetBatch || ''}:${id}`;
  const active = useRef(key); active.current = key;
  const callback = useRef(onUpdate); callback.current = onUpdate;
  const submitting = useRef(false);
  const waitingRef = useRef(false);
  const retryGeneration = useRef(0);
  const [snapshot, setSnapshot] = useState(null);
  const [reload, setReload] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    retryGeneration.current += 1;
    setSnapshot(null); setMessage(''); setBusy(false); submitting.current = false; waitingRef.current = false; setWaiting(false);
    return () => { retryGeneration.current += 1; };
  }, [key]);
  useEffect(() => {
    if (!id || !targetBatch || (batchType && batchType !== 'human')) return;
    const refresh = () => { if (document.visibilityState !== 'hidden' && !submitting.current) setReload((value) => value + 1); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [key, batchType]);
  useEffect(() => {
    if (!id || !targetBatch || (batchType && batchType !== 'human')) return;
    setChecking(true);
    return startAutomaticPolling({
      isVisible: () => document.visibilityState !== 'hidden',
      read: async () => {
        const [{ data: user }, { data: batch }] = await Promise.all([
          verificationAPI.getUserVerification(id), verificationAPI.getBatchDetails(targetBatch),
        ]);
        const row = batch?.users?.find((item) => automaticRecordId(item) === id);
        if (automaticRecordId(user) !== id || String(user.batch_id) !== String(targetBatch) || !row || String(batch.batch_id) !== String(targetBatch)) throw new Error('Could not confirm the current verification record.');
        const next = { ...row, ...user, batch_type: batch.batch_type, verification_type_status: row.verification_type_status };
        const checks = automaticChecks(next);
        return { record: next, batch, watch: batch.batch_type === 'human' && checks.length > 0 &&
          missingAutomaticReports(next).length > 0 && !['rejected'].includes(next.consent_status) };
      },
      onValue: (value) => {
        setSnapshot({ key, ...value }); setChecking(value.watch);
        callback.current?.(value.record);
        if (!value.watch) { setMessage(''); waitingRef.current = false; setWaiting(false); }
      },
      onError: (error) => { setChecking(false); waitingRef.current = false; setWaiting(false); setMessage(getApiError(error, error.message || 'Could not refresh automatic verification.')); },
      onTimeout: () => { setChecking(false); waitingRef.current = false; setWaiting(false); setMessage('The report is not ready yet. Refresh status to check again; no extra retry was sent.'); },
    });
  }, [key, reload, batchType]);
  const current = snapshot?.key === key ? snapshot : null;
  const retry = async () => {
    if (submitting.current || waitingRef.current || !current || !canRetryAutomatic(current.record, current.batch)) return;
    submitting.current = true; setBusy(true); setMessage('');
    const attempt = ++retryGeneration.current;
    try {
      const { data } = await verificationAPI.retryAutomaticVerification(id);
      if (active.current !== key || retryGeneration.current !== attempt) return;
      setMessage(retryOutcome(data, id));
      if (data.scheduled || data.already_in_progress) { waitingRef.current = true; setWaiting(true); setReload((value) => value + 1); }
    } catch (error) {
      if (active.current === key && retryGeneration.current === attempt) setMessage(getApiError(error, error.message || 'Could not retry automatic verification.'));
    } finally { if (active.current === key && retryGeneration.current === attempt) { submitting.current = false; setBusy(false); } }
  };
  return { record: current?.record || record, batch: current?.batch, checking, busy, waiting, message,
    canRetry: Boolean(current && canRetryAutomatic(current.record, current.batch)), retry,
    refresh: () => setReload((value) => value + 1) };
};
