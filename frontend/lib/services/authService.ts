import api from "../api";
import type { Usuario } from "./usuarioService";

export type AuthUser = Pick<Usuario, "id" | "name" | "email" | "role" | "phone" | "cpf_cnpj" | "company_id" | "created_at">;

export interface LoginResponse {
  mensagem?: string;
  token: string;
  user?: AuthUser;
  usuario?: AuthUser;
}

export interface MeResponse {
  user?: AuthUser;
  usuario?: AuthUser;
}

export const authService = {
  async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>("/auth/login", credentials);
    return response.data;
  },
  async getMe(): Promise<MeResponse> {
    const response = await api.get<MeResponse>("/auth/me");
    return response.data;
  },
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("gestao_espacos_token");
        localStorage.removeItem("gestao_espacos_user");
      }
    }
  },
};
