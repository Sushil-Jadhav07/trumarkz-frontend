import axios from 'axios';
import { getDocumentViewCandidates } from '@/utils/recordDocuments';
import { isConsentPage } from '@/utils/consent';
import { isCertificateAccessPage } from '@/utils/certificateAccess';
import { automaticRecordId, canRetryAutomatic } from '@/utils/automaticVerification';
import { validateOcrAssignments } from '@/utils/ocrAssignments';
import { withSampleRecord } from '@/utils/schemaConfig';
import { fetchReport, isGatedReportUrl, reportAuthHeaders, certificateAccessPath } from '@/utils/reportAccess';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const VERIFICATION_BASE_URL = import.meta.env.VITE_VERIFICATION_API_URL || API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const verificationApi = axios.create({
  baseURL: VERIFICATION_BASE_URL,
  timeout: 60000,
});

const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/signup/individual',
  '/auth/signup/organization',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/google/url',
  '/auth/google',
];

const isPublicAuthEndpoint = (url = '') =>
  PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

// The three token-authenticated, no-login verifier endpoints (Human and
// Product share this exact same flow — there is no separate Product
// variant). A verifier hitting any of these must never carry the logged-in
// admin/org's bearer token, and a 401 from any of them (bad/expired verifier
// token) must never be treated as "the real user's session died" — that
// would wipe the actual logged-in user's auth storage and bounce them to
// /login mid-review just because a verifier link elsewhere was stale.
const isPublicManualVerificationEndpoint = (url = '') =>
  url.includes('/verification/manual/request-info/') ||
  url.includes('/verification/manual/upload/') ||
  url.includes('/verification/manual/verify/');

const isPublicConsentEndpoint = (url = '') =>
  /^\/verification\/consent\/[^/?]+(?:\/decision)?(?:\?|$)/.test(url);

const clearAuthStorage = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_type');
  localStorage.removeItem('email');
  localStorage.removeItem('trumarkz_access_token');
  localStorage.removeItem('trumarkz_user');
};

const getStoredToken = () =>
  localStorage.getItem('access_token') || localStorage.getItem('trumarkz_access_token');

// [body, config] for a schema-config save. With a pasted sample record the body is pre-serialised
// so the record reaches the server byte-for-byte; axios passes string bodies through unchanged.
// local_fields survives cleanObject even when empty: an explicit [] means "no fields" to the
// server, while dropping the key would mean "keep the previous version's fields".
const schemaConfigBody = (payload, sampleRecordText) => {
  const cleaned = cleanObject(payload);
  if (Array.isArray(payload.local_fields)) cleaned.local_fields = payload.local_fields;
  return sampleRecordText
    ? [withSampleRecord(JSON.stringify(cleaned), sampleRecordText), { headers: { 'Content-Type': 'application/json' } }]
    : [cleaned];
};

const cleanObject = (input = {}) =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      return true;
    })
  );

const normalizeUploadArgs = (maybeOptions, maybeProgress) => {
  const onProgress = typeof maybeOptions === 'function' ? maybeOptions : maybeProgress;
  const options =
    maybeOptions && typeof maybeOptions === 'object' && !Array.isArray(maybeOptions) && typeof maybeOptions !== 'function'
      ? maybeOptions
      : {};

  return { options, onProgress };
};

const appendFormValue = (formData, key, value) => {
  if (value === undefined || value === null || value === '') return;
  if (Array.isArray(value)) {
    if (value.length > 0) formData.append(key, value.join(','));
    return;
  }
  if (typeof value === 'object') {
    if (Object.keys(value).length > 0) formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, value);
};

