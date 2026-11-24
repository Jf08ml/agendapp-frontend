// Landing del negocio, plantilla Estudio (rediseño, mockup LandingNegocio).
// Bloques en orden: hero claro · servicios destacados · clases · equipo ·
// fidelidad · horario y ubicación · pie con enlaces. Cada bloque se oculta si
// no hay datos. Los textos del negocio (welcomeTitle / welcomeDescription) se
// muestran tal cual. Sin «Próximo horario libre» (Fase 3).
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Avatar, Box, Button, SimpleGrid } from "@mantine/core";
import { ReactNode, useEffect, useMemo, useState, type MouseEvent } from "react";
import { getServicesByOrganizationId, Service } from "../../services/serviceService";
import { getEmployeesByOrganizationId, Employee } from "../../services/employeeService";
import { getAvailableSessions, ClassSession } from "../../services/classService";
import { formatCurrency } from "../../utils/formatCurrency";
import { toSpanishMeridiem } from "../../utils/timeFormatUtils";
import { useSelector } from "react-redux";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconClock,
  IconGift,
  IconMapPin,
  IconPhoto,
  IconStar,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/es";
import { HoursAndLocation, LandingFooter, OpenStatus } from "./landingShared";
import { NextFreeBar, NextFreeCard } from "./NextFreeSlot";
import { useNextFreeSlot } from "./useNextFreeSlot";
import { useBusinessHours } from "./useBusinessHours";
import "./landing.css";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

// El landing es un adelanto; el catálogo completo vive en /servicios-precios
const SERVICES_LIMIT = 8;

interface Feature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

interface LandingLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
  organizationId?: string;
  enableOnlineBooking?: boolean;
}

