// Vista previa de la carga masiva de servicios (design system, ServiciosPanel ·
// Fase 2): el Excel se lee en el navegador y, antes de guardar, se muestra qué
// se actualiza, qué es nuevo y qué tiene errores. Mismas reglas que el
// servidor (bulkCreateServices). Módulo puro para `node --test`.

/** Fila del Excel ya interpretada. `excelRow` es el número que ve el usuario. */
export interface ParsedServiceRow {
  excelRow: number;
  _id?: string;
  name: string;
  type?: string;
  description?: string;
  price: number;
  duration: number;
  hidePrice?: boolean;
  featured?: boolean;
  maxConcurrentAppointments?: number;
  isActive?: boolean;
}

export interface ExistingService {
  _id: string;
  name: string;
  type?: string;
  description?: string;
  price: number;
  duration: number;
  hidePrice?: boolean;
  featured?: boolean;
  maxConcurrentAppointments?: number;
  isActive?: boolean;
}

export type RowKind = "new" | "update" | "unchanged" | "error";

export interface PreviewRow {
  row: ParsedServiceRow;
  kind: RowKind;
  /** Error (kind "error") o aviso (por ejemplo, nombre repetido). */
  message?: string;
  /** Cambios de una actualización, en palabras: «Precio: $15.000 → $18.000». */
  changes: string[];
}

const PLACEHOLDER_ID = "(dejar vacío para crear nuevo)";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Encabezados aceptados (los de la plantilla, la exportación y los de antes)
const COLUMNS: Record<keyof Omit<ParsedServiceRow, "excelRow">, string[]> = {
  _id: ["id", "_id"],
  name: ["nombre del servicio", "nombre", "name"],
  type: ["tipo", "categoria", "type"],
  description: ["descripcion", "description"],
  price: ["precio", "price"],
  duration: ["duracion (minutos)", "duracion", "duration"],
  hidePrice: ["ocultar precio", "hideprice"],
  featured: ["destacado", "featured"],
  maxConcurrentAppointments: ["citas simultaneas", "citas concurrentes", "maxconcurrentappointments"],
  isActive: ["activo", "isactive"],
};

function pick(raw: Record<string, unknown>, keys: string[]): unknown {
  const wanted = keys.map(norm);
  for (const [k, v] of Object.entries(raw)) if (wanted.includes(norm(k))) return v;
  return undefined;
}

const text = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

/** «Sí»/«No», true/false; vacío o sin columna → undefined (no se toca). */
function yesNo(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  const t = norm(text(v));
  if (!t) return undefined;
  if (["si", "s", "true", "1", "yes"].includes(t)) return true;
  if (["no", "n", "false", "0"].includes(t)) return false;
  return undefined;
}

/** Número de precio o duración: acepta «15.000», «$ 15,000», «30 min». */
function num(v: unknown): number {
  if (typeof v === "number") return v;
  const t = text(v).replace(/[^\d.,-]/g, "");
  if (!t) return NaN;
  // «15.000» o «15,000» con 3 dígitos al final = miles
  const thousands = /^-?\d{1,3}([.,]\d{3})+$/.test(t);
  return Number(thousands ? t.replace(/[.,]/g, "") : t.replace(",", "."));
}

/**
 * Filas del Excel (sheet_to_json) → filas de servicio. Se saltan las vacías y
 * la nota de la plantilla. `firstRow` es la fila de Excel del primer dato.
 */
export function parseServiceRows(json: Record<string, unknown>[], firstRow = 2): ParsedServiceRow[] {
  const out: ParsedServiceRow[] = [];
  json.forEach((raw, i) => {
    const id = text(pick(raw, COLUMNS._id));
    const name = text(pick(raw, COLUMNS.name));
    const priceRaw = pick(raw, COLUMNS.price);
    const durationRaw = pick(raw, COLUMNS.duration);
    if (/^nota\b/i.test(id) || /^nota\b/i.test(name)) return; // nota de la plantilla
    if (!id && !name && text(priceRaw) === "" && text(durationRaw) === "") return; // fila vacía
    const max = pick(raw, COLUMNS.maxConcurrentAppointments);
    // sheet_to_json deja la fila real en __rowNum__ (base 0) aunque salte vacías
    const rowNum = (raw as { __rowNum__?: unknown }).__rowNum__;
    out.push({
      excelRow: typeof rowNum === "number" ? rowNum + 1 : firstRow + i,
      _id: id && id !== PLACEHOLDER_ID ? id : undefined,
      name,
      type: text(pick(raw, COLUMNS.type)) || undefined,
      description: text(pick(raw, COLUMNS.description)) || undefined,
      price: num(priceRaw),
      duration: num(durationRaw),
      hidePrice: yesNo(pick(raw, COLUMNS.hidePrice)),
      featured: yesNo(pick(raw, COLUMNS.featured)),
      maxConcurrentAppointments: text(max) === "" ? undefined : num(max),
      isActive: yesNo(pick(raw, COLUMNS.isActive)),
    });
  });
  return out;
}

