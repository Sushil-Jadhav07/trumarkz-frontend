// Email links use /consent/:token; retain the original public page URL too.
export const isConsentPage = (pathname = '') =>
  /^\/(?:verification\/)?consent\/[^/]+\/?$/.test(pathname);

export const consentRequiredForBatch = (batch) => {
  if (String(batch?.batch_type || batch?.entity_type || '').toLowerCase() !== 'human') return false;
  if (['public', 'open_search'].includes(batch?.credential_visibility)) return false;
  return ['private', 'permission_required'].includes(batch?.credential_visibility) || batch?.permission_mode === 'permission_required';
};

export const consentAllowsProcessing = (record, batch = null) => {
  const type = String(batch?.batch_type || batch?.entity_type || record?.entity_type || record?.batch_type || '').toLowerCase();
  if (type === 'product' || type === 'warranty') return true;
  if (batch && ['public', 'open_search'].includes(batch.credential_visibility)) return true;
  const required = consentRequiredForBatch(batch) || record?.consent_required === true ||
    (record?.consent_required !== false && record?.consent_status != null);
  // A response deadline never revokes an already accepted decision.
  return !required || record?.consent_status === 'accepted';
};

export const consentDisplay = (info) => {
  if (info?.consent_status === 'accepted') return 'accepted';
  if (info?.expired === true) return 'expired';
  if (info?.consent_status === 'rejected') return 'rejected';
  if (info?.consent_status === 'pending' && info.expired === false) return 'pending';
  return 'unavailable';
};

export const humanConsentMeta = (record) => {
  if (!record?.consent_status) return null;
  const types = [record.batch_type, record.entity_type].filter(Boolean).map((value) => String(value).toLowerCase());
  if (types.some((type) => type === 'product' || type === 'warranty')) return null;
  if (!types.includes('human') && (!record.full_name || record.product_name || record.category_name)) return null;
  if (record.consent_status === 'pending') return { label: 'Pending Consent', tone: 'bg-amber-50 text-amber-700' };
  if (record.consent_status === 'accepted') return { label: 'Consent Accepted', tone: 'bg-green-50 text-green-700' };
  if (record.consent_status === 'rejected') return record.consent_auto_expired === true
    ? { label: 'Consent Expired', tone: 'bg-gray-100 text-gray-600' }
    : { label: 'Consent Rejected', tone: 'bg-red-50 text-red-700' };
  return null;
};

export const formatConsentDeadline = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime())
    ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not available';
};
