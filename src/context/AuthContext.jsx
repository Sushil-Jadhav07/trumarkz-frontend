import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI, tokenHelpers } from '@/services/api';

const AuthContext = createContext(null);

const ROLE_MAP = {
  organization: 'organization',
  individual: 'individual',
  'super-admin': 'super_admin',
};

const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'superadmin@trumarkz.com';

const getErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || item?.message).filter(Boolean).join('. ') || fallback;
  }
  if (detail && typeof detail === 'object') {
    return detail.message || detail.error || fallback;
  }
  return err.response?.data?.message || fallback;
};

const normalizeUserType = (value, fallback = 'organization') => {
  const normalized = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (normalized === 'individual') return 'individual';
  if (normalized === 'organization') return 'organization';
  if (normalized === 'super-admin' || normalized === 'superadmin') return 'super-admin';
  return fallback;
};

const getRoleFromLoginType = (value, fallback = 'organization') => {
  const apiRole = String(value || '').trim().toLowerCase();
  return Object.entries(ROLE_MAP).find(([, mapped]) => mapped === apiRole)?.[0] || normalizeUserType(value, fallback);
};

const getPendingGoogleUserType = () =>
  normalizeUserType(sessionStorage.getItem('trumarkz_google_user_type'), 'organization');

const buildSuperAdminUser = (email = SUPER_ADMIN_EMAIL) => ({
  id: 'super-admin',
  name: 'Super Admin',
  email,
  phoneNumber: '',
  organization: 'TruMarkZ',
  userType: 'super-admin',
  role: 'super-admin',
  onboardingCompleted: true,
  emailVerified: true,
  isActive: true,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('organization');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const buildUser = useCallback((data, fallbackUserType = 'organization') => {
    const userType = getRoleFromLoginType(data.login_type || data.user_type, fallbackUserType);
    return {
      id: data.id,
      organizationId: data.organization_id || data.org_id || null,
      name: data.full_name || data.organization_name || '',
      email: data.email || '',
      phoneNumber: data.phone_number || '',
      organization: data.organization_name || '',
      userType,
      role: userType,
      onboardingCompleted: data.onboarding_completed,
      emailVerified: data.email_verified,
      isActive: data.is_active,
      storagePath: data.storage_path,
      industryType: data.industry_type,
      gstin: data.gstin,
      businessRegNumber: data.business_reg_number,
      addressLine1: data.address_line1,
      addressLine2: data.address_line2,
      addressLine3: data.address_line3,
      useCases: data.use_cases,
      createdAt: data.created_at,
    };
  }, []);

  const persistAuthData = useCallback((data = {}, fallbackUserType = '') => {
    const userType = getRoleFromLoginType(data.login_type || data.user_type, fallbackUserType);
    tokenHelpers.saveAuthData({
      access_token: data.access_token,
      user_id: data.user_id || data.id,
      user_type: userType || data.user_type,
      email: data.email,
    });
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const token = tokenHelpers.get();
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await authAPI.getCurrentUser();
        const builtUser = buildUser(data);
        setUser(builtUser);
        setRole(builtUser.userType);
        setIsAuthenticated(true);
      } catch {
        tokenHelpers.remove();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, [buildUser]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password, selectedRole = 'organization') => {
    try {
      tokenHelpers.remove();

      // API accepts only { email, password } — user_type comes back in the response
      const { data } = await authAPI.login(email.trim(), password);
      const accessToken = data.access_token || data.token;
      if (!accessToken) return { success: false, error: 'Login response did not include an access token.' };

      const returnedType = normalizeUserType(data.user_type, selectedRole);

      // Validate the returned role matches what the user selected
      if (selectedRole === 'super-admin' && returnedType !== 'super-admin') {
        return { success: false, error: 'This account does not have Super Admin access.' };
      }
      if (selectedRole !== 'super-admin' && returnedType === 'super-admin') {
        return { success: false, error: 'Please select the "Super Admin" role to sign in with this account.' };
      }
      if (returnedType !== selectedRole) {
        return { success: false, error: `This account is registered as "${returnedType}". Please select the correct role and try again.` };
      }

      persistAuthData({ ...data, access_token: accessToken }, returnedType);

      let builtUser;
      try {
        const { data: profile } = await authAPI.getCurrentUser();
        builtUser = buildUser(profile, returnedType);
      } catch {
        // Fallback for super-admin if /me is temporarily unavailable
        if (returnedType === 'super-admin') {
          builtUser = buildSuperAdminUser(email.trim());
        } else {
          throw new Error('Failed to load user profile.');
        }
      }

      setUser(builtUser);
      setRole(builtUser.userType);
      setIsAuthenticated(true);

      return {
        success: true,
        userType: builtUser.userType,
        requiresOnboarding: builtUser.userType === 'organization' && data.requires_onboarding,
      };
    } catch (err) {
      const raw = getErrorMessage(err, 'Login failed. Please check your credentials and try again.');
      const status = err.response?.status;
      const lower = raw.toLowerCase();

      if (status === 403 && (lower.includes('not verified') || lower.includes('verify'))) {
        return { success: false, requiresVerification: true, error: 'Your email is not verified yet. Please enter the OTP sent to your email.' };
      }
      return { success: false, error: raw };
    }
  }, [buildUser, persistAuthData]);

  // ── Register Organization ──────────────────────────────────────────────────
  const registerOrg = useCallback(async (formData) => {
    try {
      const { data } = await authAPI.signupOrganization(formData);
      sessionStorage.setItem('trumarkz_otp_email', data.email || formData.email.trim());
      sessionStorage.setItem('trumarkz_reg_type', 'org');
      return { success: true, email: data.email || formData.email.trim() };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Registration failed. Please try again.') };
    }
  }, []);

  // ── Register Individual ────────────────────────────────────────────────────
  const registerIndividual = useCallback(async (formData) => {
    try {
      const { data } = await authAPI.signupIndividual(formData);
      sessionStorage.setItem('trumarkz_otp_email', data.email || formData.email.trim());
      sessionStorage.setItem('trumarkz_reg_type', 'individual');
      return { success: true, email: data.email || formData.email.trim() };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Registration failed. Please try again.') };
    }
  }, []);

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const verifyOTP = useCallback(async (email, otpCode) => {
    try {
      const { data } = await authAPI.verifyOTP(email, otpCode);
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Invalid or expired OTP.') };
    }
  }, []);

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const resendOTP = useCallback(async (email) => {
    try {
      const { data } = await authAPI.resendOTP(email);
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to resend OTP.') };
    }
  }, []);

  // ── Complete Onboarding ────────────────────────────────────────────────────
  const completeOnboarding = useCallback(async (formData) => {
    try {
      const { data } = await authAPI.completeOnboarding(formData);
      // Refresh user profile after onboarding
      const { data: profile } = await authAPI.getCurrentUser();
      setUser(buildUser(profile));
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Onboarding failed. Please try again.') };
    }
  }, [buildUser]);

  // ── Google Auth ────────────────────────────────────────────────────────────
  const getGoogleAuthUrl = useCallback(async (userType) => {
    try {
      const { data } = await authAPI.getGoogleAuthUrl(userType);
      const authUrl = typeof data === 'string' ? data : data.auth_url || data.url;
      if (!authUrl) return { success: false, error: 'Google auth URL response did not include a redirect URL.' };
      return { success: true, authUrl };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to get Google auth URL.') };
    }
  }, []);

  const googleAuth = useCallback(async (token) => {
    try {
      tokenHelpers.remove();
      const pendingUserType = getPendingGoogleUserType();
      const { data } = await authAPI.googleAuth(token, pendingUserType);
      const accessToken = data.access_token;
      if (!accessToken) return { success: false, error: 'Google auth response did not include an access token.' };
      persistAuthData(data);

      let builtUser = {
        id: data.user_id,
        name: data.full_name || data.organization_name || '',
        email: data.email || '',
        userType: data.user_type,
        onboardingCompleted: !data.requires_onboarding,
      };

      try {
        const { data: profile } = await authAPI.getCurrentUser();
        builtUser = buildUser(profile, normalizeUserType(data.user_type, pendingUserType));
      } catch {
        // The Google endpoint already returns enough session data to route the user.
      }

      const userType = normalizeUserType(builtUser.userType || data.user_type, pendingUserType);
      setUser({ ...builtUser, userType: builtUser.userType || userType, role: builtUser.role || userType });
      setRole(userType);
      setIsAuthenticated(true);
      return { success: true, userType, requiresOnboarding: userType === 'organization' && data.requires_onboarding };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Google authentication failed.') };
    }
  }, [buildUser, persistAuthData]);

  const googleAuthMobile = useCallback(async (token, userType) => {
    try {
      tokenHelpers.remove();
      const normalizedUserType = normalizeUserType(userType, getPendingGoogleUserType());
      const { data } = await authAPI.googleAuthMobile(token, normalizedUserType);
      if (!data.access_token) return { success: false, error: 'Google auth response did not include an access token.' };
      persistAuthData(data);
      const userType = normalizeUserType(data.user_type, normalizedUserType);
      setRole(userType);
      setIsAuthenticated(true);
      return { success: true, userType, requiresOnboarding: userType === 'organization' && data.requires_onboarding };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Google authentication failed.') };
    }
  }, [persistAuthData]);

  const completeGoogleSignup = useCallback(async (userType) => {
    try {
      const normalizedUserType = normalizeUserType(userType, getPendingGoogleUserType());
      const { data } = await authAPI.completeGoogleSignup(normalizedUserType);
      if (!data.access_token) return { success: false, error: 'Signup response did not include an access token.' };
      persistAuthData(data);
      const userType = normalizeUserType(data.user_type, normalizedUserType);
      setRole(userType);
      setIsAuthenticated(true);
      return { success: true, userType, requiresOnboarding: userType === 'organization' && data.requires_onboarding };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to complete Google signup.') };
    }
  }, [persistAuthData]);

  const completeOAuthRedirect = useCallback(async (token, fallback = {}) => {
    try {
      if (!token) return { success: false, error: 'OAuth callback did not include a token.' };
      tokenHelpers.save(token);
      if (fallback.userId) localStorage.setItem('user_id', fallback.userId);
      if (fallback.userType) localStorage.setItem('user_type', fallback.userType);
      if (fallback.email) localStorage.setItem('email', fallback.email);

      let userType = normalizeUserType(fallback.userType, getPendingGoogleUserType());
      let requiresOnboarding = fallback.requiresOnboarding;
      let builtUser = {
        id: fallback.userId || '',
        name: '',
        email: fallback.email || '',
        userType,
        onboardingCompleted: requiresOnboarding === false,
      };

      try {
        const { data: profile } = await authAPI.getCurrentUser();
        builtUser = buildUser(profile, userType);
        userType = normalizeUserType(profile.user_type, userType);
        requiresOnboarding = userType === 'organization' && !profile.onboarding_completed;
      } catch {
        // The backend callback already returned a valid JWT. Keep the session
        // active even if the profile refresh is temporarily unavailable.
      }

      setUser({ ...builtUser, userType: builtUser.userType || userType, role: builtUser.role || userType });
      setRole(userType);
      setIsAuthenticated(true);

      return {
        success: true,
        userType,
        requiresOnboarding: Boolean(requiresOnboarding),
      };
    } catch (err) {
      tokenHelpers.remove();
      return { success: false, error: getErrorMessage(err, 'Failed to complete Google sign-in.') };
    }
  }, [buildUser]);

  // ── Forgot / Reset Password ────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    try {
      const { data } = await authAPI.forgotPassword(email);
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Request failed. Please try again.') };
    }
  }, []);

  const resetPassword = useCallback(async (email, otpCode, newPassword) => {
    try {
      await authAPI.resetPassword(email, otpCode, newPassword);
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Reset failed. Please try again.') };
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    tokenHelpers.remove();
    sessionStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
    setRole('organization');
  }, []);

  const updateUserProfile = useCallback((updates) => {
    setUser((current) => current ? { ...current, ...updates } : current);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.getCurrentUser();
      const builtUser = buildUser(data);
      setUser(builtUser);
      setRole(builtUser.userType);
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to refresh profile') };
    }
  }, [buildUser]);

  return (
    <AuthContext.Provider value={{
      user, role, isAuthenticated, loading,
      login, logout,
      registerOrg, registerIndividual,
      verifyOTP, resendOTP,
      completeOnboarding,
      getGoogleAuthUrl, googleAuth, googleAuthMobile, completeGoogleSignup, completeOAuthRedirect,
      forgotPassword, resetPassword,
      updateUserProfile,
      refreshUser,
      // Keep legacy for other pages that use register
      register: registerOrg,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
