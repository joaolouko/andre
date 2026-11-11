import api from "../api";

export type UserRole = "ADMIN" | "CLIENT" | "RECEPTION";

export interface Usuario {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  cpf_cnpj: string | null;
  company_id: number | null;
  created_at: string;
}

export interface UsuarioFormData {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  role: UserRole;
  cpf_cnpj: string | null;
  company_id: number | null;
}

export const usuarioService = {
  async getAll(): Promise<Usuario[]> {
    const response = await api.get<Usuario[]>("/usuarios");
    return response.data;
  },
  async getById(id: number): Promise<Usuario> {
    const response = await api.get<Usuario>(`/usuarios/${id}`);
    return response.data;
  },
  async create(data: UsuarioFormData): Promise<Usuario> {
    const response = await api.post<Usuario>("/usuarios", data);
    return response.data;
  },
  async update(id: number, data: Partial<UsuarioFormData>): Promise<Usuario> {
    const response = await api.put<Usuario>(`/usuarios/${id}`, data);
    return response.data;
  },
  async delete(id: number): Promise<{ mensagem: string }> {
    const response = await api.delete<{ mensagem: string }>(`/usuarios/${id}`);
    return response.data;
  },
};
