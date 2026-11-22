// Landing del negocio, plantilla Estudio (rediseño, mockup LandingNegocio).
// Bloques en orden: hero claro · servicios destacados · clases · equipo ·
// fidelidad · horario y ubicación · pie con enlaces. Cada bloque se oculta si
// no hay datos. Los textos del negocio (welcomeTitle / welcomeDescription) se
// muestran tal cual. Sin «Próximo horario libre» (Fase 3).
import { GoogleMap, Marker } from "@react-google-maps/api";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Avatar, Box, Button, Group, SimpleGrid } from "@mantine/core";
import { ReactNode, useEffect, useMemo, useState, type MouseEvent } from "react";
import { getServicesByOrganizationId, Service } from "../../services/serviceService";
import { getEmployeesByOrganizationId, Employee } from "../../services/employeeService";
import { getAvailableSessions, ClassSession } from "../../services/classService";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatTimeFromISO, toSpanishMeridiem } from "../../utils/timeFormatUtils";
import { useSelector } from "react-redux";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import {
  IconArrowRight,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconClock,
  IconGift,
  IconMapPin,
  IconPhone,
  IconPhoto,
  IconStar,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/es";
import "./landing.css";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
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

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

export function LandingLayout({
  features,
  welcomeTitle,
  welcomeDescription,
  organizationId,
  enableOnlineBooking = true,
}: LandingLayoutProps) {
  const navigate = useNavigate();
  const org = useSelector(selectOrganization);
  const tf = org?.timeFormat;
  const fmtHour = (hhmm: string) => toSpanishMeridiem(formatTimeFromISO(hhmm, tf));

  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);

  // Horario de hoy: weeklySchedule si está activo; si no, openingHours
  const todayInfo = useMemo(() => {
    const tz = org?.timezone || "America/Bogota";
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const todayIndex = dayMap[get("weekday")] ?? new Date().getDay();
    const cur = parseInt(get("hour")) * 60 + parseInt(get("minute"));

    let start: string | undefined;
    let end: string | undefined;
    if (org?.weeklySchedule?.enabled) {
      const day = org.weeklySchedule.schedule?.find((d) => d.day === todayIndex);
      if (!day || day.isOpen === false || day.isAvailable === false) return { status: "closed_today" as const };
      start = day.start;
      end = day.end;
    } else {
      const oh = org?.openingHours;
      if (!oh?.start || !oh?.end) return null;
      if (!(oh.businessDays ?? [1, 2, 3, 4, 5]).includes(todayIndex)) return { status: "closed_today" as const };
      start = oh.start;
      end = oh.end;
    }
    if (!start || !end) return { status: "closed_today" as const };
    if (cur >= toMinutes(start) && cur < toMinutes(end)) return { status: "open" as const, start, end };
    if (cur < toMinutes(start)) return { status: "opens_soon" as const, start, end };
    return { status: "closed_now" as const, start, end };
  }, [org?.weeklySchedule, org?.openingHours, org?.timezone]);

  // Horario de la semana (misma doble fuente)
  const weeklyHours = useMemo(() => {
    const tz = org?.timezone || "America/Bogota";
    const parts = new Intl.DateTimeFormat("en", { timeZone: tz, weekday: "short" }).formatToParts(new Date());
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const todayIndex = dayMap[parts.find((p) => p.type === "weekday")?.value ?? ""] ?? new Date().getDay();
    // Lunes primero
    const order = [1, 2, 3, 4, 5, 6, 0];

    if (org?.weeklySchedule?.enabled) {
      const schedule = org.weeklySchedule.schedule;
      if (!schedule || schedule.length === 0) return [];
      return order.map((i) => {
        const day = schedule.find((d) => d.day === i);
        const isOpen = !!(day && day.isOpen !== false && day.isAvailable !== false);
        return { name: DAY_NAMES[i], isToday: i === todayIndex, isOpen, start: day?.start, end: day?.end };
      });
    }
    const oh = org?.openingHours;
    if (!oh?.start || !oh?.end) return [];
    const businessDays = oh.businessDays ?? [1, 2, 3, 4, 5];
    return order.map((i) => ({
      name: DAY_NAMES[i],
      isToday: i === todayIndex,
      isOpen: businessDays.includes(i),
      start: oh.start,
      end: oh.end,
    }));
  }, [org?.weeklySchedule, org?.openingHours, org?.timezone]);

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

  const statusText = (() => {
    if (!todayInfo) return null;
    if (todayInfo.status === "open") return { tone: "success", text: `Abierto ahora · cierra a las ${fmtHour(todayInfo.end)}` };
    if (todayInfo.status === "opens_soon") return { tone: "warning", text: `Cerrado ahora · abre a las ${fmtHour(todayInfo.start)}` };
    if (todayInfo.status === "closed_now") return { tone: "danger", text: "Cerrado ahora" };
    return { tone: "danger", text: "Hoy no abrimos" };
  })();

  const socials = [
    { url: org?.instagramUrl, label: "Instagram", Icon: IconBrandInstagram },
    { url: org?.facebookUrl, label: "Facebook", Icon: IconBrandFacebook },
    { url: org?.tiktokUrl, label: "TikTok", Icon: IconBrandTiktok },
    { url: org?.whatsappUrl, label: "WhatsApp", Icon: IconBrandWhatsapp },
  ].filter((s) => !!s.url);

  const goToService = (service: Service) => navigate(`/servicio/${service._id}`, { state: { backTo: "/" } });

  return (
    <Box className="lnd" style={{ background: "var(--surface)", color: "var(--ink)" }}>
      {/* ─── Hero claro ─────────────────────────────────────────────────── */}
      <section className="lnd-wrap lnd-hero">
        <div className="lnd-hero__text">
          {statusText && (
            <span className="ag-open">
              <i style={{ background: `var(--${statusText.tone})` }} />
              {statusText.text}
            </span>
          )}
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

            {hasLocation && (
              <div className="ag-card lnd-location">
                {org?.location?.lat && org?.location?.lng ? (
                  <Link to="/location" className="lnd-location__map" aria-label="Ver la ubicación">
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={{ lat: org.location.lat, lng: org.location.lng }}
                      zoom={15}
                      options={{ disableDefaultUI: true, gestureHandling: "none", clickableIcons: false }}
                    >
                      <Marker position={{ lat: org.location.lat, lng: org.location.lng }} />
                    </GoogleMap>
                  </Link>
                ) : null}
                <div className="lnd-location__body">
                  <h2 className="ag-h">Horario y ubicación</h2>
                  {org?.address && (
                    <div className="ag-row" style={{ alignItems: "flex-start", gap: 10, flexWrap: "nowrap" }}>
                      <IconMapPin size={18} stroke={1.75} style={{ flex: "none", marginTop: 2, color: "var(--ink-muted)" }} />
                      <div>
                        <div>{org.address}</div>
                        <Anchor component={Link} to="/location" className="ag-link" underline="never">
                          Cómo llegar
                        </Anchor>
                      </div>
                    </div>
                  )}
                  {org?.phoneNumber && (
                    <div className="ag-row" style={{ gap: 10 }}>
                      <IconPhone size={18} stroke={1.75} style={{ color: "var(--ink-muted)" }} />
                      <Anchor href={`tel:${org.phoneNumber}`} c="var(--ink)" underline="never">
                        {org.phoneNumber}
                      </Anchor>
                    </div>
                  )}
                  {weeklyHours.length > 0 && (
                    <dl className="lnd-hours">
                      {weeklyHours.map((h) => (
                        <div key={h.name} data-today={h.isToday || undefined}>
                          <dt>
                            {h.isToday && <IconClock size={14} stroke={2} style={{ marginRight: 4, verticalAlign: "-2px" }} />}
                            {h.name}
                          </dt>
                          <dd className="ag-num">
                            {h.isOpen && h.start && h.end ? `${fmtHour(h.start)} – ${fmtHour(h.end)}` : "Cerrado"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Pie: redes, enlaces y acceso del equipo ───────────────────── */}
      <footer className="lnd-footer">
        <div className="lnd-wrap lnd-footer__inner">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <b style={{ fontSize: 15 }}>{org?.name}</b>
            {socials.length > 0 && (
              <Group gap={6}>
                {socials.map(({ url, label, Icon }) => (
                  <a key={label} href={url!} target="_blank" rel="noopener noreferrer" aria-label={label} className="ag-iconbtn">
                    <Icon size={20} stroke={1.75} />
                  </a>
                ))}
              </Group>
            )}
          </div>
          <nav aria-label="Enlaces" className="lnd-footer__links">
            {features.map((f) => (
              <Link key={f.link} to={f.link}>
                {f.title}
              </Link>
            ))}
            <Link to="/login-admin">Acceso para el equipo</Link>
          </nav>
        </div>
      </footer>
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
