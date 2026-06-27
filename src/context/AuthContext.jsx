import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { adminAuthAPI, otpAPI } from '../utils/apiService';
import { toCitizenMessage } from '../utils/safeError';

export const AuthContext = createContext(null);

const readSessionFlags = () => {
  const actorType = sessionStorage.getItem('actorType');
  return {
    actorType,
    isGuest: sessionStorage.getItem('isGuest') === 'true',
    isAuthenticated: sessionStorage.getItem('isLoggedIn') === 'true',
    isAdminSession: actorType === 'admin',
    isCitizenSession: actorType === 'citizen' || actorType === null,
  };
};

const clearAuthSession = () => {
  sessionStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('isGuest');
  sessionStorage.removeItem('userMobile');
  sessionStorage.removeItem('userName');
  sessionStorage.removeItem('loginTime');
  sessionStorage.removeItem('authMethod');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('authRefreshToken');
  sessionStorage.removeItem('aadhaarUid');
  sessionStorage.removeItem('govId');
  sessionStorage.removeItem('govIdType');
  sessionStorage.removeItem('citizenData');
  sessionStorage.removeItem('isAdmin');
  sessionStorage.removeItem('actorType');
  sessionStorage.removeItem('adminProfile');
  sessionStorage.removeItem('adminRole');
  sessionStorage.removeItem('adminPermissions');
  sessionStorage.removeItem('adminDashboardPath');
  sessionStorage.removeItem('autoDetectedMode');
  sessionStorage.removeItem('userAge');
};

const writeSessionFromCitizen = ({ citizen, token, authMethod = 'phone_otp_sms' }) => {
  sessionStorage.setItem('isLoggedIn', 'true');
  sessionStorage.setItem('actorType', 'citizen');
  sessionStorage.removeItem('isGuest');
  sessionStorage.setItem('userMobile', citizen.mobile || '');
  sessionStorage.setItem('userName', citizen.name || '');
  sessionStorage.setItem('loginTime', Date.now().toString());
  sessionStorage.setItem('authMethod', authMethod);
  sessionStorage.setItem('aadhaarUid', citizen.uid || '');
  sessionStorage.setItem('govIdType', 'aadhaar');
  sessionStorage.setItem('govId', citizen.uid ? `XXXX-XXXX-${citizen.uid.slice(-4)}` : '');
  sessionStorage.setItem('citizenData', JSON.stringify(citizen));

  sessionStorage.removeItem('isAdmin');

  if (token) {
    sessionStorage.setItem('authToken', token);
  } else {
    sessionStorage.removeItem('authToken');
  }
};

const writeSessionFromAdmin = ({ accessToken, refreshToken, admin, dashboardPath }) => {
  sessionStorage.setItem('isLoggedIn', 'true');
  sessionStorage.setItem('actorType', 'admin');
  sessionStorage.removeItem('isGuest');
  sessionStorage.setItem('isAdmin', 'true');
  sessionStorage.setItem('authToken', accessToken || '');
  if (refreshToken) {
    sessionStorage.setItem('authRefreshToken', refreshToken);
  }

  sessionStorage.setItem('userName', admin?.fullName || admin?.name || 'Admin User');
  sessionStorage.setItem('authMethod', 'employee_id_mfa');
  sessionStorage.setItem('loginTime', Date.now().toString());
  sessionStorage.setItem('adminProfile', JSON.stringify(admin || {}));
  sessionStorage.setItem('adminRole', admin?.role || 'UNKNOWN');
  sessionStorage.setItem('adminPermissions', JSON.stringify(admin?.permissions || []));
  sessionStorage.setItem('adminDashboardPath', dashboardPath || '/super-admin');
};

