// Human Secure Certificate Access (web change report §4) — shared vocabulary for
// the org / SuperAdmin access panel, the batch lists and the public pages.

export const ACCESS_MODES = { PUBLIC: 'public', HOLDER_APPROVAL: 'holder_approval' };

export const isProtectedMode = (mode) => mode === ACCESS_MODES.HOLDER_APPROVAL;

// Product and Warranty batches are always public; only Human batches have a mode to manage.
export const isHumanBatch = (batchType) => !batchType || batchType === 'human';

export const GRANT_STATUS_META = {
  pending_email:    { label: 'Awaiting email code', tone: 'bg-gray-100 text-gray-700', final: false },
  pending_approval: { label: 'Awaiting holder',     tone: 'bg-orange-50 text-orange-700', final: false },
  approved:         { label: 'Approved',            tone: 'bg-green-50 text-green-700', final: false },
  rejected:         { label: 'Rejected by holder',  tone: 'bg-red-50 text-red-700', final: true },
  revoked:          { label: 'Revoked',             tone: 'bg-gray-100 text-gray-600', final: true },
  expired:          { label: 'Expired',             tone: 'bg-gray-100 text-gray-600', final: true },
};

export const grantStatusMeta = (status) =>
  GRANT_STATUS_META[status] || { label: String(status || 'Unknown').replace(/_/g, ' '), tone: 'bg-gray-100 text-gray-600', final: false };

// The server answers 404 for an already-finished grant, so only live ones offer Revoke.
export const canRevokeGrant = (grant) => !!grant?.id && !grantStatusMeta(grant.status).final;

// Visitor status: which screen to show for a request status (§4d step 3).
export const visitorStatusView = (status) => {
  if (status === 'approved') return 'approved';
  if (status === 'pending_email' || status === 'pending_approval') return 'waiting';
  if (status === 'rejected' || status === 'revoked' || status === 'expired') return status;
  return 'waiting';
};

// Holder phone: any format is accepted; the server compares the last 10 digits.
export const normalisePhoneInput = (value) => String(value || '').replace(/[^\d+\s()-]/g, '');

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

export const formatAccessDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
};

// The visitor and holder pages are public: an expired org session in the same browser must
// never bounce them to /login or start org-only background work.
export const isCertificateAccessPage = (pathname = '') => /^\/certificate-access(?:\/|$)/.test(pathname);

// Only a Permission Required batch may move from public to holder_approval (an Open one gets 409).
// When the visibility isn't known, the button stays and the server decides.
export const canRequireHolderApproval = (credentialVisibility) =>
  !['public', 'open_search'].includes(String(credentialVisibility || '').toLowerCase());
