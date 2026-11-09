// Individual SDC certificate ownership (SuperAdmin screens).
//
// The only source of truth is `certificates_by_user` on GET /sdc/batches/{id}/status: it maps the exact
// batch_user_id to that user's confirmed credential (public id). A certificate is NEVER matched to a person
// by email, name or list position, and a batch-level sdc_created / "SDC Issued" status never makes anyone
// "Ready" on its own.

const idOf = (value) => (value == null ? '' : String(value).trim());

// A value in the map is the public id itself, or an object carrying it.
const publicIdOf = (value) => {
  if (typeof value === 'string') return idOf(value);
  if (value && typeof value === 'object') {
    return idOf(value.public_id ?? value.publicId ?? value.credential_id ?? value.credentialId ?? value.id);
  }
  return '';
};

// -> { known: boolean, byUser: { [batch_user_id]: publicId } }
// `known` is false when the backend did not send the field at all (an older deployment): then nothing can be
// attributed to anyone, which is different from "this user has no certificate".
export const normalizeCertificatesByUser = (statusData) => {
  const raw = statusData?.certificates_by_user;
  if (raw == null) return { known: false, byUser: {} };
  const byUser = {};
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      const userId = idOf(item?.batch_user_id ?? item?.user_id);
      const publicId = publicIdOf(item);
      if (userId && publicId && !(userId in byUser)) byUser[userId] = publicId;
    });
  } else if (typeof raw === 'object') {
    Object.entries(raw).forEach(([userId, value]) => {
      const publicId = publicIdOf(value);
      if (idOf(userId) && publicId) byUser[idOf(userId)] = publicId;
    });
  }
  return { known: true, byUser };
};

// The ids a batch user can be known by in the batch-details response (all exact identifiers).
export const recordUserIds = (record) =>
  [record?.batch_user_id, record?.user_id, record?.id, record?.entity_id].map(idOf).filter(Boolean);

// The public id owned by exactly this user, or ''.
export const certificatePublicIdFor = (byUser, record) => {
  for (const id of recordUserIds(record)) {
    if (Object.prototype.hasOwnProperty.call(byUser || {}, id)) return byUser[id];
  }
  return '';
};

// Builds the entry the screens render from: the confirmed public id plus whatever Dhiway metadata is known
// for exactly that public id (looked up by public id only).
export const buildCertificateEntry = (publicId, metaByPublicId = {}) => {
  const meta = metaByPublicId[publicId] || {};
  const revoked = !!meta.revoked;
  return {
    id: meta.id || null,
    publicId,
    title: meta.title || '',
    recipients: Array.isArray(meta.recipients) ? meta.recipients : [],
    anchorTime: meta.anchorTime || null,
    revoked,
    issued: !revoked, // confirmed by the backend mapping unless Dhiway says it was revoked
    active: meta.active == null ? true : !!meta.active,
    latest: !!meta.latest,
    edited: !!meta.edited,
    createdAt: meta.createdAt || null,
    updatedAt: meta.updatedAt || null,
  };
};

// { [batch_user_id]: entry } for every user present in the mapping.
export const certificateEntriesByUser = (byUser, metaByPublicId) =>
  Object.fromEntries(Object.entries(byUser || {}).map(([userId, publicId]) => [userId, buildCertificateEntry(publicId, metaByPublicId)]));

// Display state for one user. `known` comes from normalizeCertificatesByUser.
export const certificateDisplay = (entry, known = true) => {
  if (entry) {
    return entry.issued
      ? { status: 'ready', label: 'Ready', badge: 'info', canView: true, canDownload: true }
      : { status: 'revoked', label: 'Revoked', badge: 'error', canView: false, canDownload: false };
  }
  return known
    ? { status: 'not_issued', label: 'Not Issued', badge: 'default', canView: false, canDownload: false }
    : { status: 'unavailable', label: 'Unavailable', badge: 'default', canView: false, canDownload: false };
};

// Exact lookup in a { [batch_user_id]: entry } map.
export const certificateEntryFor = (entriesByUser, record) => {
  for (const id of recordUserIds(record)) {
    if (Object.prototype.hasOwnProperty.call(entriesByUser || {}, id)) return entriesByUser[id];
  }
  return null;
};
