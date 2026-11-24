// Mensajes automáticos de WhatsApp (rediseño, WhatsappPanel): grupos de la lista,
// qué interruptor controla cada mensaje y variables con nombre legible.
// Puro (sin React) para probarlo con node --test.

export type MessageToggle =
  | { kind: "switch"; settings: string[] }
  | { kind: "always"; label: string }
  | { kind: "soon" };

export interface MessageGroup {
  label: string;
  keys: string[];
}

/** Grupos del diseño: Citas, Recordatorios, Reservas online, Clientes, Fidelidad, Tienda, Avisos para ti. */
export const MESSAGE_GROUPS: MessageGroup[] = [
  { label: "Citas", keys: ["scheduleAppointment", "scheduleAppointmentBatch", "recurringAppointmentSeries", "rescheduleAppointment", "rescheduleAppointmentSeries"] },
  { label: "Recordatorios", keys: ["reminder", "secondReminder"] },
  { label: "Reservas online", keys: ["statusReservationPending", "statusReservationApproved", "statusReservationRejected"] },
  {
    label: "Clientes",
    keys: ["clientConfirmationAck", "clientCancellationAck", "clientNoShowAck", "birthdayGreeting", "followUpReminder", "googleReviewRequest", "myBookingsLink"],
  },
  { label: "Fidelidad", keys: ["loyaltyServiceReward", "loyaltyReferralReward", "loyaltyServiceProgress", "loyaltyReferralProgress", "loyaltyCardLink"] },
  { label: "Tienda", keys: ["paymentReceived"] },
  { label: "Avisos para ti", keys: ["adminPaymentAlert", "adminNewOrderAlert"] },
];

/**
 * Qué controla el interruptor de cada mensaje (claves de enabledTypes).
 * - Los recordatorios no se pueden apagar; los enlaces solo salen a pedido del cliente.
 */
export function messageToggle(key: string): MessageToggle {
  switch (key) {
    case "reminder":
    case "secondReminder":
      return { kind: "always", label: "Siempre" };
    case "myBookingsLink":
    case "loyaltyCardLink":
      return { kind: "always", label: "A pedido" };
    case "statusReservationApproved":
    case "statusReservationRejected":
      return { kind: "soon" };
    default:
      return { kind: "switch", settings: [key] };
  }
}

/** Encendido si alguna de sus claves lo está (por defecto, encendido). */
export function isMessageOn(key: string, settings: Record<string, boolean | undefined>): boolean {
  const t = messageToggle(key);
  if (t.kind !== "switch") return t.kind === "always";
  return t.settings.some((k) => settings[k] ?? true);
}

/** Nombre legible de cada variable (lo que ve el dueño en el editor). */
export const VARIABLE_LABELS: Record<string, string> = {
  names: "Nombre del cliente",
  date: "Fecha y hora",
  previousDate: "Fecha anterior",
  dateRange: "Fechas",
  date_range: "Fechas",
  organization: "Nombre del negocio",
  address: "Dirección",
  service: "Servicio",
  originalService: "Servicio original",
  servicesList: "Servicios",
  services_list: "Servicios",
  employee: "Profesional",
  cancellationLink: "Enlace para cancelar",
  manage_block: "Enlace para confirmar o cancelar",
  appointmentsList: "Lista de citas",
  appointments_list: "Lista de citas",
  count: "Número de citas",
  cita_pal: "cita o citas",
  agendada_pal: "agendada o agendadas",
  recommendations: "Recomendaciones",
  reward: "Premio",
  nextReward: "Próximo premio",
  currentCount: "Llevas",
  remaining: "Faltan",
  cardUrl: "Enlace a la tarjeta",
  bookingsUrl: "Enlace a Mis reservas",
  beneficio: "Beneficio de cumpleaños",
  days: "Días desde el servicio",
  reviewUrl: "Enlace para la reseña",
  monto: "Monto",
  detalle: "Detalle",
  tipo: "Tipo de pago",
  estado: "Estado",
  cliente: "Cliente",
  pedido: "Pedido",
  entrega: "Entrega",
  pago: "Pago",
};

/** Datos de ejemplo para la vista previa en burbuja. */
export const SAMPLE_VALUES: Record<string, string> = {
  names: "Laura",
  date: "sábado 29 de noviembre, 10:00 a. m.",
  previousDate: "viernes 28 de noviembre, 3:00 p. m.",
  dateRange: "29 y 30 de noviembre",
  date_range: "sábado 29 de noviembre",
  address: "Calle 10 # 20-30",
  service: "Volumen griego",
  originalService: "Montura de pestañas",
  servicesList: "• Volumen griego\n• Diseño de cejas",
  services_list: "• Volumen griego",
  employee: "Nataly",
  cancellationLink: "https://agenditapp.com/c/abc123",
  manage_block: "Confirma o cancela aquí: https://agenditapp.com/c/abc123",
  appointmentsList: "• 29/11 10:00 a. m.\n• 06/12 10:00 a. m.",
  appointments_list: "• 29/11 10:00 a. m.",
  count: "1",
  cita_pal: "cita",
  agendada_pal: "agendada",
  recommendations: "Llega con las pestañas limpias.",
  reward: "un 20% de descuento",
  nextReward: "un servicio gratis",
  currentCount: "3",
  remaining: "2",
  cardUrl: "https://agenditapp.com/t/abc123",
  bookingsUrl: "https://agenditapp.com/r/abc123",
  beneficio: "20% de descuento en tu próximo servicio",
  days: "21",
  reviewUrl: "https://g.page/r/abc123/review",
  monto: "$ 45.000",
  detalle: "2× Shampoo, 1× Cera",
  tipo: "reserva",
  estado: "validado",
  cliente: "Laura Gómez",
  pedido: "3 productos · $ 45.000",
  entrega: "domicilio",
  pago: "pagado",
};

const varName = (token: string) => token.replace(/^\{\{|\}\}$/g, "");

/** Etiqueta legible de una variable dentro de una plantilla (única dentro de ella). */
export function labelFor(name: string): string {
  return VARIABLE_LABELS[name] ?? name;
}

/**
 * `{{names}}` → `[Nombre del cliente]`, solo para las variables que admite la
 * plantilla; las demás quedan tal cual.
 */
export function toReadable(content: string, variables: string[]): string {
  const allowed = new Set(variables.map(varName));
  return content.replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (m, name: string) => (allowed.has(name) ? `[${labelFor(name)}]` : m));
}

/** `[Nombre del cliente]` → `{{names}}` (inverso de toReadable). */
export function fromReadable(text: string, variables: string[]): string {
  const byLabel = new Map<string, string>();
  for (const v of variables.map(varName)) byLabel.set(labelFor(v), v);
  return text.replace(/\[([^[\]\n]+)\]/g, (m, label: string) => {
    const name = byLabel.get(label.trim());
    return name ? `{{${name}}}` : m;
  });
}

/** Vista previa: reemplaza las variables (formato interno) por datos de ejemplo. */
export function previewText(content: string, organizationName: string): string {
  return content.replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (m, name: string) =>
    name === "organization" ? organizationName : SAMPLE_VALUES[name] ?? m
  );
}
