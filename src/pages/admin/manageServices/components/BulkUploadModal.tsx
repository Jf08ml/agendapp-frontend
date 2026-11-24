// Carga masiva de servicios en pasos (design system, ServiciosPanel):
// plantilla → archivo → revisión → resultado. Fase 2: el Excel se lee en el
// navegador y antes de guardar se ve qué se actualiza, qué es nuevo y qué tiene
// errores (bulkPreview.ts, con las mismas reglas del servidor). Solo se envían
// las filas nuevas o con cambios.
import { useMemo, useRef, useState } from "react";
import { Button, FileButton, Group, Modal } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconAlertTriangle, IconCheck, IconDownload, IconFileSpreadsheet, IconPlus, IconRefresh, IconUpload } from "@tabler/icons-react";
import * as XLSX from "xlsx";
import { useSelector } from "react-redux";
import { bulkUploadServices, type Service } from "../../../../services/serviceService";
import { RootState } from "../../../../app/store";
import { formatCurrency } from "../../../../utils/formatCurrency";
import { buildPreview, parseServiceRows, uploadPayload, type PreviewRow, type RowKind } from "../bulkPreview";

interface BulkUploadModalProps {
  opened: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  /** Servicios actuales (activos e inactivos), para saber qué cambia. */
  existingServices: Service[];
}

interface UploadResult {
  created: number;
  updated: number;
  errors: { row: number; name: string; error: string }[];
}

type Filter = "all" | RowKind;

const KIND_META: Record<RowKind, { label: string; badge: string }> = {
  new: { label: "Nuevo", badge: "ag-badge ag-badge--info" },
  update: { label: "Se actualiza", badge: "ag-badge ag-badge--success" },
  unchanged: { label: "Sin cambios", badge: "ag-badge" },
  error: { label: "Con error", badge: "ag-badge ag-badge--danger" },
};

