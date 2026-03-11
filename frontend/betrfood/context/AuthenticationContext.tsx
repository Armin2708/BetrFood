import React, { createContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { setAuthToken, setTokenGetter, fetchMyProfile, fetchMyRole } from "../services/api";

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
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  needsOnboarding: false,
  setNeedsOnboarding: () => {},
  refreshRole: async () => {},
});

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const { isSignedIn, isLoaded: authLoaded, getToken } = useAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Debug: log Clerk state changes
  useEffect(() => {
    console.log("[AuthContext] Clerk state:", { authLoaded, userLoaded, isSignedIn, clerkUserId: clerkUser?.id });
  }, [authLoaded, userLoaded, isSignedIn, clerkUser?.id]);

  // Sync Clerk auth state to our context
  useEffect(() => {
    if (!authLoaded || !userLoaded) return;

    if (isSignedIn && clerkUser) {
      setTokenGetter(() => getToken());
      syncUser();
    } else {
      setUser(null);
      setToken(null);
      setAuthToken(null);
      setTokenGetter(null);
      setNeedsOnboarding(false);
      setLoading(false);
    }
  }, [isSignedIn, authLoaded, userLoaded, clerkUser?.id]);

  async function syncUser() {
    try {
      console.log("[AuthContext] syncUser called, getting token...");
      // Get a fresh JWT from Clerk (auto-managed, no manual refresh needed)
      const jwt = await getToken();
      console.log("[AuthContext] Got token:", jwt ? "yes" : "no");
      setToken(jwt);
      setAuthToken(jwt);

      const userData: User = {
        id: clerkUser!.id,
        email: clerkUser!.emailAddresses?.[0]?.emailAddress || "",
        firstName: clerkUser!.firstName || undefined,
        lastName: clerkUser!.lastName || undefined,
      };

      // Load role from backend
      try {
        const { role } = await fetchMyRole();
        userData.role = role;
      } catch {
        userData.role = "user";
      }

      setUser(userData);

      // Check onboarding status (also auto-provisions Supabase profile)
      try {
        console.log("[AuthContext] Fetching profile (auto-provisions in Supabase)...");
        const profile = await fetchMyProfile();
        console.log("[AuthContext] Profile fetched:", profile);
        setNeedsOnboarding(!profile.onboardingCompleted);
      } catch (err) {
        console.error("[AuthContext] Profile fetch failed:", err);
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error("[AuthContext] Error syncing user:", error);
    } finally {
      setLoading(false);
    }
  }

  // Keep the API token fresh (Clerk tokens expire in ~60s)
  useEffect(() => {
    if (!isSignedIn) return;

    const interval = setInterval(async () => {
      try {
        const freshToken = await getToken();
        setToken(freshToken);
        setAuthToken(freshToken);
      } catch {
        // Token refresh failed - Clerk will handle re-auth
      }
    }, 50_000);

    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  const refreshRole = useCallback(async () => {
    if (!user) return;
    try {
      const { role } = await fetchMyRole();
      setUser((prev) => (prev ? { ...prev, role } : prev));
    } catch {
      // Keep existing role
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        needsOnboarding,
        setNeedsOnboarding,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
