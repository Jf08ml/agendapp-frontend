// Segmentos de clientes, última visita y exportación (design system,
// ClientesPanel · Fase 3). Las cifras por cliente vienen del servidor
// (GET /clients/stats); aquí se arman los segmentos. Puro para `node --test`.

export interface ClientStat {
  lastVisit: string | null;
  visits: number;
  totalSpent: number;
  activePackage: boolean;
}

export type Segment = "todos" | "frecuentes" | "inactivos" | "cumpleanos" | "paquete";

export const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "frecuentes", label: "Frecuentes" },
  { key: "inactivos", label: "Inactivos +60 días" },
  { key: "cumpleanos", label: "Cumplen años este mes" },
  { key: "paquete", label: "Con paquete activo" },
];

/** 5 visitas o más. */
export const FREQUENT_VISITS = 5;
/** Sin venir hace más de 60 días (y vino al menos una vez). */
export const INACTIVE_DAYS = 60;

interface ClientLike {
  _id: string;
  birthDate?: string | Date | null;
}

/** Mes (1–12) del cumpleaños, leído en UTC para que una fecha guardada a medianoche no cambie de mes. */
function birthMonth(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  return Number.isNaN(d.getTime()) ? null : d.getUTCMonth() + 1;
}

export function inSegment(client: ClientLike, stat: ClientStat | undefined, segment: Segment, now: Date = new Date()): boolean {
  switch (segment) {
    case "todos":
      return true;
    case "frecuentes":
      return (stat?.visits ?? 0) >= FREQUENT_VISITS;
    case "inactivos":
      return !!stat?.lastVisit && now.getTime() - new Date(stat.lastVisit).getTime() > INACTIVE_DAYS * 86400000;
    case "cumpleanos":
      return birthMonth(client.birthDate) === now.getMonth() + 1;
    case "paquete":
      return !!stat?.activePackage;
  }
}

/** «Hoy», «Hace 3 días», «Hace 2 semanas», «Hace 4 meses», «Hace 1 año» o «Sin visitas». */
export function lastVisitLabel(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "Sin visitas";
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 14) return `Hace ${days} días`;
  if (days < 60) return `Hace ${Math.floor(days / 7)} semanas`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} meses`;
  const years = Math.floor(days / 365);
  return years === 1 ? "Hace 1 año" : `Hace ${years} años`;
}

interface ExportClient extends ClientLike {
  name: string;
  phone_e164?: string;
  phoneNumber?: string;
  email?: string;
  documentId?: string;
}

/** Filas para exportar la lista (las columnas que ve el dueño, en español). */
export function exportRows(clients: ExportClient[], stats: Record<string, ClientStat>) {
  return clients.map((c) => {
    const s = stats[c._id];
    const bd = c.birthDate ? new Date(c.birthDate) : null;
    return {
      Nombre: c.name,
      Teléfono: c.phone_e164 || c.phoneNumber || "",
      Correo: c.email || "",
      Documento: c.documentId || "",
      Cumpleaños: bd && !Number.isNaN(bd.getTime()) ? bd.toISOString().slice(0, 10) : "",
      "Última visita": s?.lastVisit ? s.lastVisit.slice(0, 10) : "",
      Visitas: s?.visits ?? 0,
      "Total gastado": s?.totalSpent ?? 0,
      "Paquete activo": s?.activePackage ? "Sí" : "No",
    };
  });
}
