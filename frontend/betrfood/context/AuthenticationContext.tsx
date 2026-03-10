import React, { createContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setAuthToken,
  fetchMyProfile,
  fetchMyRole,
  apiLogin,
  apiSignup,
  apiRefreshToken,
  apiLogout,
} from "../services/api";

type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  needsOnboarding: boolean;
  setNeedsOnboarding: (value: boolean) => void;
  refreshRole: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  needsOnboarding: false,
  setNeedsOnboarding: () => {},
  refreshRole: async () => {},
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

type AuthProviderProps = {
  children: ReactNode;
};

const TOKEN_KEY = "betrfood_session_token";
const SESSION_ID_KEY = "betrfood_session_id";
const USER_KEY = "betrfood_user";

// Refresh token 10 seconds before the ~60s Clerk expiry
const TOKEN_REFRESH_INTERVAL = 50_000;

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore session on mount
  useEffect(() => {
    restoreSession();
    return () => stopTokenRefresh();
  }, []);

  /**
   * Start automatic token refresh interval.
   */
  function startTokenRefresh(sessionId: string) {
    stopTokenRefresh();
    refreshTimerRef.current = setInterval(async () => {
      try {
        const newToken = await apiRefreshToken(sessionId);
        setToken(newToken);
        setAuthToken(newToken);
        await AsyncStorage.setItem(TOKEN_KEY, newToken);
      } catch {
        // Session expired - force logout
        stopTokenRefresh();
        await AsyncStorage.multiRemove([TOKEN_KEY, SESSION_ID_KEY, USER_KEY]);
        setUser(null);
        setToken(null);
        setAuthToken(null);
      }
    }, TOKEN_REFRESH_INTERVAL);
  }

  function stopTokenRefresh() {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }

  /**
   * Check if the user has completed onboarding.
   */
  async function checkOnboardingStatus() {
    try {
      const profile = await fetchMyProfile();
      setNeedsOnboarding(!profile.onboardingCompleted);
    } catch {
      // Profile doesn't exist yet - needs onboarding
      setNeedsOnboarding(true);
    }
  }

  /**
   * Fetch the user's role from the backend.
   */
  async function loadUserRole(userData: User): Promise<User> {
    try {
      const { role } = await fetchMyRole();
      return { ...userData, role };
    } catch {
      return { ...userData, role: "user" };
    }
  }

  /**
   * Re-fetch the role without re-login.
   */
  const refreshRole = useCallback(async () => {
    if (!user) return;
    try {
      const { role } = await fetchMyRole();
      setUser((prev) => (prev ? { ...prev, role } : prev));
    } catch {
      // Keep existing role
    }
  }, [user]);

  /**
   * Restore session from AsyncStorage.
   * Gets a fresh token using the saved sessionId (old token is likely expired).
   */
  async function restoreSession() {
    try {
      const savedSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
      const savedUser = await AsyncStorage.getItem(USER_KEY);

      if (savedSessionId && savedUser) {
        // Get a fresh token (the saved one is likely expired)
        const freshToken = await apiRefreshToken(savedSessionId);

        setAuthToken(freshToken);
        setToken(freshToken);
        await AsyncStorage.setItem(TOKEN_KEY, freshToken);

        const userData: User = JSON.parse(savedUser);
        const userWithRole = await loadUserRole(userData);
        setUser(userWithRole);

        await checkOnboardingStatus();
        startTokenRefresh(savedSessionId);
      }
    } catch {
      // Session expired or invalid - clear everything
      await AsyncStorage.multiRemove([TOKEN_KEY, SESSION_ID_KEY, USER_KEY]);
    } finally {
      setLoading(false);
    }
  }

  const login = async (email: string, password: string) => {
    const result = await apiLogin(email, password);

    const userData: User = {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName || undefined,
      lastName: result.user.lastName || undefined,
    };

    // Save session
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    await AsyncStorage.setItem(SESSION_ID_KEY, result.sessionId);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

    setAuthToken(result.token);
    setToken(result.token);

    const userWithRole = await loadUserRole(userData);
    setUser(userWithRole);

    await checkOnboardingStatus();
    startTokenRefresh(result.sessionId);
  };

  const signup = async (email: string, password: string) => {
    const result = await apiSignup(email, password);

    const userData: User = {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName || undefined,
      lastName: result.user.lastName || undefined,
    };

    // Save session
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    await AsyncStorage.setItem(SESSION_ID_KEY, result.sessionId);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

    setAuthToken(result.token);
    setToken(result.token);

    const userWithRole = await loadUserRole(userData);
    setUser(userWithRole);

    setNeedsOnboarding(true);
    startTokenRefresh(result.sessionId);
  };

  const logout = async () => {
    stopTokenRefresh();

    try {
      const sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
      if (sessionId) {
        await apiLogout(sessionId);
      }
    } catch {
      // Best-effort revocation
    }

    await AsyncStorage.multiRemove([TOKEN_KEY, SESSION_ID_KEY, USER_KEY]);
    setUser(null);
    setToken(null);
    setNeedsOnboarding(false);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        needsOnboarding,
        setNeedsOnboarding,
        refreshRole,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
