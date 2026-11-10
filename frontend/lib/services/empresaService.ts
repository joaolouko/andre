import api from "../api";

export interface Empresa {
  id: number;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
}

export interface EmpresaFormData {
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
}

export const empresaService = {
  async getAll(): Promise<Empresa[]> {
    const response = await api.get<Empresa[]>("/empresas");
    return response.data;
  },

  async getById(id: number): Promise<Empresa> {
    const response = await api.get<Empresa>(`/empresas/${id}`);
    return response.data;
  },

  async create(data: EmpresaFormData): Promise<Empresa> {
    const response = await api.post<Empresa>("/empresas", data);
    return response.data;
  },

  async update(id: number, data: Partial<EmpresaFormData>): Promise<Empresa> {
    const response = await api.put<Empresa>(`/empresas/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<{ mensagem: string }> {
    const response = await api.delete<{ mensagem: string }>(`/empresas/${id}`);
    return response.data;
  },
};

