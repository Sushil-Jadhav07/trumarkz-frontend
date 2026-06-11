import axios from 'axios';

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
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      clearAuthStorage();
      if (window.location.pathname !== '/login') window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

verificationApi.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    const isPublicUpload =
      config.url?.includes('/verification/upload/photo') ||
      config.url?.includes('/verification/upload/document') ||
      config.url?.includes('/verification/categories') ||
      config.url?.includes('/verification/manual/upload/');

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
    const isPublicRoute = error.config?.url?.includes('/verification/manual/upload/');
    if (error.response?.status === 401 && !isPublicRoute) {
      clearAuthStorage();
      if (window.location.pathname !== '/login') window.location.replace('/login');
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
    }),

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
  promoteSuperAdmin: (email) => api.post('/auth/promote-super-admin', { email }),
  createSuperAdmin: (payload) => api.post('/auth/create-super-admin', payload),
  getOrganizationIndustryType: (orgId) => api.get(`/auth/organization/${orgId}/industry-type`),
  getAuditLogs: (batchUserId) => api.get(`/auth/audit-logs/${batchUserId}`),
};

export const orgAPI = {};

export const adminAPI = {
  getUsersGrouped: authAPI.getUsersGrouped,
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
  getCategories: () => verificationApi.get('/verification/categories'),

  uploadSingleHuman: (data) =>
    verificationApi.post(
      '/verification/single/human',
      cleanObject({
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
      })
    ),

  uploadSingleProduct: (data) =>
    verificationApi.post(
      '/verification/single/product',
      cleanObject({
        category_id: data.category_id,
        product_name: data.product_name?.trim(),
        custom_fields: data.custom_fields || {},
        verification_types: data.verification_types,
        credential_visibility: data.credential_visibility,
        template_id: data.template_id,
      })
    ),

  bulkUpload: (file, batchName, description = '', maybeOptions, maybeProgress) => {
    const formData = new FormData();
    const { options, onProgress } = normalizeUploadArgs(maybeOptions, maybeProgress);

    formData.append('file', file);
    formData.append('batch_name', batchName);
    appendFormValue(formData, 'description', description);
    appendFormValue(formData, 'industry_type', options.industryType || options.industry_type);
    appendFormValue(formData, 'verification_types', options.verificationTypes || options.verification_types);
    appendFormValue(
      formData,
      'credential_visibility',
      options.credentialVisibility || options.credential_visibility
    );
    appendFormValue(formData, 'template_id', options.templateId || options.template_id);

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
    categoryId,
    description = '',
    maybeOptions,
    maybeProgress
  ) => {
    const formData = new FormData();
    const { options, onProgress } = normalizeUploadArgs(maybeOptions, maybeProgress);

    formData.append('file', file);
    formData.append('batch_name', batchName);
    appendFormValue(formData, 'description', description);
    appendFormValue(formData, 'category_id', categoryId || options.categoryId || options.category_id);
    appendFormValue(
      formData,
      'credential_visibility',
      options.credentialVisibility || options.credential_visibility
    );
    appendFormValue(formData, 'verification_types', options.verificationTypes || options.verification_types);
    appendFormValue(formData, 'template_id', options.templateId || options.template_id);

    return verificationApi.post('/verification/bulk-upload/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (event) => onProgress(Math.round((event.loaded * 100) / (event.total || 1)))
        : undefined,
    });
  },

  generateHumanTemplate: (headers, verificationTypes = []) => {
    const formData = new FormData();
    appendFormValue(formData, 'headers', Array.isArray(headers) ? headers.join(',') : headers);
    appendFormValue(
      formData,
      'verification_types',
      Array.isArray(verificationTypes) ? verificationTypes.join(',') : verificationTypes
    );

    return verificationApi.post('/verification/generate-human-template', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    });
  },

  generateProductTemplate: (categoryId, headers) => {
    const formData = new FormData();
    appendFormValue(formData, 'category_id', categoryId);
    appendFormValue(formData, 'headers', Array.isArray(headers) ? headers.join(',') : headers);

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

  updateVerificationStatus: (userId, status, reason = null) => {
    const payload = {};
    if (status != null) payload.status = status;
    if (reason != null && reason !== '') payload.reason = reason;
    return verificationApi.patch(`/verification/user/${userId}/status`, payload);
  },

  generateQRAndCertificate: (userId) =>
    verificationApi.post(`/verification/user/${userId}/generate-qr`),

  getBatches: () => verificationApi.get('/verification/batches'),
  getBatchDetails: (batchId) => verificationApi.get(`/verification/batches/${batchId}`),

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
  requestManualVerification: (payload) =>
    verificationApi.post('/verification/verification/manual/request', payload),

  // Verifier uploads report files against the token
  // Let Axios auto-set Content-Type with correct multipart boundary
  uploadManualReport: (token, files) => {
    const formData = new FormData();
    Array.from(files || []).forEach((file) => formData.append('files', file));
    return verificationApi.post(`/verification/manual/upload/${token}`, formData);
  },

  patchVerificationType: (id, payload) => verificationApi.patch(`/verification/verification-types/${id}`, payload),

  createTemplate: (payload) => verificationApi.post('/verification/templates', payload),
  getTemplate: (templateId) => verificationApi.get(`/verification/templates/${templateId}`),
  updateTemplate: (templateId, payload) =>
    verificationApi.put(`/verification/templates/${templateId}`, payload),
  getTemplateHistory: (templateId) =>
    verificationApi.get(`/verification/templates/${templateId}/history`),
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

export const getApiError = (err, fallback = 'Something went wrong. Please try again.') => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || item?.message).filter(Boolean).join('. ') || fallback;
  }
  if (detail && typeof detail === 'object') return detail.message || detail.error || fallback;
  return err?.response?.data?.message || fallback;
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