export function LandingLayout({
  features,
  welcomeTitle,
  welcomeDescription,
  organizationId,
  enableOnlineBooking = true,
}: LandingLayoutProps) {
  const navigate = useNavigate();
  const org = useSelector(selectOrganization);
  const nextFree = useNextFreeSlot(organizationId, enableOnlineBooking);
  const tf = org?.timeFormat;

  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);

  const { weeklyHours, status } = useBusinessHours();

  useEffect(() => {
    if (!organizationId) return;
    getServicesByOrganizationId(organizationId)
      .then((all) => setServices(all.filter((s) => s.isActive !== false)))
      .catch(() => {
        /* silencioso */
      });
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    getEmployeesByOrganizationId(organizationId)
      .then((all) => setEmployees(all.filter((e) => e.isActive !== false).slice(0, 8)))
      .catch(() => {
        /* silencioso */
      });
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || !org?.enableClassBooking) return;
    getAvailableSessions(organizationId)
      .then((all) => setClassSessions(all.slice(0, 6)))
      .catch(() => {
        /* silencioso */
      });
  }, [organizationId, org?.enableClassBooking]);

  // Destacados primero; si no hay, los primeros del catálogo
  const featured = useMemo(() => services.filter((s) => s.featured), [services]);
  const shownServices = useMemo(() => {
    const rest = services.filter((s) => !s.featured);
    return [...featured, ...rest].slice(0, SERVICES_LIMIT);
  }, [services, featured]);

  // Fotos para el hero: las de los servicios (no hay foto de portada del negocio)
  const heroPhotos = useMemo(
    () =>
      [...featured, ...services]
        .map((s) => s.images?.[0])
        .filter((u): u is string => !!u)
        .filter((u, i, arr) => arr.indexOf(u) === i)
        .slice(0, 3),
    [featured, services]
  );

  const showLoyalty = org?.showLoyaltyProgram !== false;
  const hasLocation = !!(org?.address || org?.phoneNumber || weeklyHours.length > 0);

  const goToService = (service: Service) => navigate(`/servicio/${service._id}`, { state: { backTo: "/" } });

  return (
    <Box className="lnd" style={{ background: "var(--surface)", color: "var(--ink)" }}>
      {/* ─── Hero claro ─────────────────────────────────────────────────── */}
      <section className="lnd-wrap lnd-hero">
        <div className="lnd-hero__text">
          <OpenStatus status={status} />
          <h1 className="lnd-display">{welcomeTitle}</h1>
          {welcomeDescription && <p className="lnd-lead">{welcomeDescription}</p>}
          <div className="ag-row" style={{ gap: 12 }}>
            {enableOnlineBooking && (
              <Button component={Link} to="/online-reservation" size="lg" leftSection={<IconCalendarEvent size={18} />}>
                Reservar una cita
              </Button>
            )}
            <Button component="a" href="#servicios" size="lg" variant="default">
              Ver servicios
            </Button>
          </div>
          <NextFreeCard slot={nextFree} />
          <div className="ag-row ag-muted" style={{ gap: 20, fontSize: 14 }}>
            {org?.address && (
              <span className="ag-row" style={{ gap: 6 }}>
                <IconMapPin size={16} stroke={1.75} /> {org.address}
              </span>
            )}
            {services.length > 0 && (
              <span className="ag-row" style={{ gap: 6 }}>
                <IconStar size={16} stroke={1.75} /> {services.length} {services.length === 1 ? "servicio" : "servicios"}
              </span>
            )}
          </div>
        </div>

        {heroPhotos.length > 0 && (
          <div className={`lnd-hero__photos lnd-hero__photos--${heroPhotos.length}`} aria-hidden="true">
            {heroPhotos.map((src) => (
              <img key={src} src={src} alt="" loading="lazy" />
            ))}
          </div>
        )}
      </section>

      {/* ─── Servicios ──────────────────────────────────────────────────── */}
      {shownServices.length > 0 && (
        <section id="servicios" className="lnd-band">
          <div className="lnd-wrap">
            <div className="lnd-sectionhead">
              <div>
                <div className="ag-slots__group" style={{ margin: "0 0 8px" }}>
                  Servicios
                </div>
                <h2 className="lnd-title">{featured.length > 0 ? "Lo más reservado" : "Nuestros servicios"}</h2>
              </div>
              <Anchor component={Link} to="/servicios-precios" className="ag-link" style={{ fontSize: 15 }} underline="never">
                Ver {services.length > 1 ? `los ${services.length} servicios` : "el catálogo"}{" "}
                <IconArrowRight size={16} style={{ verticalAlign: "-3px" }} />
              </Anchor>
            </div>
            <div className="lnd-services">
              {shownServices.map((service) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  currency={org?.currency}
                  enableOnlineBooking={enableOnlineBooking}
                  onOpen={() => goToService(service)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Clases ─────────────────────────────────────────────────────── */}
      {org?.enableClassBooking && classSessions.length > 0 && (
        <section className="lnd-wrap lnd-section">
          <div className="lnd-sectionhead">
            <div>
              <div className="ag-slots__group" style={{ margin: "0 0 8px" }}>
                Clases
              </div>
              <h2 className="lnd-title">Próximas clases</h2>
            </div>
            <Anchor component={Link} to="/reservar-clase" className="ag-link" style={{ fontSize: 15 }} underline="never">
              Ver todas <IconArrowRight size={16} style={{ verticalAlign: "-3px" }} />
            </Anchor>
          </div>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {classSessions.map((session) => {
              const classDoc = typeof session.classId === "string" ? null : session.classId;
              const employee = typeof session.employeeId === "string" ? null : session.employeeId;
              const classIdValue = typeof session.classId === "string" ? session.classId : session.classId._id;
              const start = dayjs(session.startDate).tz(org?.timezone || "America/Bogota");
              const remaining = session.capacity - session.enrolledCount;
              const time = toSpanishMeridiem(start.format(tf === "24h" ? "HH:mm" : "h:mm A"));
              return (
                <div key={session._id} className="ag-card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <b style={{ fontSize: 15 }}>{classDoc?.name ?? "Clase"}</b>
                  <span className="ag-muted ag-num" style={{ fontSize: 14 }}>
                    {start.format("dddd D [de] MMMM").replace(/^./, (c) => c.toUpperCase())} · {time}
                  </span>
                  {employee && <span className="ag-subtle">Con {employee.names}</span>}
                  <div className="ag-row" style={{ justifyContent: "space-between", marginTop: "auto", paddingTop: 6 }}>
                    <span className="ag-subtle">
                      {remaining > 0 ? `${remaining} ${remaining === 1 ? "cupo" : "cupos"}` : "Sin cupos"}
                      {classDoc && classDoc.pricePerPerson > 0 && ` · ${formatCurrency(classDoc.pricePerPerson, org?.currency || "COP")}`}
                    </span>
                    <Button
                      component={Link}
                      to={`/reservar-clase?classId=${classIdValue}&sessionId=${session._id}`}
                      size="xs"
                      variant="default"
                      disabled={remaining <= 0}
                    >
                      Reservar
                    </Button>
                  </div>
                </div>
              );
            })}
          </SimpleGrid>
        </section>
      )}

      {/* ─── Equipo ─────────────────────────────────────────────────────── */}
      {employees.length > 0 && (
        <section className="lnd-wrap lnd-section">
          <div className="lnd-sectionhead">
            <div>
              <div className="ag-slots__group" style={{ margin: "0 0 8px" }}>
                Equipo
              </div>
              <h2 className="lnd-title">Quién te atiende</h2>
            </div>
          </div>
          <div className="lnd-team">
            {employees.map((emp) => (
              <div key={emp._id} className="lnd-team__item">
                <Avatar src={emp.profileImage || undefined} size={88} radius="xl" styles={{ root: { background: "var(--surface-hover)" }, placeholder: { color: "var(--ink-muted)", fontWeight: 600 } }}>
                  {emp.names
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase())
                    .join("")}
                </Avatar>
                <b style={{ fontSize: 15, lineHeight: "20px" }}>{emp.names}</b>
                {emp.position && <span className="ag-subtle">{emp.position}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Fidelidad · Horario y ubicación ───────────────────────────── */}
      {(showLoyalty || hasLocation) && (
        <section className="lnd-band">
          <div className="lnd-wrap lnd-split">
            {showLoyalty && (
              <div className="lnd-loyalty">
                <span className="lnd-loyalty__icon">
                  <IconGift size={22} stroke={1.75} />
                </span>
                <div>
                  <div className="ag-slots__group" style={{ margin: "0 0 6px", color: "inherit", opacity: 0.8 }}>
                    Fidelidad
                  </div>
                  <h2 className="lnd-title" style={{ color: "inherit", fontSize: 28, lineHeight: "32px" }}>
                    Cada visita suma
                  </h2>
                </div>
                {org?.serviceTiers && org.serviceTiers.length > 0 ? (
                  <ul className="lnd-loyalty__list">
                    {org.serviceTiers.slice(0, 3).map((tier, i) => (
                      <li key={i}>
                        {tier.threshold} servicios: {tier.reward}
                      </li>
                    ))}
                  </ul>
                ) : org?.serviceReward ? (
                  <p style={{ margin: 0 }}>
                    Al completar {org?.serviceCount || "X"} servicios: {org.serviceReward}
                  </p>
                ) : (
                  <p style={{ margin: 0 }}>Acumula visitas y canjéalas por recompensas.</p>
                )}
                <Button component={Link} to="/search-client" variant="white" color="dark" style={{ alignSelf: "flex-start" }}>
                  Ver mis puntos
                </Button>
              </div>
            )}

            {hasLocation && <HoursAndLocation />}
          </div>
        </section>
      )}

      {/* ─── Pie: redes, enlaces y acceso del equipo ───────────────────── */}
      <LandingFooter links={features} />
      <NextFreeBar slot={nextFree} />
    </Box>
  );
}

// ServiceCard (design system): toda la tarjeta abre el detalle; una sola
// acción «Reservar» en outline.
function ServiceCard({
  service,
  currency,
  enableOnlineBooking,
  onOpen,
}: {
  service: Service;
  currency?: string;
  enableOnlineBooking: boolean;
  onOpen: () => void;
}) {
  const img = service.images?.[0];
  const showPrice = !service.hidePrice && Number(service.price) > 0;
  return (
    <article
      className="ag-card ag-card--hover ag-service"
      style={{ width: "auto" }}
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
    >
      <div className="ag-service__img ag-photo">
        {img ? (
          <img src={img} alt={service.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <IconPhoto size={28} stroke={1.5} />
        )}
        {service.featured && (
          <span className="ag-badge">
            <IconStar size={14} stroke={2} /> Destacado
          </span>
        )}
      </div>
      <div className="ag-service__body">
        <h3 className="ag-service__name">{service.name}</h3>
        {service.type && <span className="ag-subtle">{service.type}</span>}
        <div className="ag-service__meta">
          {showPrice ? <span className="ag-price">{formatCurrency(Number(service.price), currency)}</span> : <span />}
          <span className="ag-duration">
            <IconClock size={14} stroke={1.75} /> {service.duration} min
          </span>
        </div>
        {enableOnlineBooking && (
          <Button
            component={Link}
            to={`/online-reservation?serviceId=${service._id}`}
            variant="default"
            size="sm"
            mt="xs"
            fullWidth
            onClick={(e: MouseEvent) => e.stopPropagation()}
          >
            Reservar
          </Button>
        )}
      </div>
    </article>
  );
}
