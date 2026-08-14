"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
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
        setToken(savedToken);
        setRefreshTokenValue(savedRefresh);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
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
    setToken(null);
    setRefreshTokenValue(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...userData };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken: refreshTokenValue,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        updateUser,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
