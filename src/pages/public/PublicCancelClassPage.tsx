// Cancelar una inscripción a clase desde su enlace (rediseño, CancelarCita):
// resumen de la inscripción, qué pasa al cancelar y «Sí, cancelar inscripción».
import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Checkbox, Skeleton } from "@mantine/core";
import { IconCalendarPlus, IconInfoCircle } from "@tabler/icons-react";
import { formatFullDateInTimezone, formatInTimezone } from "../../utils/timezoneUtils";
import { getEnrollmentByToken, cancelEnrollmentByToken, EnrollmentCancelInfo } from "../../services/classService";

const shell = { maxWidth: 520, margin: "0 auto", padding: "32px 16px 48px" } as const;
const h1 = { margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" } as const;
const amPm = (s: string) => s.replace(/\s?AM\b/i, " a. m.").replace(/\s?PM\b/i, " p. m.");

export const PublicCancelClassPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<EnrollmentCancelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!token) {
      setError("Al enlace le falta información.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getEnrollmentByToken(token);
      if (!data) {
        setError("No encontramos la inscripción o el enlace venció.");
      } else {
        setInfo(data);
        // Pre-seleccionar las cancelables (futuras y no canceladas)
        setSelected(data.enrollments.filter((e) => !e.isCancelled && !e.isPast).map((e) => e.id));
      }
    } catch {
      setError("No encontramos la inscripción o el enlace venció.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const tz = info?.timezone || "America/Bogota";
  const cancelable = info?.enrollments.filter((e) => !e.isCancelled && !e.isPast) ?? [];
  const showCheckboxes = (info?.isGroup ?? false) && cancelable.length > 1;

  const handleCancel = async () => {
    if (!token) return;
    setCancelling(true);
    setError(null);
    try {
      const result = await cancelEnrollmentByToken(token, showCheckboxes ? selected : undefined);
      if (result) setCancelled(true);
      else setError("No se pudo cancelar. Intenta de nuevo.");
    } catch {
      setError("No se pudo cancelar. Intenta de nuevo.");
    } finally {
      setCancelling(false);
    }
  };

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (loading) {
    return (
      <div style={shell}>
        <Skeleton height={28} width={240} mb={20} />
        <Skeleton height={110} radius="md" mb={16} />
        <Skeleton height={44} radius="md" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div style={shell}>
        <div className="ag-card" style={{ padding: 24, textAlign: "center" }}>
          <h1 style={{ ...h1, fontSize: 20 }}>Este enlace ya no funciona</h1>
          <div className="ag-muted" style={{ fontSize: 14, margin: "6px 0 16px" }}>{error}</div>
          <Button component={Link} to="/mis-reservas">
            Ver mis reservas
          </Button>
        </div>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div style={shell}>
        <div className="ag-card" style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <h1 style={{ ...h1, fontSize: 22 }}>Tu inscripción quedó cancelada</h1>
          <div className="ag-muted" style={{ fontSize: 14 }}>
            {info?.organizationName} ya recibió el aviso y tu cupo quedó libre. Si fue un error, escríbele al negocio.
          </div>
          <Button component={Link} to="/reservar-clase" leftSection={<IconCalendarPlus size={16} />} mt={6}>
            Ver otras clases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div className="ag-stack" style={{ gap: 18 }}>
        <div>
          <h1 style={h1}>Cancelar inscripción</h1>
          <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>{info?.organizationName}</div>
        </div>

        <div className="ag-card" style={{ padding: 0, overflow: "hidden" }}>
          {info?.enrollments.map((e) => {
            const blocked = e.isCancelled || e.isPast;
            const day = formatFullDateInTimezone(e.startDate, tz, "dddd D [de] MMMM");
            return (
              <div key={e.id} className="ag-list-row" style={{ padding: "12px 16px", gap: 12, opacity: blocked ? 0.55 : 1 }}>
                {showCheckboxes && !blocked && <Checkbox checked={selected.includes(e.id)} onChange={() => toggle(e.id)} aria-label={e.className} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{e.className}</b>
                  {e.attendeeName && <div className="ag-subtle">{e.attendeeName}</div>}
                  <div style={{ fontSize: 13 }}>
                    {day.charAt(0).toUpperCase() + day.slice(1)} · {amPm(formatInTimezone(e.startDate, tz))} – {amPm(formatInTimezone(e.endDate, tz))}
                  </div>
                </div>
                {e.isCancelled ? <span className="ag-badge">Cancelada</span> : e.isPast ? <span className="ag-badge">Finalizada</span> : null}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="ag-alert ag-alert--danger">
            <IconInfoCircle size={20} />
            <div>{error}</div>
          </div>
        )}

        {cancelable.length === 0 ? (
          <div className="ag-subtle" style={{ textAlign: "center" }}>No hay inscripciones que se puedan cancelar: ya finalizaron o se cancelaron.</div>
        ) : !confirmStep ? (
          <Button variant="subtle" color="red" size="md" fullWidth onClick={() => setConfirmStep(true)}>
            Cancelar inscripción
          </Button>
        ) : (
          <div className="ag-stack" style={{ gap: 10 }}>
            <div className="ag-muted" style={{ fontSize: 14 }}>
              Liberas tu cupo y {info?.organizationName} recibe el aviso. No se puede deshacer; si pagaste, el reembolso depende de la política del negocio.
            </div>
            <Button color="red" size="md" fullWidth loading={cancelling} disabled={showCheckboxes && selected.length === 0} onClick={handleCancel}>
              {showCheckboxes ? `Sí, cancelar ${selected.length === 1 ? "1 inscripción" : `${selected.length} inscripciones`}` : "Sí, cancelar inscripción"}
            </Button>
            <Button variant="default" fullWidth onClick={() => setConfirmStep(false)} disabled={cancelling}>
              No, mantenerla
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicCancelClassPage;
