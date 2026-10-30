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
  failed:           { label: 'Failed',              tone: 'bg-red-50 text-red-700', final: true },
};

export const grantStatusMeta = (status) =>
  GRANT_STATUS_META[status] || { label: String(status || 'Unknown').replace(/_/g, ' '), tone: 'bg-gray-100 text-gray-600', final: false };

// The server answers 404 for an already-finished grant, so only live ones offer Revoke.
export const canRevokeGrant = (grant) => !!grant?.id && !grantStatusMeta(grant.status).final;

// Visitor status: which screen to show for a request status (§4d step 3).
export const visitorStatusView = (status) => {
  if (status === 'approved') return 'approved';
  if (status === 'pending_email' || status === 'pending_approval') return 'waiting';
  if (status === 'rejected' || status === 'revoked' || status === 'expired' || status === 'failed') return status;
  return 'failed';
};

export const validateAccessRequestCreated = (data) => {
  if (typeof data?.request_id !== 'string' || !data.request_id.trim()) throw new Error('The server did not confirm the access request. Please try again.');
  return data;
};

const ACCESS_NEXT_STEPS = {
  organization_password: 'organization', holder_credentials: 'holder', holder_approval: 'third_party',
};

export const accessNextStep = (data) => {
  // Older deployed backends return neither additive field. Their visitor flow
  // remains approval-based; never infer a direct identity from the typed email.
  if (data?.next_step == null && data?.identity_type == null) return 'holder_approval';
  if (!Object.hasOwn(ACCESS_NEXT_STEPS, data?.next_step)
    || ACCESS_NEXT_STEPS[data.next_step] !== data.identity_type) {
    throw new Error('The next identity check could not be confirmed. Start a new access request.');
  }
  return data.next_step;
};

export const validateAccessRequestStatus = (data, requestId, { verified = false } = {}) => {
  if (data?.request_id !== requestId || !Object.hasOwn(GRANT_STATUS_META, data?.status)
    || (verified && (typeof data.access_token !== 'string' || !data.access_token.trim()))) {
    throw new Error('The access response could not be confirmed. Please check the request again.');
  }
  if (verified) {
    const nextStep = accessNextStep(data);
    if (nextStep !== 'holder_approval' && data.status !== 'pending_approval') {
      throw new Error('The required identity check could not be confirmed. Start a new access request.');
    }
  }
  return data;
};

export const validateDirectAccess = (data, requestId, nextStep) => {
  const expectedScope = nextStep === 'organization_password' ? 'report' : nextStep === 'holder_credentials' ? 'holder' : null;
  if (!expectedScope || data?.request_id !== requestId || data?.status !== 'approved'
    || data.scope !== expectedScope || !Number.isFinite(Date.parse(data.expires_at))) {
    throw new Error('Access could not be confirmed. Check the request status before trying again.');
  }
  return data;
};

export const validateHolderInfo = (data) => {
  if (!data || typeof data.visitor_email !== 'string' || !isValidEmail(data.visitor_email)
    || typeof data.requires_phone_number !== 'boolean'
    || !Number.isFinite(Date.parse(data.approval_deadline))) {
    throw new Error('The approval request could not be confirmed. Please reload the request.');
  }
  return data;
};

export const validateHolderDecision = (data, decision) => {
  const expected = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : null;
  if (!expected || data?.status !== expected) throw new Error('The server did not confirm this decision. Please reload the request to check its current state.');
  return data;
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