/** Error de la fila con las reglas del servidor, o null. */
function rowError(r: ParsedServiceRow): string | null {
  if (!r.name) return "Falta el nombre del servicio.";
  if (!Number.isFinite(r.price) || r.price < 0) return "El precio debe ser un número igual o mayor a 0.";
  if (!Number.isFinite(r.duration) || r.duration <= 0) return "La duración debe ser un número de minutos mayor a 0.";
  if (!Number.isInteger(r.duration)) return "La duración va en minutos enteros.";
  if (r.maxConcurrentAppointments !== undefined && (!Number.isInteger(r.maxConcurrentAppointments) || r.maxConcurrentAppointments < 1))
    return "Las citas simultáneas deben ser un número entero desde 1.";
  return null;
}

/** Arma la revisión: nuevos, actualizados, sin cambios y con errores. */
export function buildPreview(
  rows: ParsedServiceRow[],
  existing: ExistingService[],
  money: (n: number) => string = (n) => String(n)
): { rows: PreviewRow[]; counts: Record<RowKind, number> } {
  const byId = new Map(existing.map((s) => [s._id, s]));
  const existingNames = new Set(existing.map((s) => norm(s.name)));
  const seenIds = new Set<string>();
  const seenNewNames = new Set<string>();
  const result: PreviewRow[] = rows.map((r) => {
    const err = rowError(r);
    if (err) return { row: r, kind: "error", message: err, changes: [] };
    if (r._id) {
      const cur = byId.get(r._id);
      if (!cur) return { row: r, kind: "error", message: "Ese ID no es de uno de tus servicios. Déjalo vacío para crear uno nuevo.", changes: [] };
      if (seenIds.has(r._id)) return { row: r, kind: "error", message: "Este servicio ya está más arriba en el archivo.", changes: [] };
      seenIds.add(r._id);
      const changes: string[] = [];
      const yn = (b?: boolean) => (b ? "Sí" : "No");
      if (r.name !== cur.name) changes.push(`Nombre: ${cur.name} → ${r.name}`);
      if (r.price !== Number(cur.price)) changes.push(`Precio: ${money(Number(cur.price))} → ${money(r.price)}`);
      if (r.duration !== Number(cur.duration)) changes.push(`Duración: ${cur.duration} → ${r.duration} min`);
      // Campos opcionales: si la celda viene vacía o falta la columna, el
      // servidor no los toca (bulkServiceRow en el backend), así que no cambian.
      if (r.type !== undefined && r.type !== (cur.type ?? "")) changes.push(`Categoría: ${cur.type || "sin categoría"} → ${r.type}`);
      if (r.description !== undefined && r.description !== (cur.description ?? "")) changes.push("Cambia la descripción");
      if (r.hidePrice !== undefined && r.hidePrice !== !!cur.hidePrice) changes.push(`Ocultar precio: ${yn(cur.hidePrice)} → ${yn(r.hidePrice)}`);
      if (r.featured !== undefined && r.featured !== !!cur.featured) changes.push(`Destacado: ${yn(cur.featured)} → ${yn(r.featured)}`);
      if (r.isActive !== undefined && r.isActive !== (cur.isActive !== false)) changes.push(r.isActive ? "Se activa" : "Se desactiva");
      if (r.maxConcurrentAppointments !== undefined && r.maxConcurrentAppointments !== (cur.maxConcurrentAppointments ?? 1))
        changes.push(`Citas simultáneas: ${cur.maxConcurrentAppointments ?? 1} → ${r.maxConcurrentAppointments}`);
      return { row: r, kind: changes.length ? "update" : "unchanged", changes };
    }
    const key = norm(r.name);
    let message: string | undefined;
    if (existingNames.has(key)) message = "Ya tienes un servicio con este nombre: se creará otro. Para cambiar el que tienes, usa su ID.";
    else if (seenNewNames.has(key)) message = "Este nombre se repite en el archivo: se crearán dos.";
    seenNewNames.add(key);
    return { row: r, kind: "new", message, changes: [] };
  });
  const counts: Record<RowKind, number> = { new: 0, update: 0, unchanged: 0, error: 0 };
  result.forEach((p) => counts[p.kind]++);
  return { rows: result, counts };
}

/** Lo que se envía: solo nuevos y actualizados, con su fila de Excel. */
export function uploadPayload(preview: PreviewRow[]): { rows: Omit<ParsedServiceRow, "excelRow">[]; excelRows: number[] } {
  const send = preview.filter((p) => p.kind === "new" || p.kind === "update");
  return {
    rows: send.map(({ row: { excelRow: _excelRow, ...rest } }) => rest), // eslint-disable-line @typescript-eslint/no-unused-vars
    excelRows: send.map((p) => p.row.excelRow),
  };
}
