import api from "../api";

export type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export interface ReservaHistoryEntry {
  action: "REQUESTED" | "UPDATED" | "APPROVED" | "REJECTED" | "CANCELLED";
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  changed_by: number;
  changed_at: string;
  note?: string | null;
}

export interface Reserva {
  id: number;
  space_id: number;
  user_id: number;
  start_datetime: string;
  end_datetime: string;
  status: BookingStatus;
  rejection_reason?: string | null;
  created_at: string;
  history: ReservaHistoryEntry[];
  space_name?: string;
}

export interface ReservaFormData {
  space_id: number;
  user_id: number;
  start_datetime: string;
  end_datetime: string;
  status: BookingStatus;
  rejection_reason?: string | null;
}

export interface ReservationOptions {
  users: { id: number; name: string; email: string; role: "ADMIN" | "CLIENT" | "RECEPTION" }[];
  spaces: { id: number; name: string; capacity: number; type: string; is_active: boolean }[];
}

export const reservaService = {
  async getOptions(): Promise<ReservationOptions> {
    const response = await api.get<ReservationOptions>("/reservas/options");
    return response.data;
  },
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
