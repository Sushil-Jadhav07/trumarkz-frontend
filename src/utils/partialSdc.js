// Partial SDC authorization, SDC generation errors, "Send to Organization" results, bulk delete and
// schema-mapping warnings — the pure rules behind those screens, kept apart from the UI so they can
// be tested. Contracts: TRUMARKZ_WEB_DEVELOPER_HANDOFF.md sections B-G and J.

// ── Holders and their verification types (batch detail `users[]`) ─────────────────────────────

export const holderKey = (record) => record?.id || record?.user_id || record?.entity_id || record?.batch_user_id || '';
export const holderName = (record) =>
  record?.full_name || record?.name || record?.product_name || record?.email || 'Record';

// [{ name, status, reportUrl }] from `verification_type_status` ({type_name: {status, report_url?}}).
export const typeStatuses = (record) =>
  Object.entries(record?.verification_type_status || {}).map(([name, value]) => ({
    name,
    status: String(value?.status ?? value ?? 'pending').toLowerCase(),
    reportUrl: value?.report_url || null,
  }));

export const isApprovedStatus = (status) => ['approved', 'verified'].includes(String(status || '').toLowerCase());

// A holder is fully verified when every required type is approved. Such holders get a full SDC from
// the SuperAdmin; the backend refuses an authorization for them.
export const holderAuthorizationState = (record) => {
  const types = typeStatuses(record);
  const approved = types.filter((t) => isApprovedStatus(t.status));
  const fullyVerified = types.length > 0 && approved.length === types.length;
  return {
    types,
    approvedTypes: approved.map((t) => t.name),
    fullyVerified,
    // Not fully verified, but at least one approved type to authorize.
    canAuthorize: !fullyVerified && approved.length > 0,
  };
};

// Holders offered in the authorization picker, each with its approved types.
export const authorizableHolders = (records = []) =>
  records
    .map((record) => ({ record, id: holderKey(record), ...holderAuthorizationState(record) }))
    .filter((h) => h.id && h.canAuthorize);

// selection: { [batchUserId]: Set | string[] of verification type names } -> request body, or null when empty.
export const buildAuthorizationBody = (selection = {}) => {
  const holders = Object.entries(selection)
    .map(([batch_user_id, types]) => ({ batch_user_id, verification_types: [...new Set(Array.from(types || []))] }))
    .filter((h) => h.verification_types.length > 0);
  return holders.length ? { holders } : null;
};

// 400 detail.holders[] -> { [batch_user_id]: [message] }, plus the headline message.
export const parseAuthorizationErrors = (err) => {
  const detail = err?.response?.data?.detail;
  const byHolder = {};
  if (detail && typeof detail === 'object' && Array.isArray(detail.holders)) {
    detail.holders.forEach((h) => {
      if (h?.batch_user_id) byHolder[h.batch_user_id] = (h.errors || []).map(String);
    });
  }
  const message = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail.message : (typeof detail === 'string' ? detail : '');
  return { message: message || '', byHolder };
};

// An authorization needs re-submitting when its holder's results changed after it was saved.
export const authorizationIsStale = (auth) =>
  Boolean(auth) && auth.status === 'active' && (auth.is_valid === false || (auth.stale_verification_types || []).length > 0);

