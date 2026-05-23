import axios from 'axios';

// ─── Base Configuration ───────────────────────────────────────────────────────
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
  '/auth/login', '/auth/signup/individual', '/auth/signup/organization',
  '/auth/verify-otp', '/auth/resend-otp', '/auth/forgot-password', '/auth/reset-password',
  '/auth/google/url', '/auth/google',
];

const isPublicAuthEndpoint = (url = '') =>
  PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

const clearAuthStorage = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_type');
  localStorage.removeItem('email');
  localStorage.removeItem('trumarkz_access_token');
  localStorage.removeItem('trumarkz_user');
};

const buildUseCasesPayload = (useCases = {}) => {
  return useCases;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('trumarkz_access_token');
  if (token && !isPublicAuthEndpoint(config.url)) { config.headers.Authorization = `Bearer ${token}`; }
  else if (config.headers?.Authorization) { delete config.headers.Authorization; }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => response, (error) => {
  const isLoginRequest = error.config?.url?.includes('/auth/login');
  if (error.response?.status === 401 && !isLoginRequest) {
    clearAuthStorage();
    if (window.location.pathname !== '/login') window.location.replace('/login');
  }
  return Promise.reject(error);
});

verificationApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('trumarkz_access_token');
  const isPublicUpload = config.url?.includes('/verification/upload/photo') || config.url?.includes('/verification/upload/document');
  if (token && !isPublicUpload) { config.headers.Authorization = `Bearer ${token}`; }
  return config;
}, (error) => Promise.reject(error));

verificationApi.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) {
    clearAuthStorage();
    if (window.location.pathname !== '/login') window.location.replace('/login');
  }
  return Promise.reject(error);
});

export const authAPI = {
  // ── Signup ──────────────────────────────────────────────────────────────────
  signupOrganization: (data) => api.post('/auth/signup/organization', {
    org_name: data.orgName.trim(),
    email: data.email.trim(),
    phone_number: data.phoneNumber ? data.phoneNumber.trim() : undefined,
    password: data.password,
  }),

  signupIndividual: (data) => api.post('/auth/signup/individual', {
    full_name: data.fullName.trim(),
    email: data.email.trim(),
    phone_number: data.phoneNumber ? data.phoneNumber.trim() : undefined,
    password: data.password,
  }),

  // ── OTP ─────────────────────────────────────────────────────────────────────
  verifyOTP: (email, otpCode) => api.post('/auth/verify-otp', {
    email,
    otp_code: otpCode,
  }),
  verifyOtp: (email, otpCode) => api.post('/auth/verify-otp', {
    email,
    otp_code: otpCode,
  }),

  resendOTP: (email) => api.post('/auth/resend-otp', { email }),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }),

  // ── Login ────────────────────────────────────────────────────────────────────
  login: (emailOrMobile, password, loginType, rememberMe = false) => {
    if (loginType) {
      return api.post('/auth/login', {
        login_type: loginType,
        email_or_mobile: emailOrMobile,
        password,
        remember_me: rememberMe,
      });
    }
    return api.post('/auth/login', { email: emailOrMobile, password });
  },

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  getGoogleAuthUrl: (userType) => api.get('/auth/google/url', {
    params: userType ? { user_type: userType } : undefined,
  }),
  googleAuth: (token, userType) => api.post('/auth/google', { token }, {
    params: userType ? { user_type: userType } : undefined,
  }),
  googleAuthMobile: (token, userType) => api.post('/auth/google', { token }, {
    params: userType ? { user_type: userType } : undefined,
  }),
  completeGoogleSignup: (userType) => api.post('/auth/complete-google-signup', userType ? { user_type: userType } : {}),

  // ── Onboarding ───────────────────────────────────────────────────────────────
  completeOnboarding: (data) => api.post('/auth/onboarding', {
    industry_type: data.industryType,
    gstin: data.gstin,
    business_reg_number: data.businessRegNumber,
    address_line1: data.addressLine1,
    address_line2: data.addressLine2 || undefined,
    address_line3: data.addressLine3 || undefined,
    use_cases: buildUseCasesPayload(data.useCases),
  }),

  // ── User / Profile ────────────────────────────────────────────────────────────
  getCurrentUser: () => api.get('/auth/me'),
  getMe: () => api.get('/auth/me'),

  // ── Password ─────────────────────────────────────────────────────────────────
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, otpCode, newPassword) => api.post('/auth/reset-password', {
    email,
    otp_code: otpCode,
    new_password: newPassword,
  }),
};

export const orgAPI = {
  assignIndividual: (emailOrMobile) => api.post('/auth/org/assign-individual', { individual_email_or_mobile: emailOrMobile }),
  inviteIndividual: (email, mobile) => api.post('/auth/org/invite-individual', { email: email || undefined, mobile: mobile || undefined }),
  getAssignedIndividuals: () => api.get('/auth/org/individuals'),
};

