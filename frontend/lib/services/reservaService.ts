import api from "../api";

export type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface Reserva {
  id: number;
  space_id: number;
  user_id: number;
  start_datetime: string;
  end_datetime: string;
  status: BookingStatus;
  rejection_reason?: string | null;
  created_at: string;
}

export interface ReservaFormData {
  space_id: number;
  user_id: number;
  start_datetime: string;
  end_datetime: string;
  status: BookingStatus;
  rejection_reason?: string | null;
}

export const reservaService = {
  async getAll(): Promise<Reserva[]> {
    const response = await api.get<Reserva[]>("/reservas");
    return response.data;
  },
  async getByDate(data: string): Promise<Reserva[]> {
    const response = await api.get<Reserva[]>(`/reservas/data/${data}`);
    return response.data;
  },
  async getById(id: number): Promise<Reserva> {
    const response = await api.get<Reserva>(`/reservas/${id}`);
    return response.data;
  },
  async create(data: ReservaFormData): Promise<Reserva> {
    const response = await api.post<Reserva>("/reservas", data);
    return response.data;
  },
  async update(id: number, data: Partial<ReservaFormData>): Promise<Reserva> {
    const response = await api.put<Reserva>(`/reservas/${id}`, data);
    return response.data;
  },
  async delete(id: number): Promise<{ mensagem: string }> {
    const response = await api.delete<{ mensagem: string }>(`/reservas/${id}`);
    return response.data;
  },
};
