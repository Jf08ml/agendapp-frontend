// Modelo de las pestañas de WhatsApp. Puro (sin React) para probarlo con node --test.

export type WhatsappTabKey = "conexion" | "mensajes" | "plantillas" | "campanas" | "asistentes";

export const WHATSAPP_TAB_PATHS = {
  conexion: "/gestionar-whatsapp",
  mensajes: "/mensajes-whatsapp",
  plantillas: "/mensajes-whatsapp?vista=plantillas-meta",
  campanas: "/admin/campaigns",
  asistentes: "/gestionar-whatsapp?tab=asistentes",
} as const;

export function whatsappTabs(opts: { whatsappRead: boolean; campaignsRead: boolean; isMeta: boolean }) {
  const all: { key: WhatsappTabKey; label: string; to: string; visible: boolean }[] = [
    { key: "conexion", label: "Conexión", to: WHATSAPP_TAB_PATHS.conexion, visible: opts.whatsappRead },
    { key: "mensajes", label: "Mensajes automáticos", to: WHATSAPP_TAB_PATHS.mensajes, visible: opts.whatsappRead },
    { key: "plantillas", label: "Plantillas de Meta", to: WHATSAPP_TAB_PATHS.plantillas, visible: opts.whatsappRead && opts.isMeta },
    { key: "campanas", label: "Campañas", to: WHATSAPP_TAB_PATHS.campanas, visible: opts.campaignsRead },
    { key: "asistentes", label: "Asistentes IA", to: WHATSAPP_TAB_PATHS.asistentes, visible: opts.whatsappRead },
  ];
  return all.filter((t) => t.visible).map(({ key, label, to }) => ({ key, label, to }));
}

export function activeWhatsappTab(pathname: string, search: string): WhatsappTabKey | null {
  const q = new URLSearchParams(search);
  if (pathname.startsWith("/admin/campaigns")) return "campanas";
  if (pathname.startsWith("/mensajes-whatsapp")) return q.get("vista") === "plantillas-meta" ? "plantillas" : "mensajes";
  if (pathname.startsWith("/gestionar-whatsapp")) return q.get("tab") === "asistentes" ? "asistentes" : "conexion";
  return null;
}
