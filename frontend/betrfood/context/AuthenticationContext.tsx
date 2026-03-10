import React, { createContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "betrfood_session_token";
const USER_KEY  = "betrfood_user";

const LOCAL_IP = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

// ---------------------------------------------------------------------------
// Secure storage helpers — falls back to in-memory on web
// ---------------------------------------------------------------------------
async function saveToStore(key: string, value: string) {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(key, value);
}

async function getFromStore(key: string): Promise<string | null> {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync(key);
}

async function deleteFromStore(key: string) {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(key);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type User = {
  id: string;
  email: string;
  username: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
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

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── On mount: restore session from secure storage ─────────────────────────
  useEffect(() => {
    async function restoreSession() {
      try {
        const [storedToken, storedUser] = await Promise.all([
          getFromStore(TOKEN_KEY),
          getFromStore(USER_KEY),
        ]);

        if (storedToken && storedUser) {
          // Validate the token is still good by hitting the backend
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          if (response.ok) {
            const userData = await response.json();
            setToken(storedToken);
            setUser(userData);
          } else {
            // Token invalid or expired — clear storage
            await deleteFromStore(TOKEN_KEY);
            await deleteFromStore(USER_KEY);
          }
        }
      } catch (e) {
        console.error("Failed to restore session:", e);
        // Network error — still load stored user optimistically
        try {
          const storedUser = await getFromStore(USER_KEY);
          const storedToken = await getFromStore(TOKEN_KEY);
          if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
          }
        } catch (_) {}
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const { token: newToken, user: userData } = await response.json();
    await saveToStore(TOKEN_KEY, newToken);
    await saveToStore(USER_KEY, JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  // ── Signup ────────────────────────────────────────────────────────────────
  const signup = async (email: string, password: string, username: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Signup failed");
    }

    const { token: newToken, user: userData } = await response.json();
    await saveToStore(TOKEN_KEY, newToken);
    await saveToStore(USER_KEY, JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.error("Logout request failed:", e);
    } finally {
      await deleteFromStore(TOKEN_KEY);
      await deleteFromStore(USER_KEY);
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
