"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { User } from "@/types";
import { authApi } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: { accessToken: string; refreshToken: string; user: User }) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("accessToken");
      const savedRefresh = localStorage.getItem("refreshToken");
      const savedUser = localStorage.getItem("user");
      if (savedToken && savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setRefreshTokenValue(savedRefresh);
        setUser(parsedUser);
      }
    } catch {
      // Corrupt "user" JSON left the session half-restored: no user in context,
      // but a stale token still in storage that fetchApi would keep sending.
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Keep tabs in sync. Signing out (or in) in one tab otherwise leaves every
  // other open tab showing the old session until its next request 401s.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "accessToken" && e.key !== "user" && e.key !== null) return;
      const savedToken = localStorage.getItem("accessToken");
      const savedUser = localStorage.getItem("user");
      if (!savedToken || !savedUser) {
        setToken(null);
        setRefreshTokenValue(null);
        setUser(null);
        return;
      }
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
        setRefreshTokenValue(localStorage.getItem("refreshToken"));
      } catch {
        setToken(null);
        setRefreshTokenValue(null);
        setUser(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const currentRefresh = refreshTokenValue || localStorage.getItem("refreshToken");
    if (!currentRefresh) return false;
    try {
      const res = await authApi.refreshToken(currentRefresh);
      const data = res?.data || res;
      const newAccessToken = data?.accessToken;
      const newRefreshToken = data?.refreshToken;
      if (newAccessToken) {
        setToken(newAccessToken);
        localStorage.setItem("accessToken", newAccessToken);
        if (newRefreshToken) {
          setRefreshTokenValue(newRefreshToken);
          localStorage.setItem("refreshToken", newRefreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [refreshTokenValue]);

  const login = useCallback((payload: { accessToken: string; refreshToken: string; user: User }) => {
    const { accessToken, refreshToken: refresh, user: userData } = payload;
    setToken(accessToken);
    setRefreshTokenValue(refresh);
    setUser(userData);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refresh);
    localStorage.setItem("user", JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    // Clear the local session first and unconditionally — signing out must
    // never appear to fail because the network did.
    setToken(null);
    setRefreshTokenValue(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    // The refresh cookie is httpOnly, so only the server can drop it. Without
    // this the session survived logout: /auth/refresh-token reads that cookie
    // when the request body has no token, and would hand back a fresh session.
    void authApi.logout().catch(() => {
      /* best effort — the local session is already gone */
    });
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...userData };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Memoised like CartProvider's value. A fresh object literal here gives every
  // useAuth() consumer a new context value on each AuthProvider render — and
  // the consumers include the Header and every ProductCard on the page, so a
  // whole grid re-rendered for no state change.
  const value = useMemo(
    () => ({
      user,
      token,
      refreshToken: refreshTokenValue,
      isAuthenticated: !!user && !!token,
      isLoading,
      login,
      logout,
      updateUser,
      refreshAccessToken,
    }),
    [user, token, refreshTokenValue, isLoading, login, logout, updateUser, refreshAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
