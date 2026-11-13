"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, AuthUser } from "./services/authService";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      let storedToken: string | null = null;
      try {
        storedToken = localStorage.getItem("gestao_espacos_token");
        const storedUser = localStorage.getItem("gestao_espacos_user");
        if (!storedToken || !storedUser) return;
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);

        const response = await authService.getMe();
        const verifiedUser = response.user ?? response.usuario;
        if (!verifiedUser) throw new Error("A API não confirmou a sessão.");
        if (active) {
          setUser(verifiedUser);
          localStorage.setItem("gestao_espacos_user", JSON.stringify(verifiedUser));
        }
      } catch {
        if (storedToken && active) {
          localStorage.removeItem("gestao_espacos_token");
          localStorage.removeItem("gestao_espacos_user");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void restoreSession();
    return () => { active = false; };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authService.login({ email, password });
    const authenticatedUser = data.user ?? data.usuario;
    if (!authenticatedUser) throw new Error("A API não retornou os dados do usuário autenticado.");
    setToken(data.token);
    setUser(authenticatedUser);
    localStorage.setItem("gestao_espacos_token", data.token);
    localStorage.setItem("gestao_espacos_user", JSON.stringify(authenticatedUser));
    router.push(authenticatedUser.role === "CLIENT" ? "/portal" : "/dashboard");
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setToken(null);
      setUser(null);
      router.push("/login");
    }
  };

  return <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