const buildUseCasesPayload = (useCases = {}) => useCases;

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token && !isPublicAuthEndpoint(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Was only exempting `/auth/login` here, but the request interceptor
    // above exempts the FULL public-endpoint list (verify-otp, resend-otp,
    // signup, forgot/reset-password, google...). That mismatch meant a 401
    // from e.g. an expired OTP on /auth/verify-otp — a normal business-logic
    // error on a page where the user isn't even logged in yet — was treated
    // as "your session died," wiping storage and hard-redirecting to /login
    // mid-registration. Use the same exemption list as the request
    // interceptor so only a REAL authenticated-request 401 triggers this.
    if (error.response?.status === 401 && !isPublicAuthEndpoint(error.config?.url)) {
      clearAuthStorage();
      if (window.location.pathname !== '/login' && !isConsentPage(window.location.pathname) && !isCertificateAccessPage(window.location.pathname)) window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

verificationApi.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    // Optional push work must never register/remove a token under a different
    // account if authentication changes while an async operation is in flight.
    if (config.expectedAccessToken && config.expectedAccessToken !== token) {
      throw new axios.CanceledError('Push session changed');
    }
    const isPublicUpload =
      config.url?.includes('/verification/upload/photo') ||
      config.url?.includes('/verification/upload/document') ||
      isPublicManualVerificationEndpoint(config.url) || isPublicConsentEndpoint(config.url);

    if (token && !isPublicUpload) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers?.Authorization && isPublicUpload) {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

verificationApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const isPublicRoute = isPublicManualVerificationEndpoint(error.config?.url) || isPublicConsentEndpoint(error.config?.url);
    if (error.response?.status === 401 && !isPublicRoute) {
      clearAuthStorage();
      if (window.location.pathname !== '/login' && !isConsentPage(window.location.pathname) && !isCertificateAccessPage(window.location.pathname)) window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signupOrganization: (data) =>
    api.post('/auth/signup/organization', {
      org_name: data.orgName.trim(),
      email: data.email.trim(),
      phone_number: data.phoneNumber ? data.phoneNumber.trim() : undefined,
      password: data.password,
      service_type: data.serviceType || undefined,
    }),

  // PATCH /auth/me — org self-service profile fields (organization name, full
  // name, phone, GSTIN, business reg number, address lines, service type,
  // industry type, dhiways_details). Only keys present in `data` are sent,
  // so callers control exactly which fields go out (send only what changed).
  updateOwnProfile: (() => {
    const KEY_MAP = {
      // PATCH /auth/me expects `org_name`, not `organization_name` — confirmed
      // against the live GET /auth/me response, which returns org_name.
      organizationName: 'org_name',
      fullName: 'full_name',
      phoneNumber: 'phone_number',
      gstin: 'gstin',
      businessRegNumber: 'business_reg_number',
      addressLine1: 'address_line1',
      addressLine2: 'address_line2',
      addressLine3: 'address_line3',
      serviceType: 'service_type',
      industryType: 'industry_type',
      dhiwaysDetails: 'dhiways_details',
    };
    return (data = {}) => {
      const payload = {};
      Object.entries(KEY_MAP).forEach(([jsKey, wireKey]) => {
        if (jsKey in data) payload[wireKey] = data[jsKey];
      });
      return api.patch('/auth/me', payload);
    };
  })(),

  // POST /auth/me/verify-gst — checks a GSTIN against the GST registry; if
  // the registered legal/trade name matches this org's org_name, marks the
  // org verified (gst_verified -> true) and saves the GSTIN to the profile.
  // Pass a gstin to verify a specific number, or omit it to verify the one
  // already saved on the profile. A name mismatch is NOT an error — it's a
  // 200 with gst_verified: false plus the registry's legal_name/trade_name
  // so the caller can show what didn't match. Only a 502 (registry
  // unreachable) is a real failure.
  verifyGst: (gstin) => api.post('/auth/me/verify-gst', gstin ? { gstin } : {}),

  // POST /auth/me/unverify-gst — self-service: org revokes its own GST
  // verification. Resets gst_verified=false and clears gst_details, keeps
  // the saved gstin string and everything else untouched.
  unverifyGst: () => api.post('/auth/me/unverify-gst'),

  // POST /auth/organizations/{org_id}/unverify-gst — superadmin-only
  // equivalent, targeting any organization by id.
  unverifyGstForOrg: (orgId) => api.post(`/auth/organizations/${orgId}/unverify-gst`),

  // POST /auth/dhiway/set-default — marks one existing Dhiway config row as
  // the default (server clears the flag on any other entry). The typed
  // backend now uses `space_type` to resolve human/product/warranty configs,
  // so the type is sent when available and retained for legacy untyped human
  // rows when omitted.
  // Org acts on its own account when org_id is omitted; superadmin passes
  // org_id to act on another organization's behalf.
  setDhiwayDefault: ({ spaceId, schemaId, spaceType, orgId } = {}) =>
    api.post(
      '/auth/dhiway/set-default',
      cleanObject({
        space_id: spaceId,
        schema_id: schemaId,
        space_type: spaceType,
        org_id: orgId || undefined,
      })
    ),

  signupIndividual: (data) =>
    api.post('/auth/signup/individual', {
      full_name: data.fullName.trim(),
      email: data.email.trim(),
      phone_number: data.phoneNumber ? data.phoneNumber.trim() : undefined,
      password: data.password,
    }),

  verifyOTP: (email, otpCode) => api.post('/auth/verify-otp', { email, otp_code: otpCode }),
  verifyOtp: (email, otpCode) => api.post('/auth/verify-otp', { email, otp_code: otpCode }),
  resendOTP: (email) => api.post('/auth/resend-otp', { email }),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }),
  login: (email, password) => api.post('/auth/login', { email, password }),

  getGoogleAuthUrl: (userType) =>
    api.get('/auth/google/url', {
      params: userType ? { user_type: userType } : undefined,
    }),

  googleAuth: (token, userType) =>
    api.post(
      '/auth/google',
      { token },
      { params: userType ? { user_type: userType } : undefined }
    ),

  googleAuthMobile: (token, userType) =>
    api.post(
      '/auth/google',
      { token },
      { params: userType ? { user_type: userType } : undefined }
    ),

  completeGoogleSignup: (userType) =>
    api.post('/auth/complete-google-signup', userType ? { user_type: userType } : {}),

  completeOnboarding: (data) =>
    api.post(
      '/auth/onboarding',
      cleanObject({
        industry_type: data.industryType,
        gstin: data.gstin,
        business_reg_number: data.businessRegNumber,
        address_line1: data.addressLine1,
        address_line2: data.addressLine2,
        address_line3: data.addressLine3,
        use_cases: buildUseCasesPayload(data.useCases),
      })
    ),

  getCurrentUser: () => api.get('/auth/me'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, otpCode, newPassword) =>
    api.post('/auth/reset-password', {
      email,
      otp_code: otpCode,
      new_password: newPassword,
    }),

  getUsersGrouped: () => api.get('/auth/users/grouped'),
  getAllUsers: (params = {}) => {
    const p = {};
    if (params.user_type) p.user_type = params.user_type;
    if (params.limit != null) p.limit = params.limit;
    if (params.offset != null) p.offset = params.offset;
    return api.get('/auth/users', { params: p });
  },
  createUser: (payload) => api.post('/auth/users', cleanObject(payload)),
  updateUser: (userId, payload) => api.patch(`/auth/users/${userId}`, payload),
  deactivateUser: (userId) => api.delete(`/auth/users/${userId}`),
  // DELETE /auth/users/{user_id}/permanent — superadmin only, irreversible.
  // Distinct from deactivateUser above, which is a reversible soft-delete.
  permanentlyDeleteUser: (userId) => api.delete(`/auth/users/${userId}/permanent`),
  // POST /auth/organizations/approve — sets org_approved=true. The backend
  // removed org_approved from its authorization checks entirely, so this is
  // now purely a record-keeping flag (surfaced as an "Approved" badge/action
  // in the User List), not an access gate. `org_id` body key confirmed
  // against the backend team's contract doc.
  approveOrganization: (orgId) => api.post('/auth/organizations/approve', { org_id: orgId }),
  // ── Superadmin organization management (org-scoped, never mixes in the
  // signup contact person's personal fields/credentials) — use these for
  // organization profile viewing/editing instead of the generic
  // getAllUsers/updateUser above, which still carry full_name/phone_number/
  // is_active/email_verified and have no organization-specific allowlist.
  // GET /auth/organizations — `total` is this page's item count, not a
  // cross-page total (matches this backend's existing pagination convention
  // elsewhere — never treat it as the overall dataset size).
  getOrganizations: (params = {}) => {
    const p = {};
    if (params.limit != null) p.limit = params.limit;
    if (params.offset != null) p.offset = params.offset;
    return api.get('/auth/organizations', { params: p });
  },
  getOrganization: (orgId) => api.get(`/auth/organizations/${orgId}`),
  // PATCH /auth/organizations/{org_id} — every field optional. Only
  // organization_name/service_type/industry_type/gstin/business_reg_number/
  // address_line1-3/use_cases/dhiways_details are part of this schema;
  // org_approved/is_active/email_verified/onboarding_completed/gst_verified
  // are read-only here (sending them is simply ignored) — use the existing
  // dedicated actions (approveOrganization, deactivateUser, etc.) for those.
  // Never send full_name/phone_number/email/password/OTP/token here — this
  // surface is organization-scoped only, never the signup contact person's.
  updateOrganization: (orgId, payload) => api.patch(`/auth/organizations/${orgId}`, cleanObject(payload)),

  // ── Dynamic organization-specific schema configs (org_schema_configs) ──
  // Separate, additive system from dhiways_details/setDhiwayDefault above —
  // see "Dynamic Schema change.md". SuperAdmin may target any org_id; an
  // organization account may only target its own id (the backend 403s
  // otherwise). Every call here is its own independent request — none of
  // these are part of the updateOrganization PATCH payload.
  // GET — active_only defaults true server-side; pass false to include
  // deactivated/superseded versions (for a version-history view).
  getSchemaConfigs: (orgId, { spaceType, activeOnly } = {}) =>
    api.get(`/auth/organizations/${orgId}/schema-configs`, {
      params: cleanObject({ space_type: spaceType, active_only: activeOnly }),
    }),
  // POST — registers version 1. payload: { space_type, schema_variant?,
  // schema_id, space_id, label, local_fields?, input_map?, output_map?,
  // is_default? }, plus the optional pasted sample_record (sent verbatim, see
  // withSampleRecord). Returns { config, warnings }.
  createSchemaConfig: (orgId, payload, { sampleRecordText } = {}) =>
    api.post(`/auth/organizations/${orgId}/schema-configs`, ...schemaConfigBody(payload, sampleRecordText)),
  // POST .../versions — full-replace edit; always creates the next version,
  // never patches in place. Same payload shape as create.
  createSchemaConfigVersion: (orgId, configId, payload, { sampleRecordText } = {}) =>
    api.post(`/auth/organizations/${orgId}/schema-configs/${configId}/versions`, ...schemaConfigBody(payload, sampleRecordText)),
  // POST .../set-default — no body; config_id is the path param.
  setSchemaConfigDefault: (orgId, configId) =>
    api.post(`/auth/organizations/${orgId}/schema-configs/${configId}/set-default`),
  // POST .../deactivate — no body. Never deletes; a batch that already
  // froze this config's content stays reproducible forever.
  deactivateSchemaConfig: (orgId, configId) =>
    api.post(`/auth/organizations/${orgId}/schema-configs/${configId}/deactivate`),

  // PATCH /auth/superadmins/{user_id} — superadmin-only. Updates an existing
  // superadmin's own details (full_name, phone_number, email, password,
  // is_active). Every field optional — only send what's actually changing;
  // omit `password` entirely to leave it unchanged (never send an empty
  // string for it). This is the dedicated surface for editing an existing
  // superadmin account — distinct from promoteSuperAdmin (grants super-admin
  // to an existing non-admin user) and createSuperAdmin (creates a brand
  // new one) below, neither of which edits an existing admin's details.
  updateSuperAdmin: (userId, payload) => api.patch(`/auth/superadmins/${userId}`, cleanObject(payload)),

  promoteSuperAdmin: (email) => api.post('/auth/promote-super-admin', { email }),
  createSuperAdmin: (payload) => api.post('/auth/create-super-admin', payload),
  getOrganizationIndustryType: (orgId) => api.get(`/auth/organization/${orgId}/industry-type`),
  getAuditLogs: (batchUserId) => api.get(`/auth/audit-logs/${batchUserId}`),
};

