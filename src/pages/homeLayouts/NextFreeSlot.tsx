// «Próximo horario libre» en las landings (design system, LandingNegocio y
// LandingEsencial · Fase 3). El backend busca el primer horario reservable
// del servicio destacado (GET /schedule/next-free/:orgId); el enlace abre la
// reserva con ese servicio en el paso de fecha y hora, que se posiciona solo
// en el primer día disponible. Si no hay horario o falla, no se muestra nada.
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "@mantine/core";
import { IconChevronRight, IconClock } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import type { NextFreeSlot } from "../../services/scheduleService";
import { nextFreeLabel } from "../../utils/nextFreeLabel";

const bookingLink = (slot: NextFreeSlot) => `/online-reservation?serviceId=${slot.serviceId}&paso=horario`;

function useLabel(slot: NextFreeSlot | null) {
  const org = useSelector(selectOrganization);
  return slot ? nextFreeLabel(slot.datetime, org?.timezone || "America/Bogota", org?.timeFormat) : "";
}

/** Tarjeta del hero (plantilla Estudio). */
export function NextFreeCard({ slot }: { slot: NextFreeSlot | null }) {
  const label = useLabel(slot);
  if (!slot) return null;
  return (
    <Link
      to={bookingLink(slot)}
      className="ag-card ag-card--hover"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", textDecoration: "none", color: "var(--ink)", maxWidth: 420 }}
    >
      <span style={{ width: 36, height: 36, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--brand-soft)", color: "var(--brand-text)", flex: "none" }}>
        <IconClock size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ag-subtle" style={{ display: "block" }}>Próximo horario libre</span>
        <b className="ag-num" style={{ display: "block", fontSize: 15 }}>{label.charAt(0).toUpperCase() + label.slice(1)}</b>
        <span className="ag-subtle" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slot.serviceName}</span>
      </span>
      <IconChevronRight size={18} style={{ flex: "none", color: "var(--ink-subtle)" }} />
    </Link>
  );
}

/** Barra inferior fija en celular: «Próximo libre: hoy 4:00 p. m.» + «Reservar». */
export function NextFreeBar({ slot }: { slot: NextFreeSlot | null }) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const org = useSelector(selectOrganization);
  const label = useLabel(slot);
  if (!isMobile || !slot) return null;
  return (
    <>
      <div aria-hidden="true" style={{ height: 76 }} />
      <div className="ag-summary" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20 }}>
        <div className="ag-summary__text">
          <div className="ag-summary__title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {org?.name}
          </div>
          <div className="ag-summary__sub ag-num" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Próximo libre: {label}
          </div>
        </div>
        <Button component={Link} to={bookingLink(slot)} size="md">
          Reservar
        </Button>
      </div>
    </>
  );
}