export const verificationAPI = {
  getCategories: () => verificationApi.get('/verification/categories'),

  uploadSingleHuman: (data) => verificationApi.post('/verification/single/human', {
    full_name: data.full_name?.trim(), dob: data.dob || undefined, phone_number: data.phone_number?.trim(),
    email: data.email?.trim(), aadhar_number: data.aadhar_number?.trim() || undefined, pan_number: data.pan_number?.trim() || undefined,
    address_line1: data.address_line1?.trim() || undefined, address_line2: data.address_line2?.trim() || undefined,
    address_line3: data.address_line3?.trim() || undefined, pincode: data.pincode?.trim() || undefined,
    state: data.state?.trim() || undefined, country: data.country?.trim() || undefined,
  }),

  uploadSingleProduct: (data) => verificationApi.post('/verification/single/product', {
    category_id: data.category_id, product_name: data.product_name?.trim(), custom_fields: data.custom_fields || {},
  }),

  bulkUploadHumans: (payload) => verificationApi.post('/verification/bulk-upload', {
    batch_name: payload.batch_name, description: payload.description || '', users: payload.users,
  }),

  bulkUpload: (file, batchName, description = '', onProgress) => {
    const formData = new FormData();
    formData.append('file', file); formData.append('batch_name', batchName);
    if (description) formData.append('description', description);
    return verificationApi.post('/verification/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || 1))) : undefined,
    });
  },

  bulkUploadProducts: (file, batchName, categoryId, description = '', onProgress) => {
    const formData = new FormData();
    formData.append('file', file); formData.append('batch_name', batchName); formData.append('category_id', categoryId);
    if (description) formData.append('description', description);
    return verificationApi.post('/verification/bulk-upload/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || 1))) : undefined,
    });
  },

  generateProductTemplate: (categoryId, headers) => {
    const formData = new FormData();
    formData.append('category_id', categoryId);
    formData.append('headers', Array.isArray(headers) ? headers.join(',') : headers);
    return verificationApi.post('/verification/products/template', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob',
    });
  },

  uploadPhoto: (inviteToken, file) => {
    const formData = new FormData();
    formData.append('token', inviteToken); formData.append('file', file);
    return verificationApi.post('/verification/upload/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  uploadDocument: (inviteToken, documentLabel, file) => {
    const formData = new FormData();
    formData.append('token', inviteToken); formData.append('document_label', documentLabel); formData.append('file', file);
    return verificationApi.post('/verification/upload/document', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  getAllVerifications: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.orgId) params.append('org_id', filters.orgId);
    if (filters.batchId) params.append('batch_id', filters.batchId);
    if (filters.status) params.append('status', filters.status);
    if (filters.entityType) params.append('entity_type', filters.entityType);
    if (filters.categoryId) params.append('category_id', filters.categoryId);
    if (filters.limit != null) params.append('limit', String(filters.limit));
    if (filters.offset != null) params.append('offset', String(filters.offset));
    const q = params.toString();
    return verificationApi.get(`/verification/all${q ? `?${q}` : ''}`);
  },

  getUserVerification: (userId) => verificationApi.get(`/verification/user/${userId}`),
  updateVerificationStatus: (userId, status, reason = null) =>
    verificationApi.patch(`/verification/user/${userId}/status`, { status, reason: reason || null }),
  generateQRAndCertificate: (userId) =>
    verificationApi.post(`/verification/user/${userId}/generate-qr`),
  updateBatchStatus: (batchId, status) =>
    verificationApi.patch(`/verification/batch/${batchId}/status`, { status }),
  sendVerifierEmail: (batchId, verifierEmail = null) =>
    verificationApi.post(`/verification/batch/${batchId}/notify-verifier`, { verifier_email: verifierEmail || undefined }),
  uploadBatchVerifiedDocument: (batchId, file, type = 'document', onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', type);
    return verificationApi.post(`/verification/batch/${batchId}/upload-verified-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || 1))) : undefined,
    });
  },
  downloadBatchVerifiedDocument: (batchId) =>
    verificationApi.get(`/verification/batch/${batchId}/download-verified-document`, { responseType: 'blob' }),
  downloadBatchVerifiedReport: (batchId) =>
    verificationApi.get(`/verification/batch/${batchId}/download-verified-report`, { responseType: 'blob' }),
  generateBatchAssets: async (batchId, userIds = []) => {
    try {
      return await verificationApi.post(`/verification/batch/${batchId}/generate-assets`);
    } catch (err) {
      if ([404, 405, 501].includes(err?.response?.status)) {
        const results = await Promise.allSettled(
          userIds.map((uid) =>
            verificationApi.post(`/verification/user/${uid}/generate-qr`).then((res) => ({ user_id: uid, ...res.data }))
          )
        );
        const assets = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
        return { data: { assets, total: assets.length } };
      }
      throw err;
    }
  },
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
  get: () => localStorage.getItem('access_token') || localStorage.getItem('trumarkz_access_token'),
};

export const getApiError = (err, fallback = 'Something went wrong. Please try again.') => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) { return detail.map((d) => d?.msg || d?.message).filter(Boolean).join('. ') || fallback; }
  if (detail && typeof detail === 'object') return detail.message || detail.error || fallback;
  return err?.response?.data?.message || fallback;
};

export const triggerBlobDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = fileName;
  document.body.appendChild(anchor); anchor.click();
  document.body.removeChild(anchor); URL.revokeObjectURL(url);
};

export default api;