export const AuthProvider = ({ children }) => {
  const [authLoading, setAuthLoading] = useState(true);
  const [otpLoading, setOtpLoading] = useState(false);
  const [restoringSession] = useState(false);
  const [sessionFlags, setSessionFlags] = useState(readSessionFlags);

  useEffect(() => {
    setSessionFlags(readSessionFlags());
    setAuthLoading(false);
  }, []);

  const sendOtp = useCallback(async ({ aadhaarUid, mobile }) => {
    setOtpLoading(true);
    try {
      const response = await otpAPI.sendOtp({ uid: aadhaarUid, mobile });
      if (!response?.success) {
        return { success: false, error: response?.error || 'Failed to send OTP.' };
      }
      return {
        success: true,
        maskedMobile: response.maskedMobile,
        resendAfterSeconds: response.resendAfterSeconds ?? 30,
        expiresInSeconds: response.expiresInSeconds ?? 120,
      };
    } catch (error) {
      return {
        success: false,
        error: toCitizenMessage(error, 'Failed to send OTP. Please try again.'),
        retryAfterSeconds: error?.retryAfterSeconds ?? 0,
        providerStatusCode: error?.providerStatusCode ?? null,
        providerMessage: error?.providerMessage ?? null,
      };
    } finally {
      setOtpLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async ({ otp, aadhaarUid, mobile }) => {
    setOtpLoading(true);
    try {
      const response = await otpAPI.verifyOtp({ uid: aadhaarUid, mobile, otp });
      if (!response?.success || !response?.data) {
        return { success: false, error: response?.error || 'OTP verification failed.' };
      }

      writeSessionFromCitizen({
        citizen: response.data,
        token: response.token,
        authMethod: 'phone_otp_sms',
      });
      setSessionFlags(readSessionFlags());
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: toCitizenMessage(error, 'OTP verification failed. Please try again.'),
      };
    } finally {
      setOtpLoading(false);
    }
  }, []);

  const initiateAdminLogin = useCallback(async ({ identifier, password }) => {
    try {
      const response = await adminAuthAPI.login({ identifier, password });
      if (!response?.success) {
        return { success: false, error: response?.error || 'Admin login failed.' };
      }
      return {
        success: true,
        challengeId: response.challengeId,
        expiresAt: response.expiresAt,
        devMfaCode: response.devMfaCode,
      };
    } catch (error) {
      return {
        success: false,
        error: toCitizenMessage(error, 'Admin login failed.'),
      };
    }
  }, []);

  const verifyAdminMfa = useCallback(async ({ challengeId, mfaCode }) => {
    try {
      const response = await adminAuthAPI.verifyMfa({ challengeId, mfaCode });
      if (!response?.success) {
        return { success: false, error: response?.error || 'MFA verification failed.' };
      }

      const accessToken = response?.tokens?.accessToken || response?.accessToken;
      const refreshToken = response?.tokens?.refreshToken || response?.refreshToken;
      const admin = response?.admin || {};
      const dashboardPath = admin?.dashboardPath || response?.dashboardPath;

      writeSessionFromAdmin({
        accessToken,
        refreshToken,
        admin,
        dashboardPath,
      });
      setSessionFlags(readSessionFlags());
      return { success: true, dashboardPath };
    } catch (error) {
      return {
        success: false,
        error: toCitizenMessage(error, 'MFA verification failed.'),
      };
    }
  }, []);

  const refreshAdminSession = useCallback(async () => {
    const refreshToken = sessionStorage.getItem('authRefreshToken');
    if (!refreshToken) {
      return { success: false, error: 'No refresh token available.' };
    }

    try {
      const response = await adminAuthAPI.refresh({ refreshToken });
      if (!response?.success) {
        return { success: false, error: response?.error || 'Session refresh failed.' };
      }
      const nextAccessToken = response?.tokens?.accessToken || response?.accessToken;
      const nextRefreshToken = response?.tokens?.refreshToken || response?.refreshToken;
      if (nextAccessToken) {
        sessionStorage.setItem('authToken', nextAccessToken);
      }
      if (nextRefreshToken) {
        sessionStorage.setItem('authRefreshToken', nextRefreshToken);
      }
      setSessionFlags(readSessionFlags());
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: toCitizenMessage(error, 'Session refresh failed.'),
      };
    }
  }, []);

  const logout = useCallback(async () => {
    const isAdminSession = sessionStorage.getItem('actorType') === 'admin';
    if (isAdminSession) {
      try {
        const refreshToken = sessionStorage.getItem('authRefreshToken');
        if (refreshToken) {
          await adminAuthAPI.logout({ refreshToken });
        }
      } catch {
        // Ignore logout network errors and clear session locally.
      }
    }

    clearAuthSession();
    setSessionFlags(readSessionFlags());
  }, []);

  const activateGuestSession = useCallback(() => {
    clearAuthSession();
    sessionStorage.setItem('isGuest', 'true');
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('actorType', 'citizen');
    sessionStorage.setItem('userMode', 'normal');
    sessionStorage.setItem('userName', 'Guest');
    setSessionFlags(readSessionFlags());
  }, []);

  const completeCitizenSession = useCallback(({ citizen, token, authMethod = 'aadhaar' }) => {
    writeSessionFromCitizen({ citizen, token, authMethod });
    setSessionFlags(readSessionFlags());
  }, []);

  const value = useMemo(() => {
    return {
      authUser: null,
      authLoading,
      otpLoading,
      restoringSession,
      actorType: sessionFlags.actorType,
      isAuthenticated: sessionFlags.isAuthenticated,
      isGuest: sessionFlags.isGuest,
      isAdminSession: sessionFlags.isAdminSession,
      isCitizenSession: sessionFlags.isCitizenSession,
      sendOtp,
      verifyOtp,
      initiateAdminLogin,
      verifyAdminMfa,
      refreshAdminSession,
      completeCitizenSession,
      logout,
      activateGuestSession,
    };
  }, [
    activateGuestSession,
    authLoading,
    completeCitizenSession,
    initiateAdminLogin,
    logout,
    otpLoading,
    refreshAdminSession,
    restoringSession,
    sendOtp,
    sessionFlags.actorType,
    sessionFlags.isAdminSession,
    sessionFlags.isAuthenticated,
    sessionFlags.isCitizenSession,
    sessionFlags.isGuest,
    verifyAdminMfa,
    verifyOtp,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
