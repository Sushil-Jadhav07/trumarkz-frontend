export const automaticRecordId = (record) => String(record?.id || record?.user_id || record?.entity_id || '');
export const automaticChecks = (record) => Object.entries(record?.verification_type_status || {})
  .filter(([, check]) => check?.label === 'automatic');
const finalStatuses = new Set(['approved', 'verified', 'completed', 'verification_completed', 'rejected']);
const isFinal = (check) => finalStatuses.has(String(check?.status || '').trim().toLowerCase());
export const missingAutomaticReports = (record) => automaticChecks(record)
  .filter(([, check]) => !check.report_url && !isFinal(check));
export const canRetryAutomatic = (record, batch) => batch?.batch_type === 'human' &&
  missingAutomaticReports(record).length > 0 &&
  // This endpoint retries a person, not one named check. Do not resubmit a
  // person whose other automatic check already has a final decision/report.
  automaticChecks(record).every(([, check]) => !isFinal(check) && !check.report_url);

export const automaticRetryDisabledReason = (record, batch) => {
  if (!batch) return 'Confirming the latest verification status.';
  if (automaticChecks(record).some(([, check]) => isFinal(check))) return 'Automatic verification already has a final decision. Retry is disabled.';
  if (automaticChecks(record).some(([, check]) => check.report_url)) return 'An automatic report has already been generated. Retry is disabled.';
  return '';
};

// A scheduled retry is not a completed report. Do not infer worker-lock fields.
export const retryOutcome = (data, id) => {
  if (String(data?.batch_user_id) !== String(id) || typeof data?.scheduled !== 'boolean' ||
      (data.already_in_progress != null && typeof data.already_in_progress !== 'boolean')) {
    throw new Error('The retry response could not be confirmed. Refresh the record before trying again.');
  }
  if (data.already_in_progress === true) return 'Automatic verification is already in progress. Waiting for the report.';
  if (data.scheduled === true) return 'Automatic verification scheduled. Waiting for the report.';
  return data.message || 'No retry was scheduled. Refresh the record to check its current status.';
};

// Sequential, bounded reads only; never retry a verification POST automatically.
export const startAutomaticPolling = ({ read, onValue, onError, onTimeout, isVisible = () => true,
  setTimer = setTimeout, clearTimer = clearTimeout, interval = 5000, maxReads = 24 }) => {
  let stopped = false, timer, reads = 0;
  const tick = async () => {
    if (stopped) return;
    if (!isVisible()) { timer = setTimer(tick, interval); return; }
    try {
      const value = await read();
      if (stopped) return;
      reads += 1;
      onValue(value);
      if (!value.watch) return;
      if (reads >= maxReads) { onTimeout(); return; }
      timer = setTimer(tick, interval);
    } catch (error) { if (!stopped) onError(error); }
  };
  tick();
  return () => { stopped = true; clearTimer(timer); };
};
