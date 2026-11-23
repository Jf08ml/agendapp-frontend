// Navegación de Ajustes (rediseño, SettingsLayout): 5 grupos y una página por
// sección (?seccion=). Los enlaces viejos con ?tab= siguen funcionando.
// Puro (sin React) para probarlo con node --test.

export type SectionKey =
  | "datos"
  | "ubicacion"
  | "redes"
  | "horario"
  | "reglas"
  | "cancelacion"
  | "recordatorios"
  | "formulario-cliente"
  | "metodos"
  | "mercado-pago"
  | "abonos"
  | "formulario-tienda"
  | "marca"
  | "inicio"
  | "app"
  | "temporada"
  | "analitica"
  | "sesiones"
  | "equipo";

export interface SettingsPage {
  key: SectionKey;
  label: string;
  description: string;
}

export interface SettingsGroup {
  key: string;
  label: string;
  pages: SettingsPage[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    key: "perfil",
    label: "Perfil",
    pages: [
      { key: "datos", label: "Datos del negocio", description: "Nombre, contacto, país y zona horaria, tu enlace de reservas y el asistente IA." },
      { key: "ubicacion", label: "Ubicación y Google", description: "Dirección, mapa y tu perfil de Google." },
      { key: "redes", label: "Redes sociales", description: "Enlaces que se muestran en tu web." },
    ],
  },
  {
    key: "reservas",
    label: "Reservas",
    pages: [
      { key: "horario", label: "Horario", description: "Días y horas de atención, descansos y festivos." },
      { key: "reglas", label: "Reglas de reserva", description: "Reserva en línea, aprobación, intervalos, términos y qué pasa después de la cita." },
      { key: "cancelacion", label: "Cancelación", description: "Hasta cuándo pueden cancelar o reprogramar tus clientes." },
      { key: "recordatorios", label: "Recordatorios", description: "Cuándo se envía el recordatorio por WhatsApp." },
      { key: "formulario-cliente", label: "Formulario del cliente", description: "Qué datos pides al reservar." },
    ],
  },
  {
    key: "cobros",
    label: "Cobros",
    pages: [
      { key: "metodos", label: "Métodos de pago", description: "Cuentas y QR para transferencias." },
      { key: "mercado-pago", label: "Mercado Pago", description: "Cobra en línea con tu cuenta de Mercado Pago." },
      { key: "abonos", label: "Abonos", description: "Abono para confirmar reservas y clases." },
      { key: "formulario-tienda", label: "Formulario de la tienda", description: "Qué datos pides al comprar en tu tienda." },
    ],
  },
  {
    key: "web",
    label: "Marca y web",
    pages: [
      { key: "marca", label: "Marca", description: "Logo, colores y tipografía." },
      { key: "inicio", label: "Página de inicio", description: "Plantilla, mensaje de bienvenida y bloques de tu web." },
      { key: "app", label: "App instalable", description: "Ícono y nombre al instalar tu web en el celular." },
      { key: "temporada", label: "Temporada", description: "Decoración de temporada en tu web." },
      { key: "analitica", label: "Analítica y píxeles", description: "Google Analytics y Google Ads." },
    ],
  },
  {
    key: "seguridad",
    label: "Seguridad",
    pages: [
      { key: "sesiones", label: "Sesiones activas", description: "Dónde está abierta tu cuenta." },
      { key: "equipo", label: "Equipo y permisos", description: "Qué puede hacer cada persona en la agenda." },
    ],
  },
];

const ALL_PAGES: SettingsPage[] = SETTINGS_GROUPS.flatMap((g) => g.pages);

/** Ruta del módulo de fidelidad (Clientes › Fidelidad, decisión 6). */
export const LOYALTY_PATH = "/fidelidad";

/**
 * Enlaces viejos de Ajustes que ahora viven en Clientes › Fidelidad:
 * ?tab=fidelity, ?seccion=fidelidad (programa) y ?seccion=tarjeta (diseño).
 * Devuelve la ruta a la que hay que redirigir, o null si no aplica.
 */
export function loyaltyRedirect(seccion: string | null, tab: string | null): string | null {
  if (seccion === "tarjeta") return `${LOYALTY_PATH}?tab=tarjeta`;
  if (seccion === "fidelidad" || tab === "fidelity") return `${LOYALTY_PATH}?tab=programa`;
  return null;
}

/** Pestañas viejas (?tab=) → sección nueva. */
const LEGACY_TABS: Record<string, SectionKey> = {
  contact: "datos",
  openingsHours: "horario",
  socialMedia: "redes",
  location: "ubicacion",
  branding: "marca",
  payments: "metodos",
  cancellation: "cancelacion",
  reminders: "recordatorios",
  clientForm: "formulario-cliente",
  storeForm: "formulario-tienda",
  marketing: "analitica",
  sessions: "sesiones",
};

/**
 * Sección pedida en la URL. null = ninguna (en móvil se muestra la lista; en
 * escritorio, la primera página).
 */
export function resolveSection(seccion: string | null, tab: string | null): SectionKey | null {
  if (seccion && ALL_PAGES.some((p) => p.key === seccion)) return seccion as SectionKey;
  if (tab && LEGACY_TABS[tab]) return LEGACY_TABS[tab];
  return null;
}

export const findPage = (key: SectionKey): SettingsPage => ALL_PAGES.find((p) => p.key === key) ?? ALL_PAGES[0];

export const groupOf = (key: SectionKey): SettingsGroup | undefined => SETTINGS_GROUPS.find((g) => g.pages.some((p) => p.key === key));
