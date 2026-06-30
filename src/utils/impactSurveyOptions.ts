// Opciones y etiquetas de la encuesta del reporte de impacto.
// Compartidas entre el modal cara-al-cliente y la tabla de seguimiento superadmin.

export const PREVIOUS_TOOL_OPTIONS = [
  { value: "papel", label: "Agenda en papel / cuaderno" },
  { value: "excel", label: "Excel / hoja de cálculo" },
  { value: "whatsapp", label: "WhatsApp o mensajes manuales" },
  { value: "otra_app", label: "Otra app de agendamiento" },
  { value: "nada", label: "Nada, lo llevaba de memoria" },
  { value: "otro", label: "Otro" },
];

export const FEWER_NO_SHOWS_OPTIONS = [
  { value: "mucho_menos", label: "Sí, muchas menos" },
  { value: "algo_menos", label: "Sí, algo menos" },
  { value: "igual", label: "Más o menos igual" },
  { value: "mas", label: "Más que antes" },
  { value: "no_se", label: "No sé / no las mido" },
];

export const BIGGEST_IMPROVEMENT_OPTIONS = [
  { value: "mas_citas", label: "Más citas / clientes" },
  { value: "menos_ausencias", label: "Menos inasistencias" },
  { value: "ahorro_tiempo", label: "Ahorro de tiempo" },
  { value: "mejor_organizacion", label: "Mejor organización" },
  { value: "clientes_reservan_solos", label: "Mis clientes reservan solos" },
  { value: "imagen_profesional", label: "Imagen más profesional" },
];

const toMap = (opts: { value: string; label: string }[]) =>
  Object.fromEntries(opts.map((o) => [o.value, o.label])) as Record<string, string>;

export const PREVIOUS_TOOL_LABELS = toMap(PREVIOUS_TOOL_OPTIONS);
export const FEWER_NO_SHOWS_LABELS = toMap(FEWER_NO_SHOWS_OPTIONS);
export const BIGGEST_IMPROVEMENT_LABELS = toMap(BIGGEST_IMPROVEMENT_OPTIONS);
