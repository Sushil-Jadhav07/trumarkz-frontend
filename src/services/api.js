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
  promoteSuperAdmin: (email) => api.post('/auth/promote-super-admin', { email }),
  createSuperAdmin: (payload) => api.post('/auth/create-super-admin', payload),
  getOrganizationIndustryType: (orgId) => api.get(`/auth/organization/${orgId}/industry-type`),
  getAuditLogs: (batchUserId) => api.get(`/auth/audit-logs/${batchUserId}`),
};

export const orgAPI = {};

export const adminAPI = {
  getUsersGrouped: authAPI.getUsersGrouped,
  getAllUsers: authAPI.getAllUsers,
  createUser: authAPI.createUser,
  updateUser: authAPI.updateUser,
  deactivateUser: authAPI.deactivateUser,
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
  getIndustryTypes: () => verificationApi.get('/verification/industry-types'),

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
    industryType,
    description = '',
    maybeOptions,
    maybeProgress
  ) => {
    const formData = new FormData();
    const { options, onProgress } = normalizeUploadArgs(maybeOptions, maybeProgress);

    formData.append('file', file);
    formData.append('batch_name', batchName);
    appendFormValue(formData, 'description', description);
    appendFormValue(formData, 'industry_type', industryType || options.industryType || options.industry_type);
    appendFormValue(
      formData,
      'credential_visibility',
      options.credentialVisibility || options.credential_visibility
    );
    appendFormValue(formData, 'verification_types', options.verificationTypes || options.verification_types);
    appendFormValue(formData, 'template_id', options.templateId || options.template_id);

    // Document attachments — doc_files must be appended individually (not joined)
    const docNames  = options.docProductNames || options.doc_product_names;
    const docLabels = options.docLabels       || options.doc_labels;
    const docFiles  = options.docFiles        || options.doc_files;

    if (Array.isArray(docNames)  && docNames.length  > 0) formData.append('doc_product_names', docNames.join(','));
    if (Array.isArray(docLabels) && docLabels.length > 0) formData.append('doc_labels', docLabels.join(','));
    if (Array.isArray(docFiles))  docFiles.forEach((f) => formData.append('doc_files', f));

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

  generateProductTemplate: (headers) => {
    const formData = new FormData();
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

  // Check whether a manual upload token is still valid / already used
  checkManualUploadToken: (token) =>
    verificationApi.get(`/verification/manual/upload/${token}`),

  // Verifier uploads report files against the token
  // Let Axios no-set Content-Type with correct multipart boundary
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

  // ── Third-party verifiers ──────────────────────────────────────────────────
  getThirdPartyVerifiers: (batchId) =>
    verificationApi.get(`/verification/batches/${batchId}/third-party-verifiers`),

  // ── Bulk manual verification emails ───────────────────────────────────────
  sendBulkManualVerification: (payload) =>
    verificationApi.post('/verification/manual/send-bulk', payload),

  // ── Smart Send: multiple verifiers per type, users split randomly ─────────
  smartSendManualVerification: (payload) =>
    verificationApi.post('/verification/manual/smart-send', payload),

  // ── Resend manual verification link ───────────────────────────────────────
  resendManualVerification: (requestId) =>
    verificationApi.post(`/verification/manual/resend/${requestId}`),

  // ── Submitted verifier reports for a batch ─────────────────────────────────
  getSubmittedReports: (batchId, submittedOnly = false) =>
    verificationApi.get(`/verification/batches/${batchId}/submitted-reports`, {
      params: submittedOnly ? { submitted_only: true } : undefined,
    }),

  // ── Download one report file from a verifier's submission (binary stream) ──
  downloadManualReport: (requestId, fileIndex) =>
    verificationApi.get(`/verification/manual/reports/${requestId}/download/${fileIndex}`, {
      responseType: 'blob',
    }),

  // ── Email Drafts ──────────────────────────────────────────────────────────
  createEmailDraft: (payload) =>
    verificationApi.post('/verification/email-drafts', cleanObject({
      verification_type: payload.verification_type,
      subject: payload.subject,
      body: payload.body,
      extra_fields: payload.extra_fields || {},
    })),

  getEmailDraftsByType: (verificationType) =>
    verificationApi.get(`/verification/email-drafts/${encodeURIComponent(verificationType)}`),

  updateEmailDraft: (draftId, payload) =>
    verificationApi.put(`/verification/email-drafts/${draftId}`, cleanObject({
      subject: payload.subject,
      body: payload.body,
      extra_fields: payload.extra_fields || {},
    })),

  deleteEmailDraft: (draftId) =>
    verificationApi.delete(`/verification/email-drafts/${draftId}`),

  // ── Run automatic verification ────────────────────────────────────────────
  runAutoVerification: (verificationTypeName, userId) =>
    verificationApi.post(`/verification/verification/automatic/${verificationTypeName}/${userId}`),

  // ── Product Warranty ──────────────────────────────────────────────────────
  downloadWarrantyTemplate: () =>
    verificationApi.get('/verification/products/warranty-template', { responseType: 'blob' }),

  uploadWarrantyExcel: (file, batchName, description = '', maybeOptions, maybeProgress) => {
    const formData = new FormData();
    const { options, onProgress } = normalizeUploadArgs(maybeOptions, maybeProgress);

    formData.append('file', file);
    formData.append('batch_name', batchName);
    if (description) formData.append('description', description);

    // Document attachments
    const docNames  = options.docProductNames || options.doc_product_names;
    const docLabels = options.docLabels       || options.doc_labels;
    const docFiles  = options.docFiles        || options.doc_files;

    if (Array.isArray(docNames)  && docNames.length  > 0) formData.append('doc_product_names', docNames.join(','));
    if (Array.isArray(docLabels) && docLabels.length > 0) formData.append('doc_labels', docLabels.join(','));
    if (Array.isArray(docFiles))  docFiles.forEach((f) => formData.append('doc_files', f));

    return verificationApi.post('/verification/products/warranty-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (event) => onProgress(Math.round((event.loaded * 100) / (event.total || 1)))
        : undefined,
    });
  },

  getWarrantyStatus: (batchId) =>
    verificationApi.get(`/verification/products/warranty/${batchId}`),

  approveRejectWarranty: (productId, status, reason = '') => {
    const payload = { status };
    if (reason) payload.reason = reason;
    return verificationApi.patch(`/verification/products/warranty/${productId}/status`, payload);
  },
};

export const sdcAPI = {
  // POST /sdc/batches/{batch_id}/generate — backend builds the recordArray from the
  // batch's users; org_id/space_id/schema_id are Dhiway identifiers (which change
  // per SDC template) so the caller must supply them.
  generateBatchSDC: (batchId, payload = {}) =>
    verificationApi.post(
      `/sdc/batches/${batchId}/generate`,
      cleanObject({
        org_id: payload.org_id?.trim(),
        space_id: payload.space_id?.trim(),
        schema_id: payload.schema_id?.trim(),
        publish: !!payload.publish,
        active: !!payload.active,
      })
    ),

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
};

export const verifiersAPI = {
  getAll: () => api.get('/verifiers'),
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
