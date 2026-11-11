import api from "../api";

export interface Disponibilidade {
  id: number;
  space_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_external_allowed: boolean;
  valid_on?: string | null;
}

export interface DisponibilidadeFormData {
  space_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_external_allowed: boolean;
  valid_on?: string | null;
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
