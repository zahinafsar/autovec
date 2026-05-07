"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  credits: number;
};

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<AuthUser | null>;
  setUser: (u: AuthUser | null) => void;
  openLogin: (after?: () => void) => void;
  openBuy: (after?: () => void) => void;
  loginRequest: { open: boolean; onSuccess?: () => void };
  buyRequest: { open: boolean; onSuccess?: () => void };
  closeLogin: () => void;
  closeBuy: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginRequest, setLoginRequest] = useState<{ open: boolean; onSuccess?: () => void }>({ open: false });
  const [buyRequest, setBuyRequest] = useState<{ open: boolean; onSuccess?: () => void }>({ open: false });

  const refresh = useCallback(async () => {
    const r = await fetch("/api/auth/me");
    const j = await r.json();
    setUser(j.user);
    setLoading(false);
    return j.user as AuthUser | null;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: AuthCtx = {
    user,
    loading,
    refresh,
    setUser,
    openLogin: (after) => setLoginRequest({ open: true, onSuccess: after }),
    openBuy: (after) => setBuyRequest({ open: true, onSuccess: after }),
    loginRequest,
    buyRequest,
    closeLogin: () => setLoginRequest({ open: false }),
    closeBuy: () => setBuyRequest({ open: false }),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
