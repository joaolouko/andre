import api from "../api";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  senha?: string;
}

export interface UsuarioFormData {
  nome: string;
  email: string;
  telefone: string;
  senha?: string;
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

