import api from "../api";
import type { Reserva } from "./reservaService";
import type { Disponibilidade } from "./disponibilidadeService";
import type { Espaco } from "./espacoService";
import type { Bloqueio } from "./bloqueioService";

export interface AgendaData {
  from: string;
  to: string;
  reservations: Reserva[];
  blocks: Bloqueio[];
  availabilities: Disponibilidade[];
  spaces: Espaco[];
}

export const agendaService = {
  async getRange(from: string, to: string, spaceId?: number): Promise<AgendaData> {
    const response = await api.get<AgendaData>("/agenda", { params: { from, to, ...(spaceId ? { space_id: spaceId } : {}) } });
    return response.data;
  },
};
