import api from "../api";

export interface Espaco {
  id: number;
  nome: string;
  descricao: string;
  capacidade: number;
  empresaId: number;
}

export interface EspacoFormData {
  nome: string;
  descricao: string;
  capacidade: number;
  empresaId: number;
}

export const espacoService = {
  async getAll(): Promise<Espaco[]> {
    const response = await api.get<Espaco[]>("/espacos");
    return response.data;
  },

  async getById(id: number): Promise<Espaco> {
    const response = await api.get<Espaco>(`/espacos/${id}`);
    return response.data;
  },

  async create(data: EspacoFormData): Promise<Espaco> {
    const response = await api.post<Espaco>("/espacos", data);
    return response.data;
  },

  async update(id: number, data: Partial<EspacoFormData>): Promise<Espaco> {
    const response = await api.put<Espaco>(`/espacos/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<{ mensagem: string }> {
    const response = await api.delete<{ mensagem: string }>(`/espacos/${id}`);
    return response.data;
  },
};

