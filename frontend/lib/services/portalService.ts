import api from "../api";
import type { Espaco } from "./espacoService";
import type { Reserva } from "./reservaService";
import type { Disponibilidade } from "./disponibilidadeService";

export interface PortalBlock {
  id: number;
  kind: "MAINTENANCE" | "INTERNAL_EVENT";
  title: string;
  start_datetime: string;
  end_datetime: string;
}

export interface PortalAvailability {
  space: Espaco;
  date: string;
  day_of_week: number;
  windows: Disponibilidade[];
  reservations: Pick<Reserva, "start_datetime" | "end_datetime" | "status">[];
  blocks: PortalBlock[];
}

export interface PortalBookingRequest {
  space_id: number;
  date: string;
  start_time: string;
  end_time: string;
  note?: string;
}

export const portalService = {
  async getSpaces(): Promise<Espaco[]> {
    const response = await api.get<Espaco[]>("/portal/spaces");
    return response.data;
  },
  async getAvailability(spaceId: number, date: string): Promise<PortalAvailability> {
    const response = await api.get<PortalAvailability>("/portal/availability", { params: { space_id: spaceId, date } });
    return response.data;
  },
  async getReservations(): Promise<Reserva[]> {
    const response = await api.get<Reserva[]>("/portal/reservations");
    return response.data;
  },
  async requestReservation(data: PortalBookingRequest): Promise<Reserva> {
    const response = await api.post<Reserva>("/portal/reservations", data);
    return response.data;
  },
  async cancelReservation(id: number, reason?: string): Promise<Reserva> {
    const response = await api.patch<Reserva>(`/portal/reservations/${id}/cancel`, { reason });
    return response.data;
  },
};
