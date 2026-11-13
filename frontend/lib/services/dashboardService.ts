import api from "../api";
import type { Reserva } from "./reservaService";

export interface DashboardStats {
  usuarios: number;
  empresas: number;
  espacos: number;
  espacosAtivos: number;
  disponibilidades: number;
  reservas: number;
  pendingReservations: number;
  hoursUsed: number;
  occupancyRate: number;
  availableHours: number;
  peakHours: { hour: string; reservations: number }[];
  period: { start: string; end: string; timezone: string };
  ultimasReservas: (Reserva & { user_name: string; space_name: string })[];
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>("/dashboard/stats");
    return response.data;
  },
};