export const pushAPI = {
  registerPushToken: (token, options = {}) => verificationApi.post('/push/tokens', { token, platform: 'web' }, options),
  getPushTokens: (options = {}) => verificationApi.get('/push/tokens', options),
  removePushToken: (token, options = {}) => verificationApi.delete('/push/tokens', { ...options, params: { token } }),
};

export const orgAPI = {};

export const adminAPI = {
  getUsersGrouped: authAPI.getUsersGrouped,
  getAllUsers: authAPI.getAllUsers,
  createUser: authAPI.createUser,
  updateUser: authAPI.updateUser,
  updateSuperAdmin: authAPI.updateSuperAdmin,
  deactivateUser: authAPI.deactivateUser,
  permanentlyDeleteUser: authAPI.permanentlyDeleteUser,
  approveOrganization: authAPI.approveOrganization,
  unverifyGstForOrg: authAPI.unverifyGstForOrg,
  setDhiwayDefault: authAPI.setDhiwayDefault,
  getOrganizations: authAPI.getOrganizations,
  getOrganization: authAPI.getOrganization,
  updateOrganization: authAPI.updateOrganization,
  getSchemaConfigs: authAPI.getSchemaConfigs,
  createSchemaConfig: authAPI.createSchemaConfig,
  createSchemaConfigVersion: authAPI.createSchemaConfigVersion,
  setSchemaConfigDefault: authAPI.setSchemaConfigDefault,
  deactivateSchemaConfig: authAPI.deactivateSchemaConfig,
  promoteSuperAdmin: authAPI.promoteSuperAdmin,
  createSuperAdmin: (payload) =>
    authAPI.createSuperAdmin(
      cleanObject({
        full_name: payload.full_name || payload.fullName,
        email: payload.email,
        password: payload.password,
      })
    ),
  getAuditLogs: authAPI.getAuditLogs,
};