export const AUTHORIZATION_STATUS = {
  active: { label: 'Active', tone: 'green' },
  generating: { label: 'Generating', tone: 'blue' },
  consumed: { label: 'Used', tone: 'gray' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
  superseded: { label: 'Replaced', tone: 'gray' },
};

export const ITEM_STATE_LABEL = {
  valid: 'Still approved',
  stale: 'Result changed',
  changed: 'Result changed',
  missing: 'No longer available',
};

// Poll rule for a batch that is still moving (handoff E): stop at completed / generated.
export const batchIsSettled = (status) => ['verification_completed', 'sdc_generated'].includes(String(status || ''));

// ── SDC generation errors (handoff F, J14) ────────────────────────────────────────────────────

// One normalised description of a /sdc/batches/{id}/generate failure.
export const describeGenerateError = (err) => {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;
  const obj = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail : null;
  const text = typeof detail === 'string' ? detail : obj?.message || '';

  if (status === 403 && obj && Array.isArray(obj.unauthorized_user_ids)) {
    return {
      kind: 'unauthorized',
      message: text || 'Some selected holders are not fully verified and have no partial SDC authorization.',
      unauthorizedIds: obj.unauthorized_user_ids,
      incompleteIds: obj.incomplete_user_ids || [],
      selectedIds: obj.selected_user_ids || [],
    };
  }
  if (status === 403) return { kind: 'forbidden', message: text || 'Only a SuperAdmin can generate SDCs.' };
  if (status === 409 && obj && Array.isArray(obj.stale_authorizations)) {
    return { kind: 'stale', message: text || 'Verification results changed since these holders were authorized.', stale: obj.stale_authorizations };
  }
  if (status === 409 && obj && Array.isArray(obj.partial_authorization_ids)) {
    return { kind: 'ids', message: text || 'These authorizations are not active for the selected holders.', ids: obj.partial_authorization_ids };
  }
  if (status === 409 && obj && Array.isArray(obj.batch_user_ids)) {
    return { kind: 'legacy', message: text || 'These holders already have an SDC in the legacy Human layout.', userIds: obj.batch_user_ids };
  }
  if (status === 409) return { kind: 'busy', message: text || 'Another generation is using this selection — retry shortly.' };
  if (status === 422) return { kind: 'validation', message: text || 'The Dhiway schema rejected this data. Nothing was sent.' };
  if (status === 502) return { kind: 'dhiway', message: text || 'Dhiway returned an error. The authorization was released; you can retry.' };
  return { kind: 'other', message: text || '' };
};

// ── Send to Organization (handoff D, J2) ──────────────────────────────────────────────────────

export const shareResultMessage = (data = {}) => {
  const email = data.organization_email || 'the organization';
  switch (data.email_status) {
    case 'sent':
      return { tone: 'success', text: `Shared and emailed to ${email} (${data.attached_certificate_count ?? 0} of ${data.emailed_certificate_count ?? 0} attached)` };
    case 'already_sent':
      return { tone: 'success', text: `Shared. These SDCs were already emailed${data.email_sent_at ? ` on ${new Date(data.email_sent_at).toLocaleString('en-IN')}` : ''}.` };
    case 'failed':
      return { tone: 'warning', text: `Shared on the website. Email failed${data.email_error ? `: ${data.email_error}` : '.'}`, retry: true };
    case 'no_email':
      return { tone: 'info', text: 'Shared on the website. The organization has no registered email.' };
    case 'no_certificates':
      return { tone: 'info', text: 'Shared. No issued SDCs to email yet.' };
    case 'in_progress':
      return { tone: 'info', text: 'An email for this batch is already being sent.' };
    default:
      return { tone: 'success', text: 'Batch shared with the organization.' };
  }
};

// ── Bulk delete (handoff B, J1) ───────────────────────────────────────────────────────────────

export const BULK_DELETE_LIMIT = 50;
export const BULK_DELETE_WORD = 'DELETE';
export const bulkDeleteReady = (typed, ids = []) =>
  typed === BULK_DELETE_WORD && ids.length > 0 && ids.length <= BULK_DELETE_LIMIT;

export const BULK_RESULT_LABEL = {
  deleted: 'Deleted',
  not_found: 'Not found',
  skipped_processing: 'Still processing — not deleted',
  failed: 'Failed',
};

// ── Schema configuration warnings (handoff C) ─────────────────────────────────────────────────

const WARNING_TITLES = {
  RECOMMENDED_INPUT_MISSING: 'Recommended column not mapped (nothing blocked)',
  OUTPUT_MAP_EMPTY_UNVERIFIED: 'No Dhiway schema stored and no output map',
  SCHEMA_PROPERTY_UNSOURCED: 'Dhiway fields with no value source',
  LAYOUT_FIELD_NOT_IN_SCHEMA: 'Built-in fields that will not be sent',
  SAMPLE_FIELD_UNMAPPED: 'Sample fields kept in TruMarkZ, not sent to Dhiway',
  AMBIGUOUS_SAMPLE_MATCH: 'Several possible matches — map manually',
  AMBIGUOUS_SCHEMA_MAPPING: 'Several possible matches — map manually',
  NESTED_FIELD_UNMAPPED: 'Nested sample fields without an intake column',
  SAMPLE_EMPTY: 'The sample record is empty',
  OUTPUT_KEY_UNSOURCED: 'An output map key has no input',
  IDENTITY_FIELD_NOT_IN_SCHEMA: 'Schema is missing product_id / serial_no — SDC generation will be refused',
};

// Server warning_details (and plain `warnings` from older responses) -> { warning: [], info: [] } rows
// for inline display. An unknown code is still shown, as a generic warning.
export const groupSchemaWarnings = (details, plain = []) => {
  const rows = [];
  (Array.isArray(details) ? details : []).forEach((d) => {
    if (!d || typeof d !== 'object') return;
    const severity = d.severity === 'info' ? 'info' : 'warning';
    rows.push({
      severity,
      code: d.code || '',
      title: WARNING_TITLES[d.code] || d.message || 'Notice',
      message: d.message && WARNING_TITLES[d.code] && d.message !== WARNING_TITLES[d.code] ? d.message : '',
      fields: Array.isArray(d.fields) ? d.fields : [],
    });
  });
  if (!rows.length) {
    (Array.isArray(plain) ? plain : []).filter(Boolean).forEach((text) => rows.push({ severity: 'info', code: '', title: String(text), message: '', fields: [] }));
  }
  return { warning: rows.filter((r) => r.severity === 'warning'), info: rows.filter((r) => r.severity === 'info') };
};

// ── Dhiway schema JSON box (handoff C) ────────────────────────────────────────────────────────

const SCHEMA_WRAPPER_KEYS = ['schema', 'schemaJson', 'schema_json', 'cordSchema', 'data'];

// -> { kind: 'empty' } | { kind: 'ok', schema } | { kind: 'invalid', error }.
// The backend reads the object, the same JSON as a string, or one wrapper around it; the box accepts
// those and only refuses text that is not JSON or has nothing like a schema in it.
export const parseDhiwaySchemaText = (text) => {
  const raw = String(text ?? '').trim();
  if (!raw) return { kind: 'empty' };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { kind: 'invalid', error: `Not valid JSON: ${err.message}` };
  }
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return { kind: 'invalid', error: 'The quoted text is not valid JSON.' }; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'invalid', error: 'Paste the Dhiway schema JSON object (it has "properties").' };
  }
  const inner = parsed.properties && typeof parsed.properties === 'object'
    ? parsed
    : SCHEMA_WRAPPER_KEYS.map((k) => parsed[k]).find((v) => v && typeof v === 'object' && v.properties && typeof v.properties === 'object');
  if (!inner) return { kind: 'invalid', error: 'This does not look like a Dhiway schema: it needs a "properties" object.' };
  return { kind: 'ok', schema: parsed };
};

