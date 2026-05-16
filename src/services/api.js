import axios from 'axios';

// ─── Base Configuration ───────────────────────────────────────────────────────
const DEFAULT_API_BASE_URL = 'https://trumarkz-api-54038467488.asia-south1.run.app';
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
const VERIFICATION_BASE_URL = import.meta.env.VITE_VERIFICATION_API_URL || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

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

  // ── Product Categories ──────────────────────────────────────────────────────
  /**
   * GET /verification/categories
   * Public endpoint - no auth required.
   * Returns all product categories with warranty support settings.
   */
  getCategories: () =>
    verificationApi.get('/verification/categories'),

  // ── Single Human ────────────────────────────────────────────────────────────
  /**
   * POST /verification/single/human
   * Upload a single human for verification.
   * Required: full_name, phone_number, email
   * @param {object} data
   */
  uploadSingleHuman: (data) =>
    verificationApi.post('/verification/single/human', {
      full_name: data.full_name?.trim(),
      dob: data.dob || undefined,
      phone_number: data.phone_number?.trim(),
      email: data.email?.trim(),
      aadhar_number: data.aadhar_number?.trim() || undefined,
      pan_number: data.pan_number?.trim() || undefined,
      address_line1: data.address_line1?.trim() || undefined,
      address_line2: data.address_line2?.trim() || undefined,
      address_line3: data.address_line3?.trim() || undefined,
      pincode: data.pincode?.trim() || undefined,
      state: data.state?.trim() || undefined,
      country: data.country?.trim() || undefined,
    }),

  // ── Single Product ──────────────────────────────────────────────────────────
  /**
   * POST /verification/single/product
   * Upload a single product for verification.
   * Required: category_id, product_name
   * @param {object} data
   */
  uploadSingleProduct: (data) =>
    verificationApi.post('/verification/single/product', {
      category_id: data.category_id,
      product_name: data.product_name?.trim(),
      custom_fields: data.custom_fields || {},
    }),

  // ── Bulk Upload (Human) ─────────────────────────────────────────────────────
  /**
   * POST /verification/bulk-upload
   * Organization bulk uploads user details with batch_id.
   * Creates invite tokens for each user.
   * @param {object} payload  { batch_name, description, users: [...] }
   */
  bulkUploadHumans: (payload) =>
    verificationApi.post('/verification/bulk-upload', {
      batch_name: payload.batch_name,
      description: payload.description || '',
      users: payload.users,
    }),

  /**
   * POST /verification/bulk-upload  (legacy file-based wrapper kept for compat)
   * @param {File}     file
   * @param {string}   batchName
   * @param {string}   [description]
   * @param {function} [onProgress]
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

  // ── Bulk Upload Products (Excel) ────────────────────────────────────────────
  /**
   * POST /verification/bulk-upload/products
   * Upload multiple products from Excel file with dynamic custom fields.
   * First row must be headers.
   * @param {File}     file
   * @param {string}   batchName
   * @param {string}   categoryId
   * @param {string}   [description]
   * @param {function} [onProgress]
   */
  bulkUploadProducts: (file, batchName, categoryId, description = '', onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('batch_name', batchName);
    formData.append('category_id', categoryId);
    if (description) formData.append('description', description);
    return verificationApi.post('/verification/bulk-upload/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || 1)))
        : undefined,
    });
  },

  // ── Generate Product Excel Template ────────────────────────────────────────
  /**
   * POST /verification/products/template
   * Generate an Excel template for bulk product upload.
   * @param {string}   categoryId
   * @param {string[]} headers  - column names
   */
  generateProductTemplate: (categoryId, headers) => {
    const formData = new FormData();
    formData.append('category_id', categoryId);
    formData.append('headers', Array.isArray(headers) ? headers.join(',') : headers);
    return verificationApi.post('/verification/products/template', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    });
  },

  // ── Document & Photo Upload ─────────────────────────────────────────────────
  /**
   * POST /verification/upload/photo
   * Auth: NOT required (uses invite token).
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

  // ── Query / Status ──────────────────────────────────────────────────────────
  /**
   * GET /verification/all
   * Auth: Required.
   */
  getAllVerifications: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.orgId)       params.append('org_id',   filters.orgId);
    if (filters.batchId)     params.append('batch_id', filters.batchId);
    if (filters.status)      params.append('status',   filters.status);
    if (filters.entityType)  params.append('entity_type', filters.entityType);
    if (filters.categoryId)  params.append('category_id', filters.categoryId);
    if (filters.limit != null)  params.append('limit',  String(filters.limit));
    if (filters.offset != null) params.append('offset', String(filters.offset));
    const q = params.toString();
    return verificationApi.get(`/verification/all${q ? `?${q}` : ''}`);
  },

  /**
   * GET /verification/user/:userId
   */
  getUserVerification: (userId) =>
    verificationApi.get(`/verification/user/${userId}`),

  /**
   * PATCH /verification/user/:userId/status
   * If status not provided, mock verification is performed (80-20 split).
   */
  updateVerificationStatus: (userId, status, reason = null) =>
    verificationApi.patch(`/verification/user/${userId}/status`, {
      status,
      reason: reason || null,
    }),

  /**
   * POST /verification/user/:userId/generate-qr
   * Only works for verified users.
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
