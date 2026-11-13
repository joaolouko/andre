import api from "../api";

export type BlockKind = "MAINTENANCE" | "INTERNAL_EVENT";

export interface Bloqueio {
  id: number;
  space_id: number;
  kind: BlockKind;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  created_by: number;
  created_at: string;
}

export interface BloqueioFormData {
  space_id: number;
  kind: BlockKind;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
}

export const bloqueioService = {
  async getAll(): Promise<Bloqueio[]> {
    const response = await api.get<Bloqueio[]>("/bloqueios");
    return response.data;
  },
  async create(data: BloqueioFormData): Promise<Bloqueio> {
    const response = await api.post<Bloqueio>("/bloqueios", data);
    return response.data;
  },
  async update(id: number, data: Partial<BloqueioFormData>): Promise<Bloqueio> {
    const response = await api.put<Bloqueio>(`/bloqueios/${id}`, data);
    return response.data;
  },
  async delete(id: number): Promise<{ mensagem: string }> {
    const response = await api.delete<{ mensagem: string }>(`/bloqueios/${id}`);
    return response.data;
  },
};