export const verificationAPI = {
  getConsentInfo: (token, { signal } = {}) =>
    verificationApi.get(`/verification/consent/${encodeURIComponent(token)}`, { signal }),
  submitConsentDecision: (token, decision) =>
    verificationApi.post(`/verification/consent/${encodeURIComponent(token)}/decision`, { decision }),

  getNotifications: ({ unreadOnly = false, limit = 50, offset = 0 } = {}) =>
    verificationApi.get('/verification/notifications', { params: { unread_only: unreadOnly, limit, offset } }),
  markNotificationRead: (notificationId) =>
    verificationApi.post(`/verification/notifications/${encodeURIComponent(notificationId)}/read`),
  markAllNotificationsRead: () => verificationApi.post('/verification/notifications/read-all'),
  getIndustryTypes: () => verificationApi.get('/verification/industry-types'),

  uploadSingleHuman: (data) =>
    verificationApi.post(
      '/verification/single/human',
      cleanObject({
        batch_type: data.batch_type || 'human',
        full_name: data.full_name?.trim(),
        phone_number: data.phone_number?.trim(),
        email: data.email?.trim(),
        dob: data.dob,
        aadhar_number: data.aadhar_number?.trim(),
        pan_number: data.pan_number?.trim(),
        address_line1: data.address_line1?.trim(),
        address_line2: data.address_line2?.trim(),
        address_line3: data.address_line3?.trim(),
        pincode: data.pincode?.trim(),
        state: data.state?.trim(),
        country: data.country?.trim(),
        industry_type: data.industry_type,
        verification_types: data.verification_types,
        credential_visibility: data.credential_visibility,
        template_id: data.template_id,
        // Optional — picks one of the org's configured dynamic schemas (see
        // "Dynamic Schema change.md"); omitted uses the org's default, if any.
        schema_name: data.schema_name,
      })
    ),

  uploadSingleProduct: (data) =>
    verificationApi.post(
      '/verification/single/product',
      cleanObject({
        batch_type: data.batch_type || 'product',
        category_id: data.category_id,
        product_name: data.product_name?.trim(),
        custom_fields: data.custom_fields || {},
        verification_types: data.verification_types,
        credential_visibility: data.credential_visibility,
        template_id: data.template_id,
        schema_name: data.schema_name,
      })
    ),

  // OCR bulk-upload — document images in, batch_users out (pending_review), one
  // call per batch. 1 image = 1 user. `fields`/`docType` are extraction hints,
  // not required. Same optional industry/verification/visibility params as the
  // Excel bulkUpload above.
  extractOcrDocument: (file) => {
    const formData = new FormData();
    formData.append('files', file);
    return verificationApi.post('/ocr/extract', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  bulkUploadDocuments: (files, batchName, maybeOptions, maybeProgress) => {
    const formData = new FormData();
    const { options, onProgress } = normalizeUploadArgs(maybeOptions, maybeProgress);
    if ((options.batchType || options.batch_type || 'human') === 'human') {
      const assignments = validateOcrAssignments(options.assignments, files.length);
      if (assignments.length) formData.append('assignments', JSON.stringify(assignments));
    }

    files.forEach((file) => formData.append('files', file));
    formData.append('batch_name', batchName);
    // Caller-supplied, not hardcoded — this endpoint is used for both human
    // and product OCR bulk uploads.
    appendFormValue(formData, 'batch_type', options.batchType || options.batch_type);
    appendFormValue(formData, 'description', options.description);
    appendFormValue(formData, 'industry_type', options.industryType || options.industry_type);
    appendFormValue(formData, 'verification_types', options.verificationTypes || options.verification_types);
    appendFormValue(
      formData,
      'credential_visibility',
      options.credentialVisibility || options.credential_visibility
    );
    appendFormValue(formData, 'fields', options.fields);
    appendFormValue(formData, 'doc_type', options.docType || options.doc_type);
    appendFormValue(formData, 'schema_name', options.schemaName || options.schema_name);

    return verificationApi.post('/verification/bulk-upload/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (event) => onProgress(Math.round((event.loaded * 100) / (event.total || 1)))
        : undefined,
    });
  },

  // Single OCR photo — attaches/replaces the photo for one BatchUser created
  // by bulkUploadDocuments above. Backend normalizes to a 350x350 PNG.
  uploadOcrPhoto: (batchUserId, photo) => {
    const formData = new FormData();
    formData.append('batch_user_id', batchUserId);
    formData.append('photo', photo);
    return verificationApi.post('/verification/upload/ocr-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Bulk OCR photos — batch_user_ids[i] <-> photos[i], strictly positional
  // (never filename/name/email/order heuristics). One bad pair (invalid
  // photo, wrong-org id) never blocks the rest — see failed_users[] on the
  // response, alongside successful_users[].
  bulkUploadOcrPhotos: (batchUserIds, photos, onProgress) => {
    const formData = new FormData();
    batchUserIds.forEach((id) => formData.append('batch_user_ids', id));
    photos.forEach((photo) => formData.append('photos', photo));
    return verificationApi.post('/verification/bulk-upload/ocr-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (event) => onProgress(Math.round((event.loaded * 100) / (event.total || 1)))
        : undefined,
    });
  },

  // Edit OCR-extracted fields post-review and (by default) mark reviewed —
  // only the fields present in `payload` are changed. Pass mark_reviewed:
  // false to save corrections while keeping ocr_review_status pending.
  updateBatchUser: (userId, payload) =>
    verificationApi.patch(`/verification/batch-users/${userId}`, cleanObject(payload)),

  // Attach a document to a single existing human user (separate from the bulk
  // OCR flow — not part of the review wizard, just a standalone utility).
  uploadHumanDocument: (userId, documentLabel, file) => {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('document_label', documentLabel);
    formData.append('file', file);
    return verificationApi.post('/verification/humans/upload-doc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  bulkUpload: (file, batchName, description = '', maybeOptions, maybeProgress) => {
    const formData = new FormData();
    const { options, onProgress } = normalizeUploadArgs(maybeOptions, maybeProgress);

    formData.append('file', file);
    formData.append('batch_name', batchName);
    formData.append('batch_type', options.batchType || options.batch_type || 'human');
    appendFormValue(formData, 'description', description);
    appendFormValue(formData, 'industry_type', options.industryType || options.industry_type);
    appendFormValue(formData, 'verification_types', options.verificationTypes || options.verification_types);
    appendFormValue(
      formData,
      'credential_visibility',
      options.credentialVisibility || options.credential_visibility
    );
    appendFormValue(formData, 'template_id', options.templateId || options.template_id);
    appendFormValue(formData, 'schema_name', options.schemaName || options.schema_name);

    return verificationApi.post('/verification/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (event) => onProgress(Math.round((event.loaded * 100) / (event.total || 1)))
        : undefined,
    });
  },

  bulkUploadProducts: (
    file,
    batchName,
    industryType,
    description = '',
    maybeOptions,
    maybeProgress
  ) => {
    const formData = new FormData();
    const { options, onProgress } = normalizeUploadArgs(maybeOptions, maybeProgress);

    formData.append('file', file);
    formData.append('batch_name', batchName);
    formData.append('batch_type', options.batchType || options.batch_type || 'product');
    appendFormValue(formData, 'description', description);
    appendFormValue(formData, 'industry_type', industryType || options.industryType || options.industry_type);
    appendFormValue(
      formData,
      'credential_visibility',
      options.credentialVisibility || options.credential_visibility
    );
    appendFormValue(formData, 'verification_types', options.verificationTypes || options.verification_types);
    appendFormValue(formData, 'template_id', options.templateId || options.template_id);
    appendFormValue(formData, 'schema_name', options.schemaName || options.schema_name);

    // No document attachments here — Product Excel upload no longer supports
    // row-level document attachment at all (doc_files/doc_sku_nos/doc_labels/
    // doc_product_names). Product QR1/QR2 now come exclusively from the
    // verifier-report workflow (qr_slot, backend-assigned); any internal-only
    // product document goes through the standalone POST /products/upload-doc
    // endpoint instead, never through this bulk-upload call.
    return verificationApi.post('/verification/bulk-upload/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (event) => onProgress(Math.round((event.loaded * 100) / (event.total || 1)))
        : undefined,
    });
  },

  // schemaName: the batch's schema configuration label — the server then appends that schema's own
  // fields as extra columns (never replacing or reordering these headers).
  generateHumanTemplate: (headers, verificationTypes = [], schemaName) => {
    const formData = new FormData();
    appendFormValue(formData, 'headers', Array.isArray(headers) ? headers.join(',') : headers);
    appendFormValue(
      formData,
      'verification_types',
      Array.isArray(verificationTypes) ? verificationTypes.join(',') : verificationTypes
    );
    appendFormValue(formData, 'schema_name', schemaName);

    return verificationApi.post('/verification/generate-human-template', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    });
  },

  generateProductTemplate: (headers, schemaName) => {
    const formData = new FormData();
    appendFormValue(formData, 'headers', Array.isArray(headers) ? headers.join(',') : headers);
    appendFormValue(formData, 'schema_name', schemaName);

    return verificationApi.post('/verification/products/template', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    });
  },

  uploadPhoto: (inviteToken, file) => {
    const formData = new FormData();
    formData.append('token', inviteToken);
    formData.append('file', file);
    return verificationApi.post('/verification/upload/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadDocument: (inviteToken, documentLabel, file) => {
    const formData = new FormData();
    formData.append('token', inviteToken);
    formData.append('document_label', documentLabel);
    formData.append('file', file);
    return verificationApi.post('/verification/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getAllVerifications: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.orgId) params.append('org_id', filters.orgId);
    if (filters.batchId) params.append('batch_id', filters.batchId);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit != null) params.append('limit', String(filters.limit));
    if (filters.offset != null) params.append('offset', String(filters.offset));
    const query = params.toString();
    return verificationApi.get(`/verification/all${query ? `?${query}` : ''}`);
  },

  getUserVerification: (userId) => verificationApi.get(`/verification/user/${userId}`),
  retryAutomaticVerification: async (userId) => {
    // Retry eligibility follows the verification rules only — holder consent is not a condition.
    const { data: user } = await verificationApi.get(`/verification/user/${userId}`);
    const { data: batch } = await verificationApi.get(`/verification/batches/${user?.batch_id}`);
    const row = batch.users?.find((item) => automaticRecordId(item) === String(userId));
    if (!row || !canRetryAutomatic({ ...row, ...user, verification_type_status: row.verification_type_status }, batch)) {
      throw new Error('Retry is unavailable: automatic verification must have no report and no approved or rejected automatic checks. Refresh the status.');
    }
    return verificationApi.post(`/verification/batch-users/${encodeURIComponent(userId)}/retry-automatic-verification`);
  },
  getDocumentViewCandidates: (document) => getDocumentViewCandidates(document, VERIFICATION_BASE_URL),

  generateQRAndCertificate: async (userId) => {
    return verificationApi.post(`/verification/user/${userId}/generate-qr`);
  },

  // batchType: optional 'human' | 'product' | 'warranty' — filters server-side
  // via ?batch_type=. Omit to get every batch type, same as before.
  getBatches: (batchType) =>
    verificationApi.get('/verification/batches', {
      params: batchType ? { batch_type: batchType } : undefined,
    }),
  getBatchDetails: (batchId, config) => verificationApi.get(`/verification/batches/${batchId}`, config),

  // POST /verification/batches/{batch_id}/share-with-organization —
  // Superadmin only. The real, persisted "Send to Organization" action:
  // backend sets shared_with_org=true, records shared_at/shared_by, and
  // commits it — this is the actual security gate for certificate/SDC
  // visibility (GET /sdc/batches/{batch_id}/status and
  // GET /sdc/records/{public_id} both withhold data for an org caller until
  // this has been called). No request body; idempotent — calling it again
  // on an already-shared batch safely returns the existing state unchanged.
  shareWithOrganization: (batchId) =>
    verificationApi.post(`/verification/batches/${batchId}/share-with-organization`),

  // DELETE /verification/batches/{batch_id} — superadmin only. Permanently
  // hard-deletes the ENTIRE batch: BatchUsers, UserDocuments, manual
  // verification requests, audit logs, verification/SDC state, and every
  // batch-owned GCS file (uploaded documents/photos, Product images/
  // blow-up images, verification reports, Excel/CSV, manual verifier
  // reports). For a Warranty batch, its reserved WarrantySerialNumber rows
  // are deleted too (serial-number registry reset — generation logic
  // itself is unchanged). Works from pending/completed/approved/rejected/
  // sdc_generated/issued/shared states; 409 if the batch is currently
  // "processing" (nothing deleted — safe to retry once it settles), 404 if
  // it's already gone. If a Dhiway credential was already issued, it is
  // NOT revoked by this call (Dhiway has no such API) — the local batch and
  // its data are still deleted, and the response may carry orphaned
  // credential/public-id info to warn about, never implying the external
  // credential itself was removed.
  deleteBatch: (batchId) =>
    verificationApi.delete(`/verification/batches/${batchId}`),

  // POST /verification/batches/{batch_id}/send-rejected-list — superadmin
  // only. Generates an Excel of every user with at least one rejected
  // verification_type_status entry (not just users whose overall status is
  // "rejected" — a partially-verified user with one rejected type is
  // included too) and stores it privately in GCS. NOT emailed — there is no
  // email delivery in this flow at all (removed entirely, per the backend's
  // own doc). The organization reaches it only through the two authenticated
  // rejected-list view/download endpoints below, gated on the batch's own
  // `rejected_list` field from GET /verification/batches/{batch_id}. No
  // request body. 404 if the batch has no rejected users, 400 if the org has
  // no email on file (a well-formedness check, independent of delivery — no
  // email is sent either way), 502 if Excel generation/GCS upload fails.
  // Calling this again overwrites the same stored file/metadata — the
  // organization always sees the latest generated list, never a stale one.
  sendRejectedList: (batchId) =>
    verificationApi.post(`/verification/batches/${batchId}/send-rejected-list`),

  // GET /verification/batches/{batch_id}/rejected-list/view — inline view of
  // the stored Excel (Content-Disposition: inline). Authenticated: the
  // owning organization or SuperAdmin only (a different org's batch id 404s,
  // same as every other batch-scoped endpoint — never confirms the batch
  // exists). The raw GCS path is never exposed; this is the only way to
  // reach the file — never construct or store a GCS URL directly.
  getRejectedListView: (batchId) =>
    verificationApi.get(`/verification/batches/${batchId}/rejected-list/view`, { responseType: 'blob' }),

  // GET /verification/batches/{batch_id}/rejected-list/download — identical
  // file/authorization to the view endpoint above, just served as an
  // attachment (Content-Disposition: attachment) instead of inline.
  getRejectedListDownload: (batchId) =>
    verificationApi.get(`/verification/batches/${batchId}/rejected-list/download`, { responseType: 'blob' }),

  // DELETE /verification/batches/{batch_id}/users/{batch_user_id} —
  // superadmin only. Permanently removes one customer from a batch (cascades
  // their documents/audit logs) without touching the batch or its other
  // records; batch.total_users and status are recomputed server-side.
  deleteBatchUser: (batchId, batchUserId) =>
    verificationApi.delete(`/verification/batches/${batchId}/users/${batchUserId}`),

  // DELETE /verification/batches/{batch_id}/users/{batch_user_id}/documents/{document_id}
  // — org owner (of the batch) or superadmin. Removes one attached document
  // (e.g. a warranty card / certificate) without touching the record itself.
  deleteBatchUserDocument: (batchId, batchUserId, documentId) =>
    verificationApi.delete(`/verification/batches/${batchId}/users/${batchUserId}/documents/${documentId}`),

  getVerificationTypes: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.industry_type) {
      // API expects a JSON-encoded array string: ["Healthcare","IT"]
      const arr = Array.isArray(filters.industry_type)
        ? filters.industry_type
        : [filters.industry_type];
      if (arr.length > 0) params.append('industry_type', JSON.stringify(arr));
    }
    const query = params.toString();
    return verificationApi.get(`/verification/verification-types${query ? `?${query}` : ''}`);
  },

  getVerificationType: (id) => verificationApi.get(`/verification/verification-types/${id}`),

  createVerificationType: (payload) => verificationApi.post('/verification/verification-types', payload),

  deleteVerificationType: (id) => verificationApi.delete(`/verification/verification-types/${id}`),

  // Manual verification request — returns { request_id, token, expires_at, verifier_email }
  requestManualVerification: async (payload) => {
    return verificationApi.post('/verification/verification/manual/request', payload);
  },

  // Source of truth for the verifier-facing upload/review page — token-
  // authenticated, public. Returns the request's verification type, status,
  // and the exact list of assigned users/products (users[]: batch_user_id,
  // full_name, status, reason, rejection_reason, report_url, file_index).
  // Re-fetch this after every upload/verify call rather than trusting any
  // locally-computed state — same Human/Product shape, no branching needed.
  getManualVerificationRequestInfo: (token) =>
    verificationApi.get(`/verification/manual/request-info/${token}`),

  // Verifier's own approve/reject decision per assigned user/product —
  // token-authenticated, public, independent of the org/admin review
  // endpoint below. Reason is required by the backend for any "rejected"
  // decision; omitting it for an approval is fine.
  verifyManualVerificationRequest: (token, decisions) =>
    verificationApi.post(`/verification/manual/verify/${token}`, { decisions }),

  // Verifier uploads report files against the token.
  // Let Axios no-set Content-Type with correct multipart boundary.
  // batchUserIds (optional) is the exact per-file tagging the backend added
  // (manual_verification_request_files / Change 6): batchUserIds[i] names
  // which BatchUser files[i] belongs to — a strict parallel array, never
  // inferred from file order. Omit it entirely (don't pass an empty array
  // either) to keep the legacy behavior: every user associated with the
  // request shares file index 0. The backend treats an empty list the same
  // as "not provided", so this only ever appends when there's real tagging.
  uploadManualReport: (token, files, batchUserIds) => {
    const formData = new FormData();
    Array.from(files || []).forEach((file) => formData.append('files', file));
    if (Array.isArray(batchUserIds) && batchUserIds.length > 0) {
      batchUserIds.forEach((id) => formData.append('batch_user_ids', id));
    }
    return verificationApi.post(`/verification/manual/upload/${token}`, formData);
  },

  patchVerificationType: (id, payload) => verificationApi.patch(`/verification/verification-types/${id}`, payload),

  createTemplate: (payload) => verificationApi.post('/verification/templates', payload),
  getTemplate: (templateId) => verificationApi.get(`/verification/templates/${templateId}`),
  updateTemplate: (templateId, payload) =>
    verificationApi.put(`/verification/templates/${templateId}`, payload),
  getTemplateHistory: (templateId) =>
    verificationApi.get(`/verification/templates/${templateId}/history`),

  // ── Third-party verifiers ──────────────────────────────────────────────────
  getThirdPartyVerifiers: (batchId) =>
    verificationApi.get(`/verification/batches/${batchId}/third-party-verifiers`),

  // ── Bulk manual verification emails ───────────────────────────────────────
  sendBulkManualVerification: async (payload) => {
    return verificationApi.post('/verification/manual/send-bulk', payload);
  },

  // ── Smart Send: multiple verifiers per type — users are split sequentially
  // from the deterministic batch user order (created_at ASC, id ASC) and the
  // exact resulting user_ids are sent in the payload; the backend never
  // splits or reorders them itself. ──────────────────────────────────────
  smartSendManualVerification: async (payload) => {
    return verificationApi.post('/verification/manual/smart-send', payload);
  },

  // ── Resend manual verification link ───────────────────────────────────────
  resendManualVerification: async (requestId, batchId) => {
    return verificationApi.post(`/verification/manual/resend/${requestId}`);
  },

  // POST /verification/manual/resend-rejected — re-verification, NOT the
  // same as resendManualVerification above (that resends the same link for
  // the same request; this creates a brand-new request for a fresh round of
  // review). Org-authenticated, owns-the-batch enforced (404 if not, never
  // 403). Only users CURRENTLY rejected for this exact verification_type_name
  // may be included — the old rejection stays in history untouched; only
  // this type's current verification_type_status entry can move once the
  // new request is decided. 409 if a pending resend already exists for one
  // of these users/this type — never retry blindly on that.
  resendRejectedForVerification: async (payload) => {
    return verificationApi.post('/verification/manual/resend-rejected', {
      batch_id: payload.batch_id,
      verification_type_name: payload.verification_type_name,
      batch_user_ids: payload.batch_user_ids,
      verifier_email: payload.verifier_email,
    });
  },

  // ── Submitted verifier reports for a batch ─────────────────────────────────
  getSubmittedReports: (batchId, submittedOnly = false) =>
    verificationApi.get(`/verification/batches/${batchId}/submitted-reports`, {
      params: submittedOnly ? { submitted_only: true } : undefined,
    }),

  // GET /verification/batches/{batch_id}/manual-assignments — authenticated
  // (owning organization or SuperAdmin, same as every other admin batch
  // endpoint — not a public/tokenized route). Read-only: the exact persisted
  // verifier -> assigned-user/product mapping Smart Send created. Once Smart
  // Send has run, this is the ONLY source of truth for assignment visibility
  // and verifier-based filtering — never reconstruct it from batch position,
  // name, email, submitted-report filenames, or verification status.
  getManualAssignments: (batchId) =>
    verificationApi.get(`/verification/batches/${batchId}/manual-assignments`),

  // ── Download one report file from a verifier's submission (binary stream) ──
  downloadManualReport: (requestId, fileIndex) =>
    verificationApi.get(`/verification/manual/reports/${requestId}/download/${fileIndex}`, {
      responseType: 'blob',
    }),

  // REMOVED: updateManualVerificationStatus / updateManualVerificationDecisions
  // (PATCH /verification/manual/requests/{request_id}/status). Backend change:
  // the verifier is now the only actor who can approve/reject a manual
  // verification report, via their own token upload/verify flow. This
  // endpoint now returns 410 Gone for SuperAdmin/Organization callers, so the
  // frontend no longer calls it at all — Submitted Reports is read-only.

  // ── Email Drafts ──────────────────────────────────────────────────────────
  // NOTE: the latest backend integration doc documents these five CRUD
  // routes at a bare `/email-drafts/...` prefix (no `/verification`). The
  // paths below are the ones already live and working in this app — left
  // unchanged here rather than guessed-rewritten from doc text, per this
  // project's own rule of trusting a live swagger check over changelog docs
  // when the two disagree. Verify against swagger before touching these; if
  // the backend really did move them, update all four in one pass together
  // with the two new below (which use the documented path since they're
  // brand new and can't yet be "already working" one way or the other).
  createEmailDraft: (payload) =>
    verificationApi.post('/verification/email-drafts', cleanObject({
      verification_type: payload.verification_type,
      subject: payload.subject,
      body: payload.body,
      extra_fields: payload.extra_fields || {},
    })),

  getEmailDraftsByType: (verificationType) =>
    verificationApi.get(`/verification/email-drafts/${encodeURIComponent(verificationType)}`),

  // Read-only recipients for one batch/type; independent of saved templates.
  getEmailDraftRecipients: (verificationType, batchId, { signal } = {}) =>
    verificationApi.get(`/verification/email-drafts/${encodeURIComponent(verificationType)}/recipients`, {
      params: { batch_id: batchId },
      signal,
    }),

  updateEmailDraft: (draftId, payload) =>
    verificationApi.put(`/verification/email-drafts/${draftId}`, cleanObject({
      subject: payload.subject,
      body: payload.body,
      extra_fields: payload.extra_fields || {},
    })),

  deleteEmailDraft: (draftId) =>
    verificationApi.delete(`/verification/email-drafts/${draftId}`),

  // GET /email-drafts/admin/all — Superadmin only: reusable draft templates
  // across every organization (unlike getEmailDraftsByType, which is always
  // scoped to the caller's own org). organizationId/verificationType filter,
  // limit defaults to 50 server-side (max 200).
  getEmailDraftsAdmin: (filters = {}) =>
    verificationApi.get('/email-drafts/admin/all', {
      params: cleanObject({
        organization_id: filters.organizationId || filters.organization_id,
        verification_type: filters.verificationType || filters.verification_type,
        limit: filters.limit,
        offset: filters.offset,
      }),
    }),

  // GET /email-drafts/history — actual email SEND history, distinct from the
  // reusable draft library above (manual_verification_requests, not
  // email_drafts). Org callers are auto-scoped to their own org; superadmin
  // may pass organization_id to view one org or omit it for all. Only ever
  // contains rows where SMTP delivery actually succeeded — a failed dispatch
  // never appears here, by backend design.
  getEmailHistory: (filters = {}) =>
    verificationApi.get('/email-drafts/history', {
      params: cleanObject({
        organization_id: filters.organizationId || filters.organization_id,
        batch_id: filters.batchId || filters.batch_id,
        verification_type: filters.verificationType || filters.verification_type,
        email_draft_id: filters.emailDraftId || filters.email_draft_id,
        limit: filters.limit,
        offset: filters.offset,
      }),
    }),

  // ── Run automatic verification ────────────────────────────────────────────
  runAutoVerification: async (verificationTypeName, userId) => {
    return verificationApi.post(`/verification/verification/automatic/${verificationTypeName}/${userId}`);
  },

  // ── Product Warranty ──────────────────────────────────────────────────────
  downloadWarrantyTemplate: () =>
    verificationApi.get('/verification/products/warranty-template', { responseType: 'blob' }),

  // POST /verification/products/warranty-reserve-serials — pre-batch step.
  // Reserves a globally-unique TMZ-W-XXXXXXXX serial per valid row from a
  // central registry, WITHOUT creating any Batch or BatchUser yet. Response:
  // { total_reserved, reserved_serial_nos: [...] } — pass reserved_serial_nos
  // back verbatim, in the same order, when calling uploadWarrantyExcel. Never
  // reorder, split, or generate serials client-side.
  reserveWarrantySerials: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return verificationApi.post('/verification/products/warranty-reserve-serials', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // reservedSerialNos: the ordered serial_no values from
  // reserveWarrantySerials's rows[], sent back verbatim as ONE comma-joined
  // string — sets use_reserved_serials=true whenever any are supplied, per
  // the verified backend contract.
  // documents: [{ file, serialNo, label }] — pre-batch documents staged on
  // the Template step, one entry per attached file (a record may contribute
  // 0, 1, or 2 entries). Per the verified contract: doc_files is a repeated
  // multipart field (one entry per file), while doc_serial_nos and
  // doc_labels are each ONE comma-joined string, positionally aligned with
  // doc_files by array order — never repeated fields for those two. The
  // backend matches all three purely by index.
  // schemaName (new, trailing/optional so existing positional call sites are
  // unaffected) — picks one of the org's configured dynamic Warranty
  // schemas; omitted uses the org's default, if any.
  uploadWarrantyExcel: (file, batchName, description = '', reservedSerialNos = [], documents = [], maybeProgress, schemaName) => {
    const formData = new FormData();
    const { onProgress } = normalizeUploadArgs(undefined, maybeProgress);

    formData.append('file', file);
    formData.append('batch_name', batchName);
    formData.append('batch_type', 'warranty');
    if (description) formData.append('description', description);
    if (schemaName) formData.append('schema_name', schemaName);
    if (Array.isArray(reservedSerialNos) && reservedSerialNos.length > 0) {
      formData.append('reserved_serial_nos', reservedSerialNos.join(','));
      formData.append('use_reserved_serials', 'true');
    }
    if (Array.isArray(documents) && documents.length > 0) {
      documents.forEach(({ file: docFile }) => formData.append('doc_files', docFile));
      formData.append('doc_serial_nos', documents.map((d) => d.serialNo).join(','));
      formData.append('doc_labels', documents.map((d) => d.label).join(','));
    }

    return verificationApi.post('/verification/products/warranty-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (event) => onProgress(Math.round((event.loaded * 100) / (event.total || 1)))
        : undefined,
    });
  },

  getWarrantyStatus: (batchId) =>
    verificationApi.get(`/verification/products/warranty/${batchId}`),

  // GET /verification/products/warranties — purpose-built warranty batch
  // list (org sees only its own; superadmin sees all with org_id/
  // organization_name on each item, already flat — no per-org grouping like
  // the generic GET /verification/batches). Returns list[WarrantyBatchListItem].
  getWarrantyBatches: () =>
    verificationApi.get('/verification/products/warranties'),

  approveRejectWarranty: (productId, status, reason = '') => {
    const payload = { status };
    if (reason) payload.reason = reason;
    return verificationApi.patch(`/verification/products/warranty/${productId}/status`, payload);
  },

  // POST /verification/products/{batch_user_id}/warranty-document — upload or
  // replace the Warranty Document for one BatchUser. Association is strictly
  // by batch_user_id (never name/serial_no/array index — duplicate names are
  // expected). Re-uploading for the same batch_user_id is how "replace" works;
  // there is no separate replace endpoint and no frontend versioning logic.
  uploadWarrantyDocument: (batchUserId, file, documentLabel) => {
    const formData = new FormData();
    formData.append('file', file);
    if (documentLabel) formData.append('document_label', documentLabel);
    return verificationApi.post(`/verification/products/${batchUserId}/warranty-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const sdcAPI = {
  // POST /sdc/batches/{batch_id}/generate — create + auto-issue in one call.
  // Body is normally just {publish, active}. org_id is fixed backend-side and
  // must NEVER be sent. space_id normally comes from the org's own
  // dhiways_details (set via authAPI.updateOwnProfile, falling back to a
  // config default) and schema_id resolves from the batch's industry — both
  // can optionally be passed here to override that resolution, but that's a
  // testing-only escape hatch, not part of the normal admin flow.
  // user_ids (optional): generate for only these BatchUser ids instead of
  // the whole eligible batch. Omit/empty to keep the original whole-batch
  // behavior — cleanObject already drops an empty array, so passing [] here
  // is always safe and never accidentally narrows the request.
  generateBatchSDC: async (batchId, payload = {}) => {
    return verificationApi.post(
      `/sdc/batches/${batchId}/generate`,
      cleanObject({
        publish: !!payload.publish,
        active: !!payload.active,
        space_id: payload.space_id?.trim(),
        schema_id: payload.schema_id?.trim(),
        user_ids: Array.isArray(payload.user_ids) ? payload.user_ids : undefined,
      })
    );
  },

  // GET /sdc/batches/{batch_id}/approvals — full history (pending, approved,
  // rejected), newest first. Org restricted to its own batches; super admin
  // can view any. Used both to show the org's "SDC Approval Requests" card
  // and the superadmin's read-only approval-status view (superadmin never
  // gets an approve/reject action — only the owning org decides).
  getSDCApprovals: (batchId) =>
    verificationApi.get(`/sdc/batches/${batchId}/approvals`),

  // POST /sdc/approvals/{request_id}/decide — org-authenticated only. A
  // super admin or a different org gets 404 (never 403 — same
  // indistinguishable-404 pattern as every other batch-scoped endpoint).
  // 409 if the request was already decided — never retry blindly on that.
  decideSDCApproval: (requestId, payload) =>
    verificationApi.post(`/sdc/approvals/${requestId}/decide`, {
      decision: payload.decision,
      ...(payload.reason?.trim() ? { reason: payload.reason.trim() } : {}),
    }),

  // GET /sdc/batches/{batch_id}/status — poll until done:true. Reports exact
  // ready/pending/total counts for this batch (unlike /sdc/records, which
  // lists the whole space and has to be filtered client-side by email).
  getBatchStatus: (batchId) =>
    verificationApi.get(`/sdc/batches/${batchId}/status`),

  // GET /sdc/records — Dhiway's paginated record list, passed through as-is.
  getRecords: ({ org_id, space_id, active = 1, page = 1, pageSize = 30, search = '' } = {}) =>
    verificationApi.get('/sdc/records', {
      params: cleanObject({ org_id, space_id, active, page, pageSize, search }),
    }),

  // GET /sdc/records/{public_id} — must use the record's publicId, not its id.
  getRecord: (publicId, instanceKey = 'de') =>
    verificationApi.get(`/sdc/records/${publicId}`, {
      params: { instance_key: instanceKey },
    }),

  // POST /sdc/batches/{batch_id}/issue — fallback only. Call this ONLY when a
  // prior generateBatchSDC() response had issue_pending: true (Dhiway hadn't
  // finished creating drafts inside generate's own ~24s wait window). Safe to
  // retry — already-issued records are never re-issued.
  // 409 = drafts still not ready — retry. 400 = generate wasn't called first.
  // 502 = Dhiway issue failed — not retried automatically.
  issueBatchSDC: async (batchId, payload = {}) => {
    return verificationApi.post(
      `/sdc/batches/${batchId}/issue`,
      cleanObject({
        send_email: !!payload.send_email,
        issuer_message: payload.issuer_message?.trim(),
        need_cc: !!payload.need_cc,
        need_admin_cc: !!payload.need_admin_cc,
        partner_name: payload.partner_name?.trim(),
        reply_to_email: payload.reply_to_email?.trim(),
        cc_email: payload.cc_email?.trim(),
      })
    );
  },
};

export const verifiersAPI = {
  getAll: () => api.get('/verifiers'),
  // Only verifiers whose own `specialization` array includes this type —
  // used to filter the Smart Send picker so an admin can't assign a
  // verification type to a verifier who doesn't actually handle it.
  getByType: (verificationType) =>
    api.get('/verifiers', { params: verificationType ? { verification_type: verificationType } : undefined }),
  create: (payload) => api.post('/verifiers', cleanObject(payload)),
  getById: (id) => api.get(`/verifiers/${id}`),
  update: (id, payload) => api.patch(`/verifiers/${id}`, cleanObject(payload)),
  delete: (id) => api.delete(`/verifiers/${id}`),
};

export const skillsAPI = {
  addSkill: (data) => {
    const formData = new FormData();
    formData.append('skill_type', data.skill_type);
    formData.append('skill_name', data.skill_name);
    if (data.skill_info) formData.append('skill_info', data.skill_info);
    if (data.institution_name) formData.append('institution_name', data.institution_name);
    if (data.degree) formData.append('degree', data.degree);
    if (data.document_label) formData.append('document_label', data.document_label);
    if (data.files && data.files.length > 0) {
      Array.from(data.files).forEach((file) => formData.append('files', file));
    }
    return api.post('/skills/add', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getMySkills: () => api.get('/skills/me'),

  uploadDocument: (skillId, documentLabel, file) => {
    const formData = new FormData();
    formData.append('document_label', documentLabel);
    formData.append('file', file);
    return api.post(`/skills/${skillId}/upload-doc`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getIndividualSkills: (individualId) => api.get(`/skills/${individualId}`),

  getAllSkills: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.skill_type) query.append('skill_type', params.skill_type);
    const qs = query.toString();
    return api.get(`/skills/all/list${qs ? `?${qs}` : ''}`);
  },

  editSkill: (skillId, payload) =>
    api.patch(
      `/skills/${skillId}/edit`,
      cleanObject({
        skill_name: payload.skill_name,
        skill_info: payload.skill_info,
        institution_name: payload.institution_name,
        degree: payload.degree,
      })
    ),

  updateSkillStatus: (skillId, status, reason) =>
    api.patch(`/skills/${skillId}/status`, cleanObject({ status, reason })),

  sendVerificationRequest: (skillId, verifierEmail) =>
    api.post(`/skills/${skillId}/verify/request`, { verifier_email: verifierEmail }),

  resendVerificationLink: (requestId) =>
    api.post(`/skills/verify/resend/${requestId}`),

  uploadVerifierReport: (token, files, status, reason) => {
    const formData = new FormData();
    formData.append('status', status); // "verified" | "rejected"
    if (reason && reason.trim()) formData.append('reason', reason.trim());
    Array.from(files).forEach((file) => formData.append('files', file));
    return axios.post(`${API_BASE_URL}/skills/verify/upload/${token}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteSkill: (skillId) => api.delete(`/skills/${skillId}`),

  deleteAllSkills: (individualId) => api.delete(`/skills/all/${individualId}`),

  // DELETE /skills/{skill_id}/documents/{document_id} — the skill's own
  // owner or superadmin. Removes one uploaded supporting document without
  // touching the skill itself.
  deleteDocument: (skillId, documentId) =>
    api.delete(`/skills/${skillId}/documents/${documentId}`),
};

export const healthCheck = () => api.get('/health');

export const tokenHelpers = {
  save: (token) => {
    localStorage.setItem('access_token', token);
    localStorage.removeItem('trumarkz_access_token');
  },
  saveAuthData: ({ access_token, user_id, user_type, email }) => {
    if (access_token) tokenHelpers.save(access_token);
    if (user_id) localStorage.setItem('user_id', user_id);
    if (user_type) localStorage.setItem('user_type', user_type);
    if (email) localStorage.setItem('email', email);
  },
  remove: clearAuthStorage,
  get: getStoredToken,
};

// Validation responses carry the specifics in an `errors` list beside a generic `message`
// (e.g. {"message": "Invalid schema configuration", "errors": [...]}). Showing only the message
// hides which field was wrong, so the list is appended whenever the server sends one.
const appendErrors = (message, errors) => {
  const items = (Array.isArray(errors) ? errors : [])
    .map((e) => (typeof e === 'string' ? e : e?.msg || e?.message || ''))
    .filter(Boolean);
  if (!items.length) return message;
  return message ? `${message}: ${items.join('; ')}` : items.join('; ');
};

// Unexpected 500s carry {"detail": "Internal server error", "error_id": "<12 hex>"}; the id is
// what support needs to find the log line, so it is always shown alongside the message.
const withErrorId = (message, data) => (
  data?.error_id ? `${message} (Error ID: ${data.error_id})` : message
);

const readApiError = (data, fallback) => {
  const detail = data?.detail;
  if (typeof detail === 'string') return appendErrors(detail, data?.errors);
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || item?.message).filter(Boolean).join('. ') || fallback;
  }
  if (detail && typeof detail === 'object') return appendErrors(detail.message || detail.error || '', detail.errors) || fallback;
  return appendErrors(data?.message || '', data?.errors) || fallback;
};

