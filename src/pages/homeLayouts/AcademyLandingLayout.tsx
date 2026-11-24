// Landing del negocio, plantilla Academia (rediseño, LandingAcademia), para
// negocios de clases y programas. Bloques en orden: hero claro · nuestras
// clases · próximas clases (con cupos) · paquetes · servicios en lista ·
// instructores · fidelidad + horario y ubicación · pie. Cada bloque se oculta
// si no hay datos; un error de carga se queda en su bloque con «Reintentar».
// El CTA «Reservar clase» va en el header (ver Header.tsx).
import { Link, useNavigate } from "react-router-dom";
import { Avatar, Button } from "@mantine/core";
import { ReactNode, useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/es";
import {
  IconArrowRight,
  IconBrandWhatsapp,
  IconChevronRight,
  IconClock,
  IconGift,
  IconInfoCircle,
  IconPhoto,
  IconStar,
} from "@tabler/icons-react";
import { getServicesByOrganizationId, Service } from "../../services/serviceService";
import { getEmployeesByOrganizationId, Employee } from "../../services/employeeService";
import { getAvailableSessions, getClassesByOrganization, ClassSession, ClassType } from "../../services/classService";
import { listPublicPackages, PublicPackageItem } from "../../services/collectionService";
import { buildClassReserveLink, buildPackageBuyLink } from "../../utils/programPurchase";
import { formatCurrency } from "../../utils/formatCurrency";
import { packageSavings } from "../../utils/packagePricing";
import { useMediaQuery } from "@mantine/hooks";
import { toSpanishMeridiem } from "../../utils/timeFormatUtils";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import { HoursAndLocation, LandingFooter, OpenStatus } from "./landingShared";
import { useBusinessHours } from "./useBusinessHours";
import "./landing.css";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

const CLASSES_LIMIT = 6;
const SESSIONS_LIMIT = 6;
const SERVICES_LIMIT = 6;

interface Feature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

interface AcademyLandingLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
  organizationId?: string;
  enableOnlineBooking?: boolean;
}

type Load<T> = { status: "loading" | "ok" | "error"; data: T };

const minTierPrice = (pkg: PublicPackageItem) => Math.min(...(pkg.tiers || []).map((t) => t.price));

const cuposBadge = (remaining: number) =>
  remaining <= 0
    ? { cls: "ag-badge--danger", text: "Sin cupos" }
    : remaining === 1
      ? { cls: "ag-badge--warning", text: "1 cupo" }
      : { cls: "ag-badge--success", text: `${remaining} cupos` };

