import api from "../api";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone: string;
}

export interface LoginResponse {
  mensagem: string;
  token: string;
  usuario: Usuario;
}

export const authService = {
  async login(credentials: { email: string; senha: string }): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>("/auth/login", credentials);
    return response.data;
  },

  async getMe(): Promise<{ usuario: Usuario }> {
    const response = await api.get<{ usuario: Usuario }>("/auth/me");
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

