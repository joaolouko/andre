import api from "../api";
import { Reserva } from "./reservaService";

export interface DashboardStats {
  usuarios: number;
  empresas: number;
  espacos: number;
  disponibilidades: number;
  reservas: number;
  ultimasReservas: Reserva[];
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>("/dashboard/stats");
    return response.data;
  },
};