export function AcademyLandingLayout({ features, welcomeTitle, welcomeDescription, organizationId }: AcademyLandingLayoutProps) {
  const navigate = useNavigate();
  const org = useSelector(selectOrganization);
  const currency = org?.currency || "COP";
  const tz = org?.timezone || "America/Bogota";
  const isMobile = useMediaQuery("(max-width: 48em)");
  const tf = org?.timeFormat;
  const classBooking = !!org?.enableClassBooking;
  const { weeklyHours, status } = useBusinessHours();

  const [classes, setClasses] = useState<Load<ClassType[]>>({ status: "loading", data: [] });
  const [packages, setPackages] = useState<Load<PublicPackageItem[]>>({ status: "loading", data: [] });
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const loadClasses = useCallback(() => {
    if (!organizationId) return;
    setClasses((c) => ({ ...c, status: "loading" }));
    getClassesByOrganization(organizationId)
      .then((all) => setClasses({ status: "ok", data: all.filter((c) => c.isActive) }))
      .catch(() => setClasses({ status: "error", data: [] }));
  }, [organizationId]);

  const loadPackages = useCallback(() => {
    if (!organizationId) return;
    setPackages((p) => ({ ...p, status: "loading" }));
    listPublicPackages(organizationId)
      .then((res) => setPackages({ status: "ok", data: res?.packages || [] }))
      .catch(() => setPackages({ status: "error", data: [] }));
  }, [organizationId]);

  useEffect(() => {
    if (classBooking) loadClasses();
  }, [classBooking, loadClasses]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    if (!organizationId || !classBooking) return;
    // Sesiones de los próximos 7 días, incluidas las llenas (se ven «Sin cupos»).
    const limit = dayjs().add(7, "day");
    getAvailableSessions(organizationId, { includeFull: true })
      .then((all) =>
        setSessions(
          all
            .filter((s) => s.status !== "cancelled" && dayjs(s.startDate).isAfter(dayjs()) && dayjs(s.startDate).isBefore(limit))
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
            .slice(0, SESSIONS_LIMIT)
        )
      )
      .catch(() => {
        /* bloque opcional: si falla, no se muestra */
      });
  }, [organizationId, classBooking]);

  useEffect(() => {
    if (!organizationId) return;
    getServicesByOrganizationId(organizationId)
      .then((all) => setServices(all.filter((s) => s.isActive !== false)))
      .catch(() => {
        /* silencioso */
      });
    getEmployeesByOrganizationId(organizationId)
      .then((all) => setEmployees(all.filter((e) => e.isActive !== false).slice(0, 8)))
      .catch(() => {
        /* silencioso */
      });
  }, [organizationId]);

  // Destacadas primero
  const shownClasses = useMemo(
    () => [...classes.data.filter((c) => c.featured), ...classes.data.filter((c) => !c.featured)].slice(0, CLASSES_LIMIT),
    [classes.data]
  );
  const shownServices = useMemo(
    () => [...services.filter((s) => s.featured), ...services.filter((s) => !s.featured)].slice(0, SERVICES_LIMIT),
    [services]
  );
  const heroPhotos = useMemo(
    () =>
      shownClasses
        .map((c) => c.images?.[0])
        .filter((u): u is string => !!u)
        .filter((u, i, arr) => arr.indexOf(u) === i)
        .slice(0, 3),
    [shownClasses]
  );

  const showLoyalty = org?.showLoyaltyProgram !== false;
  const hasLocation = !!(org?.address || org?.phoneNumber || weeklyHours.length > 0);
  const hasPackages = packages.status === "ok" && packages.data.length > 0;

  const fmtTime = (d: dayjs.Dayjs) => toSpanishMeridiem(d.format(tf === "24h" ? "HH:mm" : "h:mm A"));
  const dayLabel = (d: dayjs.Dayjs) => {
    const today = dayjs().tz(tz).startOf("day");
    const diff = d.startOf("day").diff(today, "day");
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Mañana";
    return d.format("dddd D").replace(/^./, (c) => c.toUpperCase());
  };

  // Próxima clase con cupo (mismo dato que «Próximas clases»)
  const nextSession = sessions.find((s) => s.capacity - s.enrolledCount > 0) ?? null;
  const nextStart = nextSession ? dayjs(nextSession.startDate).tz(tz) : null;
  const nextClassName = nextSession && typeof nextSession.classId !== "string" ? nextSession.classId?.name : null;
  const nextSessionText = nextStart
    ? [`${dayLabel(nextStart).replace(/^(Hoy|Mañana)$/, (m) => m.toLowerCase())} ${fmtTime(nextStart)}`, nextClassName].filter(Boolean).join(" · ")
    : "";
  const nextSessionLink = nextSession
    ? `/reservar-clase?classId=${typeof nextSession.classId === "string" ? nextSession.classId : nextSession.classId._id}&sessionId=${nextSession._id}`
    : "/reservar-clase";

  const sectionHead = (eyebrow: string, title: string, link?: { to: string; label: string }) => (
    <div className="lnd-sectionhead">
      <div>
        <div className="ag-slots__group" style={{ margin: "0 0 8px" }}>
          {eyebrow}
        </div>
        <h2 className="lnd-title">{title}</h2>
      </div>
      {link && (
        <Link to={link.to} className="ag-link" style={{ fontSize: 15 }}>
          {link.label} <IconArrowRight size={16} style={{ verticalAlign: "-3px" }} />
        </Link>
      )}
    </div>
  );

  const blockError = (text: string, retry: () => void) => (
    <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
      <IconInfoCircle size={20} />
      <div style={{ flex: 1 }}>{text}</div>
      <Button size="xs" variant="default" onClick={retry}>
        Reintentar
      </Button>
    </div>
  );

  return (
    <div className="lnd" style={{ background: "var(--surface)", color: "var(--ink)" }}>
      {/* ─── Hero claro ─────────────────────────────────────────────────── */}
      <section className="lnd-wrap lnd-hero">
        <div className="lnd-hero__text">
          <OpenStatus status={status} />
          <h1 className="lnd-display">{welcomeTitle}</h1>
          {welcomeDescription && <p className="lnd-lead">{welcomeDescription}</p>}
          {(classBooking || hasPackages) && (
            <div className="ag-row" style={{ gap: 12 }}>
              {classBooking && (
                <Button component={Link} to="/reservar-clase" size="lg">
                  Reservar clase
                </Button>
              )}
              {hasPackages && (
                <Button component="a" href="#paquetes" size="lg" variant="default">
                  Ver paquetes
                </Button>
              )}
            </div>
          )}
        </div>
        {heroPhotos.length > 0 && (
          <div className={`lnd-hero__photos lnd-hero__photos--${heroPhotos.length}`} aria-hidden="true">
            {heroPhotos.map((src) => (
              <img key={src} src={src} alt="" loading="lazy" />
            ))}
          </div>
        )}
      </section>

      {/* ─── Nuestras clases ────────────────────────────────────────────── */}
      {classBooking && (
        <section id="clases" className="lnd-band">
          <div className="lnd-wrap">
            {sectionHead(
              "Clases",
              "Nuestras clases",
              classes.data.length > shownClasses.length ? { to: "/programas", label: `Ver las ${classes.data.length} clases` } : undefined
            )}
            {classes.status === "error" ? (
              blockError("No pudimos cargar las clases.", loadClasses)
            ) : classes.status === "loading" ? (
              <div className="lnd-services" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="ag-card ag-service" style={{ width: "auto" }}>
                    <span className="ag-skeleton ag-service__img" style={{ borderRadius: 0 }} />
                    <div className="ag-service__body">
                      <span className="ag-skeleton" style={{ width: "60%" }} />
                      <span className="ag-skeleton" style={{ width: "35%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : shownClasses.length === 0 ? (
              <div className="ag-card" style={{ padding: "32px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <b style={{ fontSize: 15 }}>Pronto publicaremos el horario</b>
                <div className="ag-muted" style={{ fontSize: 14 }}>Escríbenos y te contamos qué clases vienen.</div>
                {org?.whatsappUrl && (
                  <Button component="a" href={org.whatsappUrl} target="_blank" rel="noopener noreferrer" variant="default" mt={8} leftSection={<IconBrandWhatsapp size={16} />}>
                    Escribir por WhatsApp
                  </Button>
                )}
              </div>
            ) : (
              <div className="lnd-services">
                {shownClasses.map((cls) => (
                  <ClassCard
                    key={cls._id}
                    cls={cls}
                    currency={currency}
                    onOpen={() => navigate(`/programa/${cls._id}`, { state: { backTo: "/" } })}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Próximas clases ────────────────────────────────────────────── */}
      {classBooking && sessions.length > 0 && (
        <section className="lnd-wrap lnd-section">
          {sectionHead("Esta semana", "Próximas clases", { to: "/reservar-clase", label: "Ver horario" })}
          <div className="lnd-services">
            {sessions.map((s) => {
              const classDoc = typeof s.classId === "string" ? null : s.classId;
              const classId = typeof s.classId === "string" ? s.classId : s.classId._id;
              const employee = typeof s.employeeId === "string" ? null : s.employeeId;
              const start = dayjs(s.startDate).tz(tz);
              const remaining = s.capacity - s.enrolledCount;
              const cupos = cuposBadge(remaining);
              const full = remaining <= 0;
              const body = (
                <>
                  <div className="ag-row" style={{ justifyContent: "space-between", gap: 8 }}>
                    <span className="ag-num" style={{ fontWeight: 600, fontSize: 15 }}>
                      {dayLabel(start)} · {fmtTime(start)}
                    </span>
                    <span className={`ag-badge ${cupos.cls}`}>{cupos.text}</span>
                  </div>
                  <b style={{ fontSize: 15 }}>{classDoc?.name ?? "Clase"}</b>
                  <span className="ag-subtle">
                    {[employee && `Con ${employee.names}`, classDoc?.duration && `${classDoc.duration} min`].filter(Boolean).join(" · ")}
                  </span>
                </>
              );
              const style = { padding: "var(--space-4)", display: "flex", flexDirection: "column" as const, gap: 4, width: "auto", textDecoration: "none", color: "inherit" };
              return full ? (
                <div key={s._id} className="ag-card" style={{ ...style, opacity: 0.55 }}>
                  {body}
                </div>
              ) : (
                <Link key={s._id} to={`/reservar-clase?classId=${classId}&sessionId=${s._id}`} className="ag-card ag-card--hover" style={style}>
                  {body}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Paquetes ───────────────────────────────────────────────────── */}
      {(hasPackages || packages.status === "error") && (
        <section id="paquetes" className={classBooking && sessions.length > 0 ? "lnd-band" : "lnd-wrap lnd-section"}>
          <div className={classBooking && sessions.length > 0 ? "lnd-wrap" : undefined}>
            {sectionHead("Paquetes", "Ahorra con un paquete")}
            {packages.status === "error" ? (
              blockError("No pudimos cargar los paquetes.", loadPackages)
            ) : (
              <div className="lnd-services">
                {packages.data.map((pkg) => {
                  const tiered = (pkg.tiers?.length ?? 0) > 0;
                  const included = [
                    ...(pkg.classes || []).map((c) => c.classId?.name).filter(Boolean),
                    ...(pkg.services || []).map((s) => s.serviceId?.name).filter(Boolean),
                  ] as string[];
                  return (
                    <div key={pkg._id} className="ag-card" style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <b style={{ fontSize: 16, lineHeight: "22px", display: "block" }}>{pkg.name}</b>
                        {pkg.description && (
                          <div className="ag-muted" style={{ fontSize: 14, marginTop: 2 }}>
                            {pkg.description}
                          </div>
                        )}
                      </div>
                      <span className="ag-price" style={{ fontSize: 20, lineHeight: "26px" }}>
                        {tiered ? `Desde ${formatCurrency(minTierPrice(pkg), currency)}` : formatCurrency(pkg.price ?? 0, currency)}
                      </span>
                      {tiered &&
                        (() => {
                          const sv = packageSavings(pkg.tiers);
                          return sv.minPerSession !== null ? (
                            <div className="ag-row" style={{ gap: 8, alignItems: "center", marginTop: -6 }}>
                              <span className="ag-subtle ag-num">desde {formatCurrency(Math.round(sv.minPerSession), currency)} por sesión</span>
                              {sv.upTo >= 1 && <span className="ag-badge ag-badge--success">Ahorra hasta {sv.upTo} %</span>}
                            </div>
                          ) : null;
                        })()}
                      {tiered && (
                        <div className="ag-row" style={{ gap: 6 }}>
                          {pkg.tiers!.map((t) => (
                            <span key={t._id} className="ag-badge ag-badge--outline">
                              {t.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {included.length > 0 && <div className="ag-subtle">Incluye: {included.join(", ")}</div>}
                      {pkg.validityDays > 0 && <div className="ag-subtle">Vigencia de {pkg.validityDays} días desde la compra.</div>}
                      <Button component={Link} to={buildPackageBuyLink(pkg._id)} variant="default" mt="auto">
                        Comprar paquete
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Servicios (lista, como la plantilla Esencial) ──────────────── */}
      {shownServices.length > 0 && (
        <section className="lnd-wrap lnd-section">
          {sectionHead(
            "Servicios",
            "También ofrecemos",
            services.length > shownServices.length ? { to: "/servicios-precios", label: `Ver los ${services.length} servicios` } : undefined
          )}
          <div className="ag-card">
            {shownServices.map((s) => {
              const img = s.images?.[0];
              const showPrice = !s.hidePrice && s.ctaMode !== "whatsapp_quote" && Number(s.price) > 0;
              return (
                <button key={s._id} type="button" className="lnd-svcrow" onClick={() => navigate(`/servicio/${s._id}`, { state: { backTo: "/" } })}>
                  <span className="ag-photo lnd-svcrow__thumb">{img ? <img src={img} alt="" loading="lazy" /> : <IconPhoto size={18} stroke={1.75} />}</span>
                  <span className="lnd-svcrow__main">
                    <b>{s.name}</b>
                    {s.type && <span className="ag-subtle">{s.type}</span>}
                  </span>
                  <span className="ag-duration lnd-svcrow__dur">
                    <IconClock size={14} stroke={1.75} /> {s.duration} min
                  </span>
                  <span className="ag-price lnd-svcrow__price">{showPrice ? formatCurrency(Number(s.price), currency) : ""}</span>
                  <IconChevronRight size={18} stroke={1.75} style={{ color: "var(--ink-subtle)", flex: "none" }} />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Instructores ───────────────────────────────────────────────── */}
      {employees.length > 0 && (
        <section className="lnd-wrap lnd-section">
          {sectionHead("Equipo", "Instructores")}
          <div className="lnd-team">
            {employees.map((emp) => (
              <div key={emp._id} className="lnd-team__item">
                <Avatar
                  src={emp.profileImage || undefined}
                  size={88}
                  radius="xl"
                  styles={{ root: { background: "var(--surface-hover)" }, placeholder: { color: "var(--ink-muted)", fontWeight: 600 } }}
                >
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
                  Ver mi tarjeta
                </Button>
              </div>
            )}
            {hasLocation && <HoursAndLocation />}
          </div>
        </section>
      )}

      <LandingFooter links={features} />

      {/* Barra inferior en móvil (Fase 2): la próxima clase con cupo y «Reservar clase» */}
      {isMobile && classBooking && nextSession && (
        <>
          <div aria-hidden="true" style={{ height: 76 }} />
          <div className="ag-summary" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20 }}>
            <div className="ag-summary__text">
              <div className="ag-summary__title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {org?.name}
              </div>
              <div className="ag-summary__sub ag-num" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Próxima clase: {nextSessionText}
              </div>
            </div>
            <Button component={Link} to={nextSessionLink} size="md">
              Reservar clase
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Tarjeta de clase (ServiceCard): toda la tarjeta abre el detalle; «Reservar
// clase» entra a la reserva con esa clase elegida.
function ClassCard({ cls, currency, onOpen }: { cls: ClassType; currency: string; onOpen: () => void }) {
  const img = cls.images?.[0];
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
        {img ? <img src={img} alt={cls.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <IconPhoto size={28} stroke={1.5} />}
        {cls.featured && (
          <span className="ag-badge">
            <IconStar size={14} stroke={2} /> Destacada
          </span>
        )}
      </div>
      <div className="ag-service__body">
        <h3 className="ag-service__name">{cls.name}</h3>
        <div className="ag-service__meta">
          {!cls.hidePrice ? (
            <span className="ag-price">{cls.pricePerPerson === 0 ? "Gratis" : `${formatCurrency(cls.pricePerPerson, currency)} / persona`}</span>
          ) : (
            <span />
          )}
          <span className="ag-duration">
            <IconClock size={14} stroke={1.75} /> {cls.duration} min
          </span>
        </div>
        <Button
          component={Link}
          to={buildClassReserveLink(cls._id)}
          variant="default"
          size="sm"
          mt="xs"
          fullWidth
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          Reservar clase
        </Button>
      </div>
    </article>
  );
}