// What to send as `dhiway_schema`: undefined = omit (keep what is stored), null = clear, object = replace.
export const dhiwaySchemaForPayload = (text, originalText = '') => {
  if ((text ?? '').trim() === (originalText ?? '').trim()) return { send: false };
  const parsed = parseDhiwaySchemaText(text);
  if (parsed.kind === 'empty') return { send: true, value: null };
  if (parsed.kind === 'ok') return { send: true, value: parsed.schema };
  return { send: false, error: parsed.error };
};

// Automatic / Manual badge for one output_map entry (config.output_map_sources).
export const outputMapSource = (config, key) => {
  const source = config?.output_map_sources?.[key];
  return String(source || '').toLowerCase() === 'manual' ? 'manual' : source ? 'automatic' : 'manual';
};

// ── Schema image (handoff C) ──────────────────────────────────────────────────────────────────

export const SCHEMA_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const SCHEMA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
// A quick pre-check so an obviously wrong file is not uploaded; the backend still checks the real content.
export const schemaImageProblem = (file) => {
  if (!file) return 'Choose an image.';
  if (!SCHEMA_IMAGE_TYPES.includes(file.type)) return 'Use a PNG, JPEG or WebP image.';
  if (file.size > SCHEMA_IMAGE_MAX_BYTES) return 'The image must be 5 MB or smaller.';
  return '';
};

// ── Permission Required Human single upload (handoff C, J4) ───────────────────────────────────

export const DOB_REQUIRED_MESSAGE = 'Date of birth is required for a Permission Required record.';
export const isPermissionRequired = (credentialVisibility) => String(credentialVisibility || '').toLowerCase() === 'private';
