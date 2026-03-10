import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
// Extract the Clerk Frontend API domain from the publishable key
const CLERK_FRONTEND_API = (() => {
  try {
    const encoded = CLERK_PUBLISHABLE_KEY.replace('pk_test_', '').replace('pk_live_', '').replace(/\$$/, '');
    const decoded = atob(encoded);
    return `https://${decoded}`;
  } catch {
    return '';
  }
})();

type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

type AuthProviderProps = {
  children: ReactNode;
};

const TOKEN_KEY = 'betrfood_session_token';
const SESSION_ID_KEY = 'betrfood_session_id';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const savedSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
      if (savedToken && savedSessionId) {
        // Verify the token is still valid by fetching user info
        const userData = await fetchClerkUser(savedToken);
        if (userData) {
          setUser(userData);
          setToken(savedToken);
        } else {
          // Token expired, clear storage
          await AsyncStorage.multiRemove([TOKEN_KEY, SESSION_ID_KEY]);
        }
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClerkUser(sessionToken: string): Promise<User | null> {
    try {
      const res = await fetch(`${CLERK_FRONTEND_API}/v1/me`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.id,
        email: data.email_addresses?.[0]?.email_address || '',
        firstName: data.first_name || undefined,
        lastName: data.last_name || undefined,
      };
    } catch {
      return null;
    }
  }

  const login = async (email: string, password: string) => {
    // Step 1: Create a sign-in attempt
    const signInRes = await fetch(`${CLERK_FRONTEND_API}/v1/client/sign_ins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: email,
        password,
        strategy: 'password',
      }),
    });

    const signInData = await signInRes.json();

    if (!signInRes.ok) {
      const msg = signInData.errors?.[0]?.long_message || signInData.errors?.[0]?.message || 'Login failed';
      throw new Error(msg);
    }

    // Extract session token from the client response
    const sessionToken = signInData.client?.sessions?.[0]?.last_active_token?.jwt;
    const sessionId = signInData.client?.sessions?.[0]?.id;

    if (!sessionToken) {
      // If the sign-in needs more steps (like 2FA), handle that
      if (signInData.response?.status === 'needs_second_factor') {
        throw new Error('Two-factor authentication required. Not yet supported.');
      }
      throw new Error('Login succeeded but no session token received.');
    }

    await AsyncStorage.setItem(TOKEN_KEY, sessionToken);
    await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);

    const userData = await fetchClerkUser(sessionToken);
    setUser(userData || { id: signInData.response?.id || '', email });
    setToken(sessionToken);
  };

  const signup = async (email: string, password: string) => {
    // Step 1: Create a sign-up
    const signUpRes = await fetch(`${CLERK_FRONTEND_API}/v1/client/sign_ups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address: email,
        password,
      }),
    });

    const signUpData = await signUpRes.json();

    if (!signUpRes.ok) {
      const msg = signUpData.errors?.[0]?.long_message || signUpData.errors?.[0]?.message || 'Signup failed';
      throw new Error(msg);
    }

    // Check if email verification is needed
    const status = signUpData.response?.status;
    if (status === 'missing_requirements') {
      // Email verification might be required
      const verifications = signUpData.response?.verifications;
      if (verifications?.email_address?.status === 'unverified') {
        // Prepare email verification
        await fetch(`${CLERK_FRONTEND_API}/v1/client/sign_ups/${signUpData.response.id}/prepare_verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strategy: 'email_code' }),
        });
        throw new Error('VERIFY_EMAIL');
      }
    }

    // If sign-up auto-completes (no verification required)
    const sessionToken = signUpData.client?.sessions?.[0]?.last_active_token?.jwt;
    const sessionId = signUpData.client?.sessions?.[0]?.id;

    if (sessionToken) {
      await AsyncStorage.setItem(TOKEN_KEY, sessionToken);
      await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);

      const userData = await fetchClerkUser(sessionToken);
      setUser(userData || { id: signUpData.response?.id || '', email });
      setToken(sessionToken);
    } else {
      throw new Error('Account created. Please check your email for verification.');
    }
  };

  const logout = async () => {
    try {
      const sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
      if (token && sessionId) {
        await fetch(`${CLERK_FRONTEND_API}/v1/client/sessions/${sessionId}/revoke`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Error revoking session:', error);
    }

    await AsyncStorage.multiRemove([TOKEN_KEY, SESSION_ID_KEY]);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
