import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI, tokenHelpers } from '@/services/api';

const AuthContext = createContext(null);

const ROLE_MAP = {
  organization: 'organization',
  individual: 'individual',
  'super-admin': 'super_admin',
};

const REG_TYPE_TO_ROLE = {
  org: 'organization',
  organization: 'organization',
  individual: 'individual',
};

const normalizeMobile = (mobile) => String(mobile || '').replace(/\D/g, '');

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

const storePendingRegistration = (formData, regType) => {
  const email = formData.email.trim();
  const mobile = normalizeMobile(formData.mobile);
  sessionStorage.setItem('trumarkz_otp_identifier', email);
  sessionStorage.setItem('trumarkz_otp_email', email);
  if (mobile) sessionStorage.setItem('trumarkz_otp_mobile', mobile);
  else sessionStorage.removeItem('trumarkz_otp_mobile');
  sessionStorage.setItem('trumarkz_otp_purpose', 'registration');
  sessionStorage.setItem('trumarkz_reg_type', regType);
  return { email, mobile };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('organization');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orgApprovalStatus, setOrgApprovalStatus] = useState('approved');
  const [loading, setLoading] = useState(true);

  const buildUser = useCallback((data) => {
    let localProfile = {};
    try {
      localProfile = JSON.parse(localStorage.getItem('trumarkz_profile') || '{}');
    } catch {
      localStorage.removeItem('trumarkz_profile');
    }
    const id = data.id;
    const savedProfile = id && localProfile[id] ? localProfile[id] : {};
    return {
      id,
      name: savedProfile.name || data.full_name || data.organization_name || '',
      email: savedProfile.email || data.email || '',
      mobile: savedProfile.mobile || data.mobile || '',
      organization: savedProfile.organization || data.organization_name || '',
      role: data.login_type,
      kycStatus: data.is_verified ? 'verified' : 'pending',
      storagePath: data.storage_path,
      avatarUrl: savedProfile.avatarUrl || '',
    };
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const token = tokenHelpers.get();
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await authAPI.getCurrentUser();
        setUser(buildUser(data));
        const frontendRole = Object.entries(ROLE_MAP).find(([, v]) => v === data.login_type)?.[0] || 'organization';
        setRole(frontendRole);
        setIsAuthenticated(true);
      } catch {
        tokenHelpers.remove();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (emailOrMobile, password, selectedRole = 'organization', rememberMe = false) => {
    try {
      const loginType = ROLE_MAP[selectedRole] || 'organization';
      tokenHelpers.remove();
      localStorage.removeItem('trumarkz_user');
      const { data } = await authAPI.login(emailOrMobile.trim(), password, loginType, rememberMe);
      const accessToken = data.access_token || data.token || data.data?.access_token || data.data?.token;
      if (!accessToken) {
        return { success: false, error: 'Login response did not include an access token.' };
      }
      tokenHelpers.save(accessToken);
      const { data: profile } = await authAPI.getCurrentUser();
      setUser(buildUser(profile));
      setRole(selectedRole);
      setIsAuthenticated(true);
      setOrgApprovalStatus('approved');
      return { success: true };
    } catch (err) {
      const raw = getErrorMessage(err, 'Login failed. Please check your credentials and try again.');
      const status = err.response?.status;
      const lower = raw.toLowerCase();

      if (status === 403 && (lower.includes('not verified') || lower.includes('verify your email'))) {
        sessionStorage.setItem('trumarkz_otp_identifier', emailOrMobile);
        sessionStorage.setItem('trumarkz_otp_purpose', 'registration');
        sessionStorage.setItem('trumarkz_reg_type', selectedRole === 'organization' ? 'org' : selectedRole);
        return {
          success: false,
          requiresVerification: true,
          error: 'Your email is not verified yet. Please enter the OTP sent to your email.',
        };
      }

      if (lower.includes('invalid login type')) {
        return {
          success: false,
          error: `This account is not registered as "${selectedRole}". Please select the correct role and try again.`,
        };
      }

      if (lower.includes('inactive')) {
        return {
          success: false,
          error: 'Your account has been deactivated. Please contact support.',
        };
      }

      return { success: false, error: raw };
    }
  }, [buildUser]);

  const register = useCallback(async (formData) => {
    try {
      const { data } = await authAPI.registerOrganization(formData);
      const pending = storePendingRegistration({
        ...formData,
        email: data.data?.email || formData.email,
        mobile: data.data?.mobile || formData.mobile,
      }, 'org');
      setOrgApprovalStatus('pending');
      return { success: true, ...pending };
    } catch (err) {
      const message = getErrorMessage(err, 'Registration failed. Please try again.');
      if (message.toLowerCase().includes('registration already in progress')) {
        const pending = storePendingRegistration(formData, 'org');
        setOrgApprovalStatus('pending');
        return { success: true, resumed: true, ...pending };
      }
      return { success: false, error: message };
    }
  }, []);

  const registerIndividual = useCallback(async (formData) => {
    try {
      const { data } = await authAPI.registerIndividual(formData);
      const pending = storePendingRegistration({
        ...formData,
        email: data.data?.email || formData.email,
        mobile: data.data?.mobile || formData.mobile,
      }, 'individual');
      return { success: true, ...pending };
    } catch (err) {
      const message = getErrorMessage(err, 'Registration failed. Please try again.');
      if (message.toLowerCase().includes('registration already in progress')) {
        const pending = storePendingRegistration(formData, 'individual');
        return { success: true, resumed: true, ...pending };
      }
      return { success: false, error: message };
    }
  }, []);

  const verifyOTP = useCallback(async (otpCode, identifier, purpose) => {
    const id = identifier || sessionStorage.getItem('trumarkz_otp_identifier') || '';
    const purp = purpose || sessionStorage.getItem('trumarkz_otp_purpose') || 'registration';

    if (!id) {
      return { success: false, error: 'Session expired. Please go back and register again.' };
    }

    try {
      const { data } = await authAPI.verifyOTP(id, otpCode, purp);
      const emailVerified = data.data?.email_verified;
      const mobileVerified = data.data?.mobile_verified;
      const mobile = sessionStorage.getItem('trumarkz_otp_mobile') || '';

      if (purp === 'registration' && mobile && emailVerified === true && mobileVerified === false) {
        sessionStorage.setItem('trumarkz_otp_identifier', mobile);
        return {
          success: true,
          complete: false,
          nextIdentifier: mobile,
          message: data.message || 'Email verified. Please verify your mobile OTP to complete registration.',
        };
      }

      const regType = sessionStorage.getItem('trumarkz_reg_type') || '';
      const verifiedRole = REG_TYPE_TO_ROLE[regType] || 'organization';
      const loginIdentifier = sessionStorage.getItem('trumarkz_otp_email') || id;
      sessionStorage.setItem('trumarkz_login_identifier', loginIdentifier);
      sessionStorage.setItem('trumarkz_login_role', verifiedRole);
      sessionStorage.removeItem('trumarkz_otp_identifier');
      sessionStorage.removeItem('trumarkz_otp_email');
      sessionStorage.removeItem('trumarkz_otp_mobile');
      sessionStorage.removeItem('trumarkz_otp_purpose');
      return { success: true, complete: true, userId: data.data?.user_id, message: data.message };
    } catch (err) {
      const message = getErrorMessage(err, 'Invalid or expired OTP.');
      return { success: false, error: message };
    }
  }, []);

  const forgotPassword = useCallback(async (emailOrMobile) => {
    try {
      const { data } = await authAPI.forgotPassword(emailOrMobile);
      return { success: true, message: data.message };
    } catch (err) {
      const message = getErrorMessage(err, 'Request failed. Please try again.');
      return { success: false, error: message };
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      await authAPI.resetPassword(token, newPassword);
      return { success: true };
    } catch (err) {
      const message = getErrorMessage(err, 'Reset failed. Token may have expired.');
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    tokenHelpers.remove();
    sessionStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
    setOrgApprovalStatus('approved');
  }, []);

  const switchRole = useCallback((newRole) => setRole(newRole), []);
  const approveOrg = useCallback(() => setOrgApprovalStatus('approved'), []);

  const updateUserProfile = useCallback((updates) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...updates };
      let savedProfiles = {};
      try { savedProfiles = JSON.parse(localStorage.getItem('trumarkz_profile') || '{}'); }
      catch { savedProfiles = {}; }
      savedProfiles[current.id] = {
        name: next.name, email: next.email, mobile: next.mobile,
        organization: next.organization, avatarUrl: next.avatarUrl,
      };
      localStorage.setItem('trumarkz_profile', JSON.stringify(savedProfiles));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, role, isAuthenticated, orgApprovalStatus, loading,
      login, logout, register, registerIndividual,
      verifyOTP, forgotPassword, resetPassword,
      switchRole, approveOrg, updateUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
