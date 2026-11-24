// Solicitudes de mejora (rediseño, SuperadminSolicitudes): chips de estado con
// conteo (calculados en el navegador), tabla y panel lateral para responder.
// La navegación de plataforma (SuperadminNav) se rediseña aparte.
import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Select, Skeleton, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconRefresh } from "@tabler/icons-react";
import SuperadminNav from "./SuperadminNav";
import {
  adminGetFeatureRequests,
  adminUpdateFeatureRequest,
  type FeatureRequestAdmin,
  type FeatureRequestStatus,
} from "../../services/featureRequestService";

const STATUS_OPTIONS: { value: FeatureRequestStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "under_review", label: "En revisión" },
  { value: "planned", label: "Planeada" },
  { value: "done", label: "Implementada" },
  { value: "declined", label: "No planeada" },
];

const STATUS_BADGE: Record<FeatureRequestStatus, string> = {
  pending: "",
  under_review: "ag-badge--info",
  planned: "ag-badge--brand",
  done: "ag-badge--success",
  declined: "ag-badge--danger",
};

const statusLabel = (s: FeatureRequestStatus) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
const fmtDate = (iso: string, month: "short" | "long" = "short") =>
  new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month, year: "numeric" });

export default function SuperadminFeatureRequests() {
  const [requests, setRequests] = useState<FeatureRequestAdmin[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [filter, setFilter] = useState<FeatureRequestStatus | "all">("all");

  const [editing, setEditing] = useState<FeatureRequestAdmin | null>(null);
  const [formStatus, setFormStatus] = useState<FeatureRequestStatus>("pending");
  const [formReply, setFormReply] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setStatus("loading");
    try {
      setRequests(await adminGetFeatureRequests());
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length };
    requests.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [requests]);

  const shown = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const openEdit = (r: FeatureRequestAdmin) => {
    setEditing(r);
    setFormStatus(r.status);
    setFormReply(r.adminReply ?? "");
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminUpdateFeatureRequest(editing._id, { status: formStatus, adminReply: formReply.trim() });
      notifications.show({ message: "Respuesta guardada." });
      setEditing(null);
      fetchAll();
    } catch {
      notifications.show({ message: "No se pudo guardar. Intenta de nuevo.", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 16 }}>
        <SuperadminNav />

        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Solicitudes de mejora</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
              Lo que piden los negocios. Cada uno ve solo las suyas y tu respuesta.
            </div>
          </div>
          <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={fetchAll} loading={status === "loading"}>
            Actualizar
          </Button>
        </div>

        <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }} role="group" aria-label="Filtrar por estado">
          {[{ value: "all" as const, label: "Todas" }, ...STATUS_OPTIONS].map((o) => (
            <button key={o.value} type="button" className="ag-chip" style={{ cursor: "pointer" }} aria-pressed={filter === o.value} onClick={() => setFilter(o.value)}>
              {o.label} <span className="count">{counts[o.value] ?? 0}</span>
            </button>
          ))}
        </div>

        {status === "error" ? (
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>No pudimos cargar las solicitudes.</div>
            <Button size="xs" variant="default" onClick={fetchAll}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="ag-card" style={{ overflowX: "auto" }}>
            <table className="ag-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Organización</th>
                  <th>Solicitud</th>
                  <th>Pidió</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {status === "loading" && requests.length === 0 ? (
                  [0, 1, 2].map((i) => (
                    <tr key={i}>
                      <td colSpan={6}>
                        <Skeleton height={16} />
                      </td>
                    </tr>
                  ))
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="ag-muted" style={{ textAlign: "center", padding: "32px 16px" }}>
                      {filter === "all" ? "Aún no hay solicitudes." : `No hay solicitudes en «${statusLabel(filter)}».`}
                    </td>
                  </tr>
                ) : (
                  shown.map((r) => (
                    <tr key={r._id}>
                      <td style={{ fontWeight: 600 }}>{r.organizationId?.name ?? "—"}</td>
                      <td style={{ maxWidth: 360 }}>
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.text}</span>
                      </td>
                      <td>
                        <div>{r.submittedByName ?? "—"}</div>
                        {r.submittedByRole && <div className="ag-subtle">{r.submittedByRole === "admin" ? "Dueño/a" : "Empleado/a"}</div>}
                      </td>
                      <td className="ag-num" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.createdAt)}</td>
                      <td>
                        <div className="ag-row" style={{ gap: 4 }}>
                          <span className={`ag-badge ${STATUS_BADGE[r.status]}`}>{statusLabel(r.status)}</span>
                          {r.closedByOrg && (
                            <span className="ag-badge ag-badge--outline" title="La organización la quitó de su lista">
                              Retirada
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Button size="xs" variant="default" onClick={() => openEdit(r)}>
                          Responder
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer opened={!!editing} onClose={() => setEditing(null)} position="right" size={440} title={<b style={{ fontSize: 16 }}>{editing?.organizationId?.name ?? "Solicitud"}</b>}>
        {editing && (
          <div className="ag-stack" style={{ gap: 16 }}>
            <div className="ag-card" style={{ padding: 14, background: "var(--surface-muted)" }}>
              <div style={{ fontSize: 14, lineHeight: "21px", whiteSpace: "pre-wrap" }}>{editing.text}</div>
              <div className="ag-subtle" style={{ marginTop: 6 }}>
                {editing.submittedByName ?? "—"}
                {editing.submittedByRole && ` (${editing.submittedByRole === "admin" ? "dueño/a" : "empleado/a"})`} · {fmtDate(editing.createdAt, "long")}
              </div>
            </div>
            <Select label="Estado" data={STATUS_OPTIONS} value={formStatus} onChange={(v) => setFormStatus((v as FeatureRequestStatus) ?? "pending")} allowDeselect={false} comboboxProps={{ withinPortal: true }} />
            <Textarea
              label="Respuesta para la organización"
              placeholder="Ej.: ¡Buena idea! La vamos a agregar en la próxima versión."
              value={formReply}
              onChange={(e) => setFormReply(e.currentTarget.value)}
              minRows={4}
              autosize
              maxRows={10}
            />
            <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
              <Button variant="default" onClick={() => setEditing(null)} disabled={saving}>
                Cancelar
              </Button>
              <Button color="var(--platform)" loading={saving} onClick={handleSave}>
                Guardar respuesta
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
