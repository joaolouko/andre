import api from "../api";

export interface Disponibilidade {
  id: number;
  espacoId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
}

export interface DisponibilidadeFormData {
  espacoId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
}

export const disponibilidadeService = {
  async getAll(): Promise<Disponibilidade[]> {
    const response = await api.get<Disponibilidade[]>("/disponibilidades");
    return response.data;
  },

  async getByDate(data: string): Promise<Disponibilidade[]> {
    const response = await api.get<Disponibilidade[]>(`/disponibilidades/data/${data}`);
    return response.data;
  },

  async getById(id: number): Promise<Disponibilidade> {
    const response = await api.get<Disponibilidade>(`/disponibilidades/${id}`);
    return response.data;
  },

  async create(data: DisponibilidadeFormData): Promise<Disponibilidade> {
    const response = await api.post<Disponibilidade>("/disponibilidades", data);
    return response.data;
  },

  async update(id: number, data: Partial<DisponibilidadeFormData>): Promise<Disponibilidade> {
    const response = await api.put<Disponibilidade>(`/disponibilidades/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<{ mensagem: string }> {
    const response = await api.delete<{ mensagem: string }>(`/disponibilidades/${id}`);
    return response.data;
  },
};

