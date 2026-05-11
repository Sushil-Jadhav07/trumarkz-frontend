import axios from 'axios';

// ─── Base Configuration ───────────────────────────────────────────────────────
const BASE_URL = 'https://trumarkz-api-54038467488.asia-south1.run.app';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
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

// ─── Request Interceptor — attach JWT token ───────────────────────────────────
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

// ─── Response Interceptor — handle 401 globally ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('trumarkz_access_token');
      localStorage.removeItem('trumarkz_user');
      // Redirect to login — components can also handle this via useAuth
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  /**
   * Register a new individual user.
   * POST /auth/register/individual
   */
  registerIndividual: (data) =>
    api.post('/auth/register/individual', {
      full_name: data.fullName.trim(),
      email: data.email.trim(),
      mobile: normalizeMobile(data.mobile),
      address: optionalString(data.address),
      password: data.password,
    }),

  /**
   * Register a new organization.
   * POST /auth/register/organization
   */
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

  /**
   * Verify OTP after registration or forgot-password.
   * POST /auth/verify-otp
   * @param {string} identifier  - email or mobile
   * @param {string} otpCode     - 6-digit OTP
   * @param {string} purpose     - 'registration' | 'forgot_password'
   */
  verifyOTP: (identifier, otpCode, purpose = 'registration') =>
    api.post('/auth/verify-otp', {
      identifier,
      otp_code: otpCode,
      purpose,
    }),

  /**
   * Login and receive a JWT token.
   * POST /auth/login
   * @param {string} loginType - 'individual' | 'organization' | 'super_admin'
   */
  login: (emailOrMobile, password, loginType, rememberMe = false) =>
    api.post('/auth/login', {
      login_type: loginType,
      email_or_mobile: emailOrMobile,
      password,
      remember_me: rememberMe,
    }),

  /**
   * Send forgot-password reset link.
   * POST /auth/forgot-password
   */
  forgotPassword: (emailOrMobile) =>
    api.post('/auth/forgot-password', {
      email_or_mobile: emailOrMobile,
    }),

  /**
   * Reset password using token from forgot-password response.
   * POST /auth/reset-password
   */
  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    }),

  /**
   * Get current authenticated user profile.
   * GET /auth/me
   */
  getCurrentUser: () => api.get('/auth/me'),
};

// ─── Organization API ─────────────────────────────────────────────────────────
export const orgAPI = {
  /**
   * Link an existing individual to the organization.
   * POST /auth/org/assign-individual
   */
  assignIndividual: (emailOrMobile) =>
    api.post('/auth/org/assign-individual', {
      individual_email_or_mobile: emailOrMobile,
    }),

  /**
   * Invite a new (unregistered) individual via email or SMS.
   * POST /auth/org/invite-individual
   */
  inviteIndividual: (email, mobile) =>
    api.post('/auth/org/invite-individual', {
      email: email || undefined,
      mobile: mobile || undefined,
    }),

  /**
   * Fetch all individuals assigned to the organization.
   * GET /auth/org/individuals
   */
  getAssignedIndividuals: () => api.get('/auth/org/individuals'),
};

// ─── Health Check ─────────────────────────────────────────────────────────────
export const healthCheck = () => api.get('/health');

// ─── Token Helpers ────────────────────────────────────────────────────────────
export const tokenHelpers = {
  save: (token) => localStorage.setItem('trumarkz_access_token', token),
  remove: () => localStorage.removeItem('trumarkz_access_token'),
  get: () => localStorage.getItem('trumarkz_access_token'),
};

export default api;