export const getApiError = (err, fallback = 'Something went wrong. Please try again.') => {
  const data = err?.response?.data;
  return withErrorId(readApiError(data, fallback), data);
};

// ── Human Secure Certificate Access (web change report §4) ───────────────
// Visitor and holder pages have no account: requests go out with no session
// at all, so an org user testing them is never mistaken for the holder.
const publicVerificationApi = axios.create({ baseURL: VERIFICATION_BASE_URL, timeout: 30000 });
const REPORT_ORIGINS = [VERIFICATION_BASE_URL, API_BASE_URL];

export const reportApiBaseUrl = VERIFICATION_BASE_URL;

export const certificateAccessAPI = {
  // Organization (own batches) / SuperAdmin (any batch).
  getBatchAccess: (batchId) =>
    verificationApi.get(`/verification/batches/${encodeURIComponent(batchId)}/certificate-access`),
  setBatchAccessMode: (batchId, mode) =>
    verificationApi.put(`/verification/batches/${encodeURIComponent(batchId)}/certificate-access`, { mode }),
  revokeGrant: (batchId, grantId) =>
    verificationApi.post(`/verification/batches/${encodeURIComponent(batchId)}/certificate-access/grants/${encodeURIComponent(grantId)}/revoke`),

  // Visitor (§4d).
  requestAccess: (body) =>
    publicVerificationApi.post('/verification/certificate-access/requests', body),
  verifyRequest: (requestId, otpCode) =>
    publicVerificationApi.post(`/verification/certificate-access/requests/${encodeURIComponent(requestId)}/verify`, { otp_code: otpCode }),
  getRequestStatus: (requestId, accessToken) =>
    publicVerificationApi.get(`/verification/certificate-access/requests/${encodeURIComponent(requestId)}/status`, {
      headers: { 'X-Certificate-Access-Token': accessToken },
    }),

  // Holder (§4e).
  getApproval: (token) =>
    publicVerificationApi.get(`/verification/certificate-access/approvals/${encodeURIComponent(token)}`),
  decideApproval: (token, body) =>
    publicVerificationApi.post(`/verification/certificate-access/approvals/${encodeURIComponent(token)}`, body),
};

