import { useEffect, useRef, useState } from 'react';
import { verificationAPI, getApiError } from '@/services/api';
import { batchHasVerification, loadBatchVerificationMetadata } from '@/utils/batchFilters';

export const useBatchVerificationFilter = (batches, selected, refreshKey) => {
  const cache = useRef(new Map());
  const callbackBatches = useRef(batches); callbackBatches.current = batches;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: '', loading: false, error: '' });
  const ids = JSON.stringify(batches.map((batch) => batch.id));
  const key = selected ? JSON.stringify([ids, selected.id || selected.name, refreshKey, attempt]) : '';
  useEffect(() => { cache.current.clear(); }, [refreshKey]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setState({ key, loading: true, error: '' });
    loadBatchVerificationMetadata({ batches: callbackBatches.current, cache: cache.current, signal: controller.signal,
      read: (id, config) => verificationAPI.getBatchDetails(id, config),
    }).then(() => { if (!controller.signal.aborted) setState({ key, loading: false, error: '' }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ key, loading: false, error: getApiError(error, error.message) }); });
    return () => controller.abort();
  }, [key]);
  const loading = Boolean(selected && (state.key !== key || state.loading));
  const error = selected && state.key === key ? state.error : '';
  return { loading, error, retry: () => setAttempt((value) => value + 1),
    batches: !selected ? batches : loading || error ? [] : batches.filter((batch) => batchHasVerification(cache.current.get(batch.id) || [], selected)),
  };
};
