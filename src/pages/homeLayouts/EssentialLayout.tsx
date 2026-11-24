// Plantilla de inicio Esencial (rediseño, mockup LandingEsencial). Reemplaza el
// contenido de MinimalLayout, CardsLayout y ModernLayout, que mostraban lo mismo
// (bienvenida + tarjetas de acceso) con distinto estilo; esos tres nombres
// siguen existiendo y ahora muestran esta plantilla, así que ningún negocio
// cambia de configuración.
// Bloques: hero compacto · servicios en lista · horario y ubicación · más
// opciones · pie. «Reservar» va en el header (hero claro).
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { IconChevronRight, IconClock, IconPhoto } from "@tabler/icons-react";
import { getServicesByOrganizationId, Service } from "../../services/serviceService";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import { formatCurrency } from "../../utils/formatCurrency";
import { HoursAndLocation, LandingFooter, OpenStatus, type LandingFeature } from "./landingShared";
import { useBusinessHours } from "./useBusinessHours";
import { NextFreeBar } from "./NextFreeSlot";
import { useNextFreeSlot } from "./useNextFreeSlot";
import "./landing.css";

export interface EssentialLayoutProps {
  features: LandingFeature[];
  welcomeTitle: string;
  welcomeDescription: string;
  organizationId?: string;
  enableOnlineBooking?: boolean;
}

const SERVICES_LIMIT = 6;
// Estas dos dejan de ser tarjetas: son el «Reservar» del header y el bloque de servicios
const NOT_IN_MORE = ["/online-reservation", "/servicios-precios", "/location"];

export function EssentialLayout({ features, welcomeTitle, welcomeDescription, organizationId, enableOnlineBooking = true }: EssentialLayoutProps) {
  const navigate = useNavigate();
  const org = useSelector(selectOrganization);
  const { status } = useBusinessHours();
  const nextFree = useNextFreeSlot(organizationId, enableOnlineBooking);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    getServicesByOrganizationId(organizationId)
      .then((all) => setServices(all.filter((s) => s.isActive !== false)))
      .catch(() => {
        /* silencioso */
      })
      .finally(() => setLoading(false));
  }, [organizationId]);

  const shown = useMemo(
    () => [...services.filter((s) => s.featured), ...services.filter((s) => !s.featured)].slice(0, SERVICES_LIMIT),
    [services]
  );
  const moreLinks = features.filter((f) => !NOT_IN_MORE.includes(f.link));

  return (
    <div className="lnd" style={{ background: "var(--surface)", color: "var(--ink)" }}>
      {/* ─── Hero compacto (claro) ──────────────────────────────────────── */}
      <section className="lnd-wrap" style={{ paddingTop: "var(--space-7)", paddingBottom: "var(--space-6)" }}>
        <div className="lnd-hero__text" style={{ maxWidth: 720 }}>
          <OpenStatus status={status} />
          <h1 className="lnd-display">{welcomeTitle}</h1>
          {welcomeDescription && <p className="lnd-lead">{welcomeDescription}</p>}
        </div>
      </section>

      {/* ─── Servicios en lista ─────────────────────────────────────────── */}
      {(loading || shown.length > 0) && (
        <section className="lnd-band" style={{ paddingTop: "var(--space-7)", paddingBottom: "var(--space-7)" }}>
          <div className="lnd-wrap">
            <div className="lnd-sectionhead" style={{ marginBottom: "var(--space-4)" }}>
              <h2 className="lnd-title" style={{ fontSize: 24, lineHeight: "30px" }}>
                Servicios
              </h2>
              {services.length > shown.length && (
                <Link to="/servicios-precios" className="ag-link" style={{ fontSize: 15 }}>
                  Ver los {services.length} servicios
                </Link>
              )}
            </div>
            <div className="ag-card">
              {loading
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="lnd-svcrow" aria-hidden="true">
                      <span className="ag-skeleton" style={{ width: 56, height: 56, borderRadius: "var(--radius-md)" }} />
                      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <span className="ag-skeleton" style={{ width: "60%" }} />
                        <span className="ag-skeleton" style={{ width: "30%" }} />
                      </span>
                    </div>
                  ))
                : shown.map((s) => {
                    const img = s.images?.[0];
                    const showPrice = !s.hidePrice && Number(s.price) > 0;
                    return (
                      <button
                        key={s._id}
                        type="button"
                        className="lnd-svcrow"
                        onClick={() => navigate(`/servicio/${s._id}`, { state: { backTo: "/" } })}
                      >
                        <span className="ag-photo lnd-svcrow__thumb">
                          {img ? <img src={img} alt="" loading="lazy" /> : <IconPhoto size={18} stroke={1.75} />}
                        </span>
                        <span className="lnd-svcrow__main">
                          <b>{s.name}</b>
                          {s.type && <span className="ag-subtle">{s.type}</span>}
                        </span>
                        <span className="ag-duration lnd-svcrow__dur">
                          <IconClock size={14} stroke={1.75} /> {s.duration} min
                        </span>
                        <span className="ag-price lnd-svcrow__price">
                          {showPrice ? formatCurrency(Number(s.price), org?.currency) : ""}
                        </span>
                        <IconChevronRight size={18} stroke={1.75} style={{ color: "var(--ink-subtle)", flex: "none" }} />
                      </button>
                    );
                  })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Horario y ubicación ────────────────────────────────────────── */}
      <section className="lnd-wrap" style={{ paddingTop: "var(--space-7)", paddingBottom: "var(--space-7)" }}>
        <div className="lnd-split">
          <HoursAndLocation />

          {/* Más opciones (las que antes eran tarjetas) */}
          {moreLinks.length > 0 && (
            <nav aria-label="Más opciones" className="ag-card" style={{ padding: "var(--space-2) var(--space-5)" }}>
              <h2 className="ag-h" style={{ padding: "var(--space-3) 0" }}>
                Más opciones
              </h2>
              {moreLinks.map((f) => (
                <Link key={f.link} to={f.link} className="lnd-morerow">
                  <span className="lnd-morerow__icon">{f.icon}</span>
                  <span style={{ flex: 1 }}>{f.title}</span>
                  <IconChevronRight size={18} stroke={1.75} style={{ color: "var(--ink-subtle)" }} />
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      <LandingFooter links={[]} />
      <NextFreeBar slot={nextFree} />
    </div>
  );
}

export default EssentialLayout;
