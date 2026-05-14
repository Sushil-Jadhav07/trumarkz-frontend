import axios from 'axios';

// ─── Base Configuration ───────────────────────────────────────────────────────
const DEFAULT_API_BASE_URL = 'https://trumarkz-api-54038467488.asia-south1.run.app';
const AUTH_BASE_URL = DEFAULT_API_BASE_URL;
const VERIFICATION_BASE_URL = DEFAULT_API_BASE_URL;

// ─── Auth API instance ────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ─── Verification API instance ────────────────────────────────────────────────
const verificationApi = axios.create({
  baseURL: VERIFICATION_BASE_URL,
  timeout: 60000,
});

const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register/individual',
  '/auth/register/organization',
  '/auth/verify-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
];

const isPublicAuthEndpoint = (url = '') =>
  PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

const normalizeMobile = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  return digits || undefined;
};

const optionalString = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed || undefined;
};

// ─── Auth interceptors ────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trumarkz_access_token');
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
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('trumarkz_access_token');
      localStorage.removeItem('trumarkz_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Verification interceptors ────────────────────────────────────────────────
verificationApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trumarkz_access_token');
    const isPublicUpload =
      config.url?.includes('/verification/upload/photo') ||
      config.url?.includes('/verification/upload/document');
    if (token && !isPublicUpload) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

verificationApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('trumarkz_access_token');
      localStorage.removeItem('trumarkz_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  registerIndividual: (data) =>
    api.post('/auth/register/individual', {
      full_name: data.fullName.trim(),
      email: data.email.trim(),
      mobile: normalizeMobile(data.mobile),
      address: optionalString(data.address),
      password: data.password,
    }),

  registerOrganization: (data) =>
    api.post('/auth/register/organization', {
      organization_name: data.orgName.trim(),
      gst_number: optionalString(data.gstNumber),
      business_registration_number: optionalString(data.businessRegNo),
      address: optionalString(data.address),
      email: data.email.trim(),
      mobile: normalizeMobile(data.mobile),
      password: data.password,
    }),

  verifyOTP: (identifier, otpCode, purpose = 'registration') =>
    api.post('/auth/verify-otp', { identifier, otp_code: otpCode, purpose }),

  login: (emailOrMobile, password, loginType, rememberMe = false) =>
    api.post('/auth/login', {
      login_type: loginType,
      email_or_mobile: emailOrMobile,
      password,
      remember_me: rememberMe,
    }),

  forgotPassword: (emailOrMobile) =>
    api.post('/auth/forgot-password', { email_or_mobile: emailOrMobile }),

  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', { token, new_password: newPassword }),

  getCurrentUser: () => api.get('/auth/me'),
};

// ─── Organization API ─────────────────────────────────────────────────────────
export const orgAPI = {
  assignIndividual: (emailOrMobile) =>
    api.post('/auth/org/assign-individual', {
      individual_email_or_mobile: emailOrMobile,
    }),

  inviteIndividual: (email, mobile) =>
    api.post('/auth/org/invite-individual', {
      email: email || undefined,
      mobile: mobile || undefined,
    }),

  getAssignedIndividuals: () => api.get('/auth/org/individuals'),
};

// ─── Verification API ─────────────────────────────────────────────────────────
export const verificationAPI = {
  /**
   * POST /verification/bulk-upload
   * Upload Excel file to create a batch. Auth: Required (org only).
   * @param {File}     file
   * @param {string}   batchName
   * @param {string}   [description]
   * @param {function} [onProgress]  - callback(percent: number)
   */
  bulkUpload: (file, batchName, description = '', onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('batch_name', batchName);
    if (description) formData.append('description', description);
    return verificationApi.post('/verification/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || 1)))
        : undefined,
    });
  },

  /**
   * POST /verification/upload/photo
   * Auth: NOT required (uses invite token).
   * @param {string} inviteToken
   * @param {File}   file  - image file
   */
  uploadPhoto: (inviteToken, file) => {
    const formData = new FormData();
    formData.append('token', inviteToken);
    formData.append('file', file);
    return verificationApi.post('/verification/upload/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * POST /verification/upload/document
   * Auth: NOT required (uses invite token).
   * Re-uploading the same label increments the version number.
   * @param {string} inviteToken
   * @param {string} documentLabel - 'aadhar' | 'pan' | 'degree_certificate' | 'driving_license' | custom
   * @param {File}   file
   */
  uploadDocument: (inviteToken, documentLabel, file) => {
    const formData = new FormData();
    formData.append('token', inviteToken);
    formData.append('document_label', documentLabel);
    formData.append('file', file);
    return verificationApi.post('/verification/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * GET /verification/all
   * Auth: Required.
   * @param {object}  [filters]
   * @param {string}  [filters.orgId]
   * @param {string}  [filters.batchId]
   * @param {'pending_verification'|'verified'|'failed'} [filters.status]
   * @param {number}  [filters.limit]   default 100
   * @param {number}  [filters.offset]  default 0
   */
  getAllVerifications: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.orgId)       params.append('org_id',   filters.orgId);
    if (filters.batchId)     params.append('batch_id', filters.batchId);
    if (filters.status)      params.append('status',   filters.status);
    if (filters.limit != null)  params.append('limit',  String(filters.limit));
    if (filters.offset != null) params.append('offset', String(filters.offset));
    const q = params.toString();
    return verificationApi.get(`/verification/all${q ? `?${q}` : ''}`);
  },

  /**
   * GET /verification/user/:userId
   * Auth: Required.
   * @param {string} userId - UUID
   */
  getUserVerification: (userId) =>
    verificationApi.get(`/verification/user/${userId}`),

  /**
   * PATCH /verification/user/:userId/status
   * Auth: Required (Superadmin).
   * @param {string} userId
   * @param {'verified'|'failed'|'pending_verification'} status
   * @param {string} [reason] - Required when status is 'failed'
   */
  updateVerificationStatus: (userId, status, reason = null) =>
    verificationApi.patch(`/verification/user/${userId}/status`, {
      status,
      reason: reason || null,
    }),

  /**
   * POST /verification/user/:userId/generate-qr
   * Auth: Required. Only works for verified users.
   * @param {string} userId
   */
  generateQRAndCertificate: (userId) =>
    verificationApi.post(`/verification/user/${userId}/generate-qr`),
};

// ─── Health Check ─────────────────────────────────────────────────────────────
export const healthCheck = () => api.get('/health');

// ─── Token Helpers ────────────────────────────────────────────────────────────
export const tokenHelpers = {
  save: (token) => localStorage.setItem('trumarkz_access_token', token),
  remove: () => localStorage.removeItem('trumarkz_access_token'),
  get: () => localStorage.getItem('trumarkz_access_token'),
};

// ─── Error extractor ──────────────────────────────────────────────────────────
export const getApiError = (err, fallback = 'Something went wrong. Please try again.') => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d?.msg || d?.message).filter(Boolean).join('. ') || fallback;
  }
  if (detail && typeof detail === 'object') return detail.message || detail.error || fallback;
  return err?.response?.data?.message || fallback;
};

export default api;
