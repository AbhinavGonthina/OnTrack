"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { getSession, logout as logoutRequest } from "@/lib/api";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True only until the initial session-rehydrate check (see below) resolves - lets a
   * protected page tell "still checking" apart from "genuinely logged out" so it doesn't
   * redirect to the landing page while that check is still in flight. */
  isInitializing: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

// The JWT itself still lives only in React state (no localStorage/sessionStorage, per
// SPEC.md) - but an httpOnly cookie set by the backend on login survives a hard refresh
// (JS can never read it either way), so on mount we ask the backend "is that cookie still
// good?" and silently re-populate this state if so, instead of just staying logged out.
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((response) => {
        if (cancelled) return;
        setToken(response.token);
        setUser({ id: response.userId, email: response.email });
      })
      .catch(() => {
        // No valid session cookie (or none at all) - stay logged out, no error to show.
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: token !== null,
      isInitializing,
      login: (newToken, newUser) => {
        setToken(newToken);
        setUser(newUser);
      },
      logout: () => {
        logoutRequest().catch(() => {
          // Best-effort - the cookie may already be gone/expired, that's fine either way.
        });
        setToken(null);
        setUser(null);
      },
    }),
    [token, user, isInitializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