export default function BulkUploadModal({ opened, onClose, onUploadComplete, existingServices }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const resetRef = useRef<() => void>(null);
  const organizationId = useSelector((s: RootState) => s.auth.organizationId);
  const currency = useSelector((s: RootState) => s.organization.organization?.currency) || "COP";
  const money = (n: number) => formatCurrency(n, currency);

  const counts = useMemo(() => {
    const c: Record<RowKind, number> = { new: 0, update: 0, unchanged: 0, error: 0 };
    preview?.forEach((p) => c[p.kind]++);
    return c;
  }, [preview]);
  const toSave = counts.new + counts.update;
  const visible = (preview ?? []).filter((p) => filter === "all" || p.kind === filter);

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setFilter("all");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = parseServiceRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet));
        if (rows.length === 0) {
          setPreview(null);
          showNotification({ color: "yellow", title: "Archivo vacío", message: "No encontramos servicios en la primera hoja del archivo." });
          return;
        }
        setPreview(buildPreview(rows, existingServices, money).rows);
      } catch {
        setPreview(null);
        showNotification({ color: "red", title: "No pudimos leer el archivo", message: "Revisa que sea un Excel (.xlsx o .xls)." });
      }
    };
    reader.readAsBinaryString(selected);
  };

  const handleUpload = async () => {
    if (!organizationId || !preview || toSave === 0) return;
    const { rows, excelRows } = uploadPayload(preview);
    setUploading(true);
    try {
      const res = await bulkUploadServices(rows, organizationId);
      // El servidor numera por posición en el envío: se traduce a la fila del Excel
      setResult({
        created: res.created ?? 0,
        updated: res.updated ?? 0,
        errors: res.errors.map((er) => ({ ...er, row: excelRows[er.row - 2] ?? er.row })),
      });
      if (res.totalSuccess > 0) onUploadComplete();
    } catch {
      showNotification({ color: "red", title: "No se guardó la carga", message: "Ocurrió un error al guardar los servicios. Inténtalo de nuevo." });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      { ID: "", "Nombre del Servicio": "Corte de cabello", Tipo: "Barbería", Descripción: "Corte clásico", "Duración (minutos)": 30, Precio: 15000, "Citas Simultáneas": 1, Activo: "Sí", Destacado: "Sí", "Ocultar Precio": "No" },
      { ID: "", "Nombre del Servicio": "Manicure", Tipo: "Belleza", Descripción: "Manicure con esmaltado", "Duración (minutos)": 45, Precio: 25000, "Citas Simultáneas": 2, Activo: "Sí", Destacado: "No", "Ocultar Precio": "No" },
    ];
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Servicios");
    XLSX.writeFile(workbook, "plantilla_servicios.xlsx");
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setFilter("all");
    resetRef.current?.();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const step = result ? 4 : preview ? 3 : 2;

  return (
    <Modal opened={opened} onClose={handleClose} title="Cargar servicios desde Excel" size="xl" styles={{ body: { maxHeight: "75vh", overflowY: "auto" } }}>
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        {/* Pasos */}
        <ol className="ag-row" style={{ gap: 6, margin: 0, padding: 0, listStyle: "none", flexWrap: "wrap", fontSize: 13 }}>
          {["Plantilla", "Archivo", "Revisión", "Listo"].map((label, i) => {
            const n = i + 1;
            const done = n < step || (n === 1 && step > 1);
            const on = n === step;
            return (
              <li key={label} className="ag-row" style={{ gap: 6, alignItems: "center", color: on ? "var(--ink)" : "var(--ink-muted)", fontWeight: on ? 600 : 400 }}>
                {i > 0 && <span aria-hidden style={{ width: 16, height: 1, background: "var(--line-strong)" }} />}
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    background: on || done ? "var(--ink)" : "var(--surface-hover)",
                    color: on || done ? "var(--ink-inverse)" : "var(--ink-muted)",
                  }}
                >
                  {done ? <IconCheck size={12} /> : n}
                </span>
                {label}
              </li>
            );
          })}
        </ol>

        {!result && (
          <>
            <div className="ag-card" style={{ padding: "var(--space-4)", display: "grid", gap: 10 }}>
              <div style={{ fontSize: 14 }}>
                <b>Nombre</b>, <b>Precio</b> y <b>Duración</b> (en minutos) son obligatorios. Para <b>cambiar</b> servicios que ya tienes, usa «Exportar» y edita ese archivo: la columna ID dice cuál es cuál. Para <b>crear</b>, deja el ID vacío.
              </div>
              <Group gap="xs">
                <Button variant="default" size="xs" leftSection={<IconDownload size={14} />} onClick={handleDownloadTemplate}>
                  Descargar plantilla
                </Button>
                <FileButton resetRef={resetRef} onChange={handleFileSelect} accept=".xlsx,.xls">
                  {(props) => (
                    <Button {...props} size="xs" variant={preview ? "default" : "filled"} leftSection={<IconFileSpreadsheet size={14} />}>
                      {file ? `Cambiar archivo (${file.name})` : "Elegir archivo"}
                    </Button>
                  )}
                </FileButton>
              </Group>
            </div>

            {preview && (
              <>
                {/* Resumen y filtro */}
                <div className="ag-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {(
                    [
                      ["all", `Todos (${preview.length})`],
                      ["update", `Se actualizan (${counts.update})`],
                      ["new", `Nuevos (${counts.new})`],
                      ["error", `Con errores (${counts.error})`],
                      ...(counts.unchanged ? [["unchanged", `Sin cambios (${counts.unchanged})`]] : []),
                    ] as [Filter, string][]
                  ).map(([key, label]) => (
                    <button key={key} type="button" className="ag-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                      {label}
                    </button>
                  ))}
                </div>

                {counts.error > 0 && (
                  <div className="ag-alert ag-alert--warning">
                    <IconAlertTriangle size={18} />
                    <div style={{ flex: 1, fontSize: 14 }}>
                      {counts.error === 1 ? "1 fila tiene errores y no se guardará." : `${counts.error} filas tienen errores y no se guardarán.`} Corrígelas en el Excel y vuelve a elegir el archivo, o guarda el resto.
                    </div>
                  </div>
                )}

                <div className="ag-card" style={{ overflowX: "auto" }}>
                  <table className="ag-table" style={{ minWidth: 640 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 56 }}>Fila</th>
                        <th>Servicio</th>
                        <th className="num">Precio</th>
                        <th className="num">Duración</th>
                        <th>Qué pasa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((p) => (
                        <tr key={p.row.excelRow}>
                          <td className="ag-num ag-muted">{p.row.excelRow}</td>
                          <td>
                            <b>{p.row.name || "Sin nombre"}</b>
                            {p.row.type && <div className="ag-subtle">{p.row.type}</div>}
                          </td>
                          <td className="num">{Number.isFinite(p.row.price) ? money(p.row.price) : "—"}</td>
                          <td className="num">{Number.isFinite(p.row.duration) ? `${p.row.duration} min` : "—"}</td>
                          <td>
                            <span className={KIND_META[p.kind].badge}>{KIND_META[p.kind].label}</span>
                            {p.changes.length > 0 && <div className="ag-subtle" style={{ marginTop: 4 }}>{p.changes.join(" · ")}</div>}
                            {p.message && (
                              <div style={{ marginTop: 4, fontSize: 13, color: p.kind === "error" ? "var(--danger)" : "var(--ink-muted)" }}>{p.message}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {visible.length === 0 && (
                        <tr>
                          <td colSpan={5} className="ag-muted" style={{ textAlign: "center" }}>
                            No hay filas en este grupo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {result && (
          <div className="ag-stack" style={{ gap: 12 }}>
            <div className={`ag-alert ${result.errors.length ? "ag-alert--warning" : "ag-alert--success"}`}>
              {result.errors.length ? <IconAlertTriangle size={18} /> : <IconCheck size={18} />}
              <div style={{ flex: 1, fontSize: 14 }}>
                <b>
                  {[result.created && `${result.created} creado${result.created === 1 ? "" : "s"}`, result.updated && `${result.updated} actualizado${result.updated === 1 ? "" : "s"}`]
                    .filter(Boolean)
                    .join(" · ") || "No se guardó ningún servicio"}
                </b>
                {result.errors.length > 0 && <div>El servidor rechazó {result.errors.length === 1 ? "1 fila" : `${result.errors.length} filas`}:</div>}
              </div>
            </div>
            {result.errors.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
                {result.errors.map((er) => (
                  <li key={`${er.row}-${er.name}`}>
                    Fila {er.row} · {er.name || "Sin nombre"}: {er.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Acciones */}
        <Group justify="flex-end" gap="xs">
          {result ? (
            <>
              <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={reset}>
                Cargar otro archivo
              </Button>
              <Button onClick={handleClose}>Listo</Button>
            </>
          ) : (
            <>
              <Button variant="subtle" color="gray" onClick={handleClose}>
                Cancelar
              </Button>
              {preview && (
                <Button
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={toSave === 0}
                  leftSection={counts.update && !counts.new ? <IconUpload size={16} /> : <IconPlus size={16} />}
                >
                  {toSave === 0 ? "Nada que guardar" : `Guardar ${toSave === 1 ? "1 servicio" : `${toSave} servicios`}`}
                </Button>
              )}
            </>
          )}
        </Group>
      </div>
    </Modal>
  );
}
