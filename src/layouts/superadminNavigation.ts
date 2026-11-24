// Navegación de plataforma del superadmin (rediseño, paginas-superadmin.md ›
// «Secciones unidas»): 6 secciones en dos grupos. Cada pestaña es la ruta de
// siempre, así que ningún enlace ni redirect cambia.

export interface SaTab {
  label: string;
  to: string;
}

export interface SaSection {
  key: "negocios" | "ventas" | "metricas" | "novedades" | "whatsapp" | "chatbots";
  label: string;
  /** Entrada desde la navegación lateral */
  to: string;
  tabs: SaTab[];
  /** Rutas extra que pertenecen a la sección (fichas de detalle) */
  extra?: { prefix: string; tab: string }[];
}

export interface SaGroup {
  title: string;
  sections: SaSection[];
}

export const SUPERADMIN_NAV: SaGroup[] = [
  {
    title: "Gestión",
    sections: [
      {
        key: "negocios",
        label: "Negocios",
        to: "/superadmin/orgs",
        tabs: [
          { label: "Organizaciones", to: "/superadmin/orgs" },
          { label: "Membresías", to: "/superadmin" },
        ],
        extra: [{ prefix: "/superadmin/organizaciones/", tab: "/superadmin/orgs" }],
      },
      {
        key: "ventas",
        label: "Ventas",
        to: "/superadmin/planes",
        tabs: [
          { label: "Planes", to: "/superadmin/planes" },
          { label: "Agentes", to: "/superadmin/agentes" },
        ],
      },
      {
        key: "metricas",
        label: "Métricas",
        to: "/superadmin/analiticas",
        tabs: [
          { label: "Analítica", to: "/superadmin/analiticas" },
          { label: "Activación", to: "/superadmin/activacion" },
          { label: "Impacto", to: "/superadmin/impacto" },
        ],
      },
    ],
  },
  {
    title: "Comunicación",
    sections: [
      {
        key: "novedades",
        label: "Novedades",
        to: "/superadmin/anuncios",
        tabs: [
          { label: "Anuncios", to: "/superadmin/anuncios" },
          { label: "Solicitudes", to: "/superadmin/solicitudes" },
        ],
      },
      { key: "whatsapp", label: "WhatsApp", to: "/superadmin/whatsapp", tabs: [{ label: "WhatsApp", to: "/superadmin/whatsapp" }] },
      { key: "chatbots", label: "Chatbots", to: "/superadmin/chatbots", tabs: [{ label: "Chatbots", to: "/superadmin/chatbots" }] },
    ],
  },
];

const trimSlash = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/** Sección y pestaña activas para una ruta; null fuera del panel. */
export function findSuperadminLocation(pathname: string): { section: SaSection; tab: string } | null {
  const path = trimSlash(pathname);
  for (const group of SUPERADMIN_NAV) {
    for (const section of group.sections) {
      const tab = section.tabs.find((t) => t.to === path);
      if (tab) return { section, tab: tab.to };
      const extra = section.extra?.find((e) => path.startsWith(e.prefix));
      if (extra) return { section, tab: extra.tab };
    }
  }
  return null;
}

/** Rutas del panel del superadmin (no el login). */
export function isSuperadminPanelPath(pathname: string): boolean {
  return pathname === "/superadmin" || pathname.startsWith("/superadmin/");
}