// Fetch a report with the signed-in session (or a visitor token) — only ever sent
// to TruMarkZ's own report routes, never to storage or any other host.
export const fetchReportBlob = (url, { accessToken, signal } = {}) =>
  fetchReport(url, { sessionToken: accessToken ? undefined : getStoredToken(), accessToken, allowedOrigins: REPORT_ORIGINS, signal });

export const reportRequestHeaders = (url) =>
  reportAuthHeaders(url, { sessionToken: getStoredToken(), allowedOrigins: REPORT_ORIGINS });

// Opens a report in a new tab. On a holder_approval batch a plain link has no
// session and gets 403, so TruMarkZ report routes are fetched with the session
// and shown as a blob; anything else opens directly, as before. The tab is
// opened synchronously so the browser doesn't treat it as a pop-up.
export const openReport = async (url) => {
  if (!isGatedReportUrl(url, REPORT_ORIGINS)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const tab = window.open('', '_blank');
  if (tab) {
    tab.opener = null;
    tab.document.title = 'Loading report…';
    tab.document.body.style.font = '14px system-ui, sans-serif';
    tab.document.body.textContent = 'Loading report…';
  }
  try {
    const blob = await fetchReportBlob(url);
    const objectUrl = URL.createObjectURL(blob);
    if (tab) tab.location.href = objectUrl;
    else window.open(objectUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    // Keep denied report content protected, but give visitors the existing
    // email/OTP/holder-approval flow rather than a dead-end report error.
    if (error?.status === 403 && /holder.*approv|approval.required/i.test(error.message || '')) {
      const entryPath = certificateAccessPath(url);
      if (entryPath) {
        if (tab && !tab.closed) tab.location.href = entryPath;
        else window.location.assign(entryPath);
        return;
      }
    }
    tab?.close();
    throw error;
  }
};

export const triggerBlobDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export default api;
