import { consentAllowsProcessing, consentRequiredForBatch } from '../utils/consent.js';

export const consentRecordId = (record) => String(record?.id || record?.user_id || record?.entity_id || record?.batch_user_id || '');
const blocked = (message, code = 'CONSENT_REQUIRED') => {
  const error = new Error(message);
  error.code = code;
  error.response = { status: code === 'CONSENT_REQUIRED' ? 403 : 503, data: { detail: message } };
  return error;
};

// Batch details omit consent: merge a batch-filtered, paginated read from the
// existing /verification/all endpoint. Never fetch once per table row.
export const createConsentGuard = ({ getBatch, getUsers, getUser, getAssignments }) => {
  const validBatch = (batch, batchId) => batch &&
    String(batch.batch_id || batch.id) === String(batchId) &&
    ['human', 'product', 'warranty'].includes(String(batch.batch_type || '').toLowerCase());
  const loadBatch = async (batchId) => {
    const { data: batch } = await getBatch(batchId);
    if (!validBatch(batch, batchId) || !Array.isArray(batch.users)) throw blocked('Could not confirm batch permissions. No verification was started.', 'CONSENT_UNAVAILABLE');
    if (!consentRequiredForBatch(batch)) return { ...batch, users: batch.users.map((user) => ({ ...user, consent_required: false })) };
    const ids = new Set(batch.users.map(consentRecordId));
    if (ids.has('')) throw blocked('Could not confirm record identities. No verification was started.', 'CONSENT_UNAVAILABLE');
    const found = new Map();
    let offset = 0;
    while ([...ids].some((id) => !found.has(id))) {
      const { data } = await getUsers({ batchId, limit: 100, offset });
      if (!Array.isArray(data?.users)) throw blocked('Could not confirm consent statuses. No verification was started.', 'CONSENT_UNAVAILABLE');
      for (const user of data.users) {
        const id = consentRecordId(user);
        if (!id || String(user.batch_id) !== String(batchId) || found.has(id)) throw blocked('Could not confirm batch-scoped consent data. No verification was started.', 'CONSENT_UNAVAILABLE');
        found.set(id, user);
      }
      offset += data.users.length;
      if (data.users.length < 100) break;
    }
    if ([...ids].some((id) => !found.has(id))) throw blocked('Consent data is incomplete. Refresh before starting verification.', 'CONSENT_UNAVAILABLE');
    return { ...batch, users: batch.users.map((user) => {
      const consent = found.get(consentRecordId(user));
      return { ...user, consent_required: true, consent_status: consent.consent_status, consent_deadline: consent.consent_deadline, consent_auto_expired: consent.consent_auto_expired };
    }) };
  };

  const assertBatch = async (batchId, selectedIds) => {
    const batch = await loadBatch(batchId);
    const required = consentRequiredForBatch(batch);
    if (!required) return { batch, required, eligibleIds: batch.users.map(consentRecordId) };
    const eligibleIds = batch.users.filter((user) => consentAllowsProcessing(user, batch)).map(consentRecordId);
    const targets = selectedIds == null ? eligibleIds : selectedIds.map(String);
    if (!targets.length || targets.some((id) => !eligibleIds.includes(id))) throw blocked('Waiting for consent: each selected Human user must accept the permission request before verifier emails, verification or certificates can proceed.');
    return { batch, required, eligibleIds };
  };

  return {
    loadBatch, assertBatch,
    async assertUser(userId) {
      const { data: user } = await getUser(userId);
      if (!user?.batch_id || consentRecordId(user) !== String(userId)) throw blocked('Could not confirm user consent. No verification was started.', 'CONSENT_UNAVAILABLE');
      const { data: batch } = await getBatch(user.batch_id);
      if (!validBatch(batch, user.batch_id)) throw blocked('Could not confirm batch permissions. No verification was started.', 'CONSENT_UNAVAILABLE');
      if (!consentAllowsProcessing(user, batch)) throw blocked('Waiting for consent: this user must accept the permission request before verification or certificates can proceed.');
      return { user, batch };
    },
    async assertRequest(requestId, batchId) {
      if (!batchId) throw blocked('Could not confirm the request batch. No verifier email was sent.', 'CONSENT_UNAVAILABLE');
      const { batch, required } = await assertBatch(batchId);
      if (!required) return;
      const { data } = await getAssignments(batchId);
      const assignment = data?.assignments?.find((item) => String(item.request_id) === String(requestId));
      if (!assignment || !Array.isArray(assignment.users)) throw blocked('Could not confirm assigned users and consent. No verifier email was sent.', 'CONSENT_UNAVAILABLE');
      if (assignment.is_legacy_whole_batch) return; // Backend filters batch-wide sends to eligible users.
      const allowed = new Set(batch.users.filter((user) => consentAllowsProcessing(user, batch)).map(consentRecordId));
      if (!assignment.users.length || assignment.users.some((user) => !allowed.has(consentRecordId(user)))) throw blocked('Waiting for consent: all users assigned to this verifier must accept before the link can be resent.');
    },
  };
};
