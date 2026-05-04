import React, { createContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { setAuthToken, setTokenGetter, fetchMyProfile, fetchMyRole } from "../services/api";
import { DEV_BYPASS_AUTH, DEV_BYPASS_EMAIL, DEV_BYPASS_ROLE, DEV_BYPASS_USER_ID } from "../utils/devAuth";

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

  // Stable ref for getToken to avoid re-triggering the effect on every render
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);


  // Sync Clerk auth state to our context
  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      setToken('dev-bypass');
      setAuthToken('dev-bypass');
      setTokenGetter(null);
      setNeedsOnboarding(false);
      setUser({
        id: DEV_BYPASS_USER_ID,
        email: DEV_BYPASS_EMAIL,
        firstName: 'Dev',
        lastName: 'User',
        role: DEV_BYPASS_ROLE,
      });
      setLoading(false);
      return;
    }

    if (!authLoaded || !userLoaded) return;

    let cancelled = false;

    if (isSignedIn && clerkUser) {
      // Reset loading so consumers wait for profile/role fetch
      setLoading(true);

      // Stable wrapper that always calls the latest getToken via ref
      const stableGetToken = () => getTokenRef.current();
      setTokenGetter(stableGetToken);

      (async () => {
        try {
          const jwt = await stableGetToken();
          if (cancelled) return;
          setToken(jwt);
          setAuthToken(jwt);

          const userData: User = {
            id: clerkUser.id,
            email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
            firstName: clerkUser.firstName || undefined,
            lastName: clerkUser.lastName || undefined,
          };

          // Fetch profile first (auto-provisions in Supabase if missing),
          // then fetch role so the profile row exists for the role query.
          try {
            const profile = await fetchMyProfile();
            if (cancelled) return;
            setNeedsOnboarding(!profile.onboardingCompleted);
          } catch {
            if (cancelled) return;
            setNeedsOnboarding(true);
          }

          // Load role from backend (profile now exists)
          try {
            const { role } = await fetchMyRole();
            if (cancelled) return;
            userData.role = role;
          } catch {
            if (cancelled) return;
            userData.role = "user";
          }

          setUser(userData);
        } catch (error) {
          if (cancelled) return;
          console.error("[AuthContext] Error syncing user:", error);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    } else {
      setUser(null);
      setToken(null);
      setAuthToken(null);
      setTokenGetter(null);
      setNeedsOnboarding(false);
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [isSignedIn, authLoaded, userLoaded, clerkUser?.id]);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const refreshRole = useCallback(async () => {
    if (!userRef.current) return;
    if (DEV_BYPASS_AUTH) {
      setUser((prev) => (prev ? { ...prev, role: DEV_BYPASS_ROLE } : prev));
      return;
    }
    try {
      const { role } = await fetchMyRole();
      setUser((prev) => (prev ? { ...prev, role } : prev));
    } catch {
      // Keep existing role
    }
  }, []);

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
