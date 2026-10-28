export const localDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const localDateBoundary = (value, end = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  if (end) date.setHours(23, 59, 59, 999);
  return date.getTime();
};
export const batchDateError = (from, to) => {
  const start = localDateBoundary(from), end = localDateBoundary(to, true);
  if ((from && start == null) || (to && end == null)) return 'Choose valid dates.';
  return start != null && end != null && start > end ? 'From date must be on or before To date.' : '';
};
export const batchDatePresets = (now = new Date()) => {
  const today = localDateValue(now);
  const ago = (days) => { const date = new Date(now); date.setDate(date.getDate() - days); return localDateValue(date); };
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Last 7 days', from: ago(6), to: today },
    { label: 'Last 30 days', from: ago(29), to: today },
    { label: 'This month', from: `${today.slice(0, 7)}-01`, to: today },
  ];
};
export const batchMatchesDate = (batch, from, to) => {
  if (!from && !to) return true;
  if (batchDateError(from, to)) return false;
  const time = batch.createdAt ? new Date(batch.createdAt).getTime() : NaN;
  if (!Number.isFinite(time)) return false;
  const start = localDateBoundary(from), end = localDateBoundary(to, true);
  return (start == null || time >= start) && (end == null || time <= end);
};

const typeKey = (value) => String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
export const batchHasVerification = (types, selected) => types.some((type) => {
  const values = typeof type === 'string' ? [type] : [type?.id, type?.name, type?.verification_type_name];
  return values.filter(Boolean).some((value) => [selected?.id, selected?.name].filter(Boolean).some((key) => typeKey(value) === typeKey(key)));
});

export const loadBatchVerificationMetadata = async ({ batches, cache, read, signal, concurrency = 3 }) => {
  const queue = batches.filter((batch) => !cache.has(batch.id));
  let next = 0;
  const failures = [];
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (!signal.aborted && next < queue.length) {
      const batch = queue[next++];
      try {
        const { data } = await read(batch.id, { signal });
        if (signal.aborted) return;
        if (String(data?.batch_id || data?.id) !== String(batch.id) || (data.verification_types != null && !Array.isArray(data.verification_types))) throw new Error('Invalid batch metadata');
        cache.set(batch.id, data.verification_types || []);
      } catch (error) { if (!signal.aborted) failures.push(batch.id); }
    }
  }));
  if (failures.length) throw new Error(`Could not load verification types for ${failures.length} batch(es). Please retry.`);
};
