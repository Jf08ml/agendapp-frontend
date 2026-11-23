// Historial de eliminaciones (rediseño, NovedadesHistorial): chips por tipo, rango
// de fechas con el conteo de registros y tabla (filas apiladas en móvil). El tipo
// va en un badge neutro con ícono, sin colores por tipo.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Pagination, Skeleton } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import { IconCalendarEvent, IconInfoCircle, IconInbox, IconUser, IconUsers } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { AuditLog, AuditLogAction, AuditLogEntityType, getAuditLogs } from "../../../services/auditLogService";
import { selectOrganization } from "../../../features/organization/sliceOrganization";

dayjs.extend(utc);
dayjs.extend(timezone);

const ACTION_LABELS: Record<AuditLogAction, string> = {
  delete_appointment: "Cita eliminada",
  delete_client: "Cliente eliminado",
  force_delete_client: "Cliente eliminado (forzado)",
  delete_employee: "Profesional eliminado",
  delete_reservation: "Reserva eliminada",
  delete_reservation_with_appointment: "Reserva y cita eliminadas",
};

const ENTITY: Record<AuditLogEntityType, { label: string; chip: string; Icon: typeof IconUser }> = {
  appointment: { label: "Cita", chip: "Citas", Icon: IconCalendarEvent },
  client: { label: "Cliente", chip: "Clientes", Icon: IconUsers },
  employee: { label: "Profesional", chip: "Profesionales", Icon: IconUser },
  reservation: { label: "Reserva", chip: "Reservas", Icon: IconInbox },
};

const formatSnapshot = (log: AuditLog): string => {
  const s = log.entitySnapshot || {};
  if (log.entityType === "appointment") return [s.clientName, s.serviceName, s.employeeName].filter(Boolean).join(" · ") || "—";
  if (log.entityType === "client") return [s.name, s.phoneNumber].filter(Boolean).join(" · ") || "—";
  if (log.entityType === "employee") return [s.names, s.email].filter(Boolean).join(" · ") || "—";
  if (log.entityType === "reservation") return [s.customerName, s.customerPhone].filter(Boolean).join(" · ") || "—";
  return "—";
};

const LIMIT = 25;

const AuditLogPage: React.FC = () => {
  const org = useSelector(selectOrganization);
  const tz = org?.timezone || "America/Bogota";
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [entityType, setEntityType] = useState<AuditLogEntityType | "">("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [startDate, endDate] = dateRange;
      const result = await getAuditLogs({
        entityType: entityType || undefined,
        startDate: startDate ? dayjs(startDate).format("YYYY-MM-DD") : undefined,
        endDate: endDate ? dayjs(endDate).format("YYYY-MM-DD") : undefined,
        page,
        limit: LIMIT,
      });
      setLogs(result.logs);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [entityType, dateRange, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Volver a la primera página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [entityType, dateRange]);

  const hasFilters = !!entityType || !!dateRange[0] || !!dateRange[1];
  const when = (log: AuditLog) => dayjs.utc(log.createdAt).tz(tz).format("DD/MM/YYYY · h:mm A").replace(/\s?AM$/, " a. m.").replace(/\s?PM$/, " p. m.");
  const typeBadge = (t: AuditLogEntityType) => {
    const e = ENTITY[t];
    return (
      <span className="ag-badge">
        <e.Icon size={13} /> {e.label}
      </span>
    );
  };

  return (
    <Box p={{ base: "sm", md: "lg" }}>
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Historial de eliminaciones</h1>
          <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
            Qué se eliminó, cuándo y quién lo hizo.
          </div>
        </div>

        <div className="ag-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }} role="group" aria-label="Tipo">
            {(["", "appointment", "client", "employee", "reservation"] as const).map((t) => (
              <button
                key={t || "all"}
                type="button"
                className="ag-chip"
                aria-pressed={entityType === t}
                onClick={() => setEntityType(t)}
              >
                {t ? ENTITY[t].chip : "Todos"}
              </button>
            ))}
          </div>
          <DatePickerInput
            type="range"
            placeholder="Rango de fechas"
            value={dateRange}
            onChange={setDateRange}
            clearable
            valueFormat="DD/MM/YYYY"
            w={isMobile ? "100%" : 240}
            aria-label="Rango de fechas"
          />
          <span className="ag-subtle" style={{ marginLeft: isMobile ? 0 : "auto" }}>
            {total} registro{total !== 1 ? "s" : ""}
          </span>
        </div>

        {error ? (
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>No pudimos cargar el historial.</div>
            <Button size="xs" variant="outline" onClick={fetchLogs}>
              Reintentar
            </Button>
          </div>
        ) : loading ? (
          <div className="ag-card" style={{ padding: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={36} radius="sm" mb={i < 5 ? 10 : 0} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="ag-card" style={{ padding: "40px 20px", textAlign: "center" }}>
            <b style={{ display: "block", marginBottom: hasFilters ? 8 : 0 }}>
              {hasFilters ? "No hay registros para estos filtros" : "Aún no se ha eliminado nada"}
            </b>
            {hasFilters && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setEntityType("");
                  setDateRange([null, null]);
                }}
              >
                Quitar filtros
              </Button>
            )}
          </div>
        ) : isMobile ? (
          <div className="ag-stack" style={{ gap: 8 }}>
            {logs.map((log) => (
              <div key={log._id} className="ag-card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="ag-row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <b style={{ fontSize: 14 }}>{ACTION_LABELS[log.action] || log.action}</b>
                  {typeBadge(log.entityType)}
                </div>
                <div className="ag-muted" style={{ fontSize: 13 }}>{formatSnapshot(log)}</div>
                <div className="ag-subtle">
                  {when(log)}
                  {log.performedByName ? ` · ${log.performedByName}` : ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ag-card" style={{ padding: 0, overflow: "auto" }}>
            <table className="ag-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Tipo</th>
                  <th>Qué pasó</th>
                  <th>Detalle</th>
                  <th>Quién lo hizo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="ag-num" style={{ whiteSpace: "nowrap" }}>{when(log)}</td>
                    <td>{typeBadge(log.entityType)}</td>
                    <td>{ACTION_LABELS[log.action] || log.action}</td>
                    <td>
                      <span title={formatSnapshot(log)} style={{ display: "inline-block", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>
                        {formatSnapshot(log)}
                      </span>
                    </td>
                    <td>{log.performedByName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
          </div>
        )}
      </div>
    </Box>
  );
};

export default AuditLogPage;
