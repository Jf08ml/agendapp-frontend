// Piezas compartidas por las plantillas de inicio Estudio (LandingLayout) y
// Esencial (EssentialLayout): horario del negocio, bloque «Horario y
// ubicación» y pie con enlaces.
import { GoogleMap, Marker } from "@react-google-maps/api";
import { Link } from "react-router-dom";
import { Anchor, Group } from "@mantine/core";
import { useMemo, type ReactNode } from "react";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandWhatsapp,
  IconClock,
  IconMapPin,
  IconPhone,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import { formatTimeFromISO, toSpanishMeridiem } from "../../utils/timeFormatUtils";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export interface LandingFeature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

/** Horario del negocio: hoy (estado) y la semana. weeklySchedule si está activo; si no, openingHours. */
export function useBusinessHours() {
  const org = useSelector(selectOrganization);
  const tf = org?.timeFormat;
  const fmtHour = (hhmm: string) => toSpanishMeridiem(formatTimeFromISO(hhmm, tf));

  const todayIndex = useMemo(() => {
    const tz = org?.timezone || "America/Bogota";
    const wd = new Intl.DateTimeFormat("en", { timeZone: tz, weekday: "short" }).formatToParts(new Date());
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return dayMap[wd.find((p) => p.type === "weekday")?.value ?? ""] ?? new Date().getDay();
  }, [org?.timezone]);

  const weeklyHours = useMemo(() => {
    const order = [1, 2, 3, 4, 5, 6, 0]; // lunes primero
    if (org?.weeklySchedule?.enabled) {
      const schedule = org.weeklySchedule.schedule;
      if (!schedule || schedule.length === 0) return [];
      return order.map((i) => {
        const day = schedule.find((d) => d.day === i);
        const isOpen = !!(day && day.isOpen !== false && day.isAvailable !== false && day.start && day.end);
        return { day: i, name: DAY_NAMES[i], isToday: i === todayIndex, isOpen, start: day?.start, end: day?.end };
      });
    }
    const oh = org?.openingHours;
    if (!oh?.start || !oh?.end) return [];
    const businessDays = oh.businessDays ?? [1, 2, 3, 4, 5];
    return order.map((i) => ({
      day: i,
      name: DAY_NAMES[i],
      isToday: i === todayIndex,
      isOpen: businessDays.includes(i),
      start: oh.start,
      end: oh.end,
    }));
  }, [org?.weeklySchedule, org?.openingHours, todayIndex]);

  // Estado de hoy para el hero
  const status = useMemo(() => {
    const today = weeklyHours.find((h) => h.isToday);
    if (!today) return null;
    if (!today.isOpen || !today.start || !today.end) return { tone: "danger", text: "Hoy no abrimos" };
    const tz = org?.timezone || "America/Bogota";
    const parts = new Intl.DateTimeFormat("en", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
    const cur = parseInt(get("hour")) * 60 + parseInt(get("minute"));
    if (cur >= toMinutes(today.start) && cur < toMinutes(today.end)) {
      return { tone: "success", text: `Abierto ahora · cierra a las ${fmtHour(today.end)}` };
    }
    if (cur < toMinutes(today.start)) return { tone: "warning", text: `Cerrado ahora · abre a las ${fmtHour(today.start)}` };
    return { tone: "danger", text: "Cerrado ahora" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyHours, org?.timezone, tf]);

  return { weeklyHours, status, fmtHour };
}

/** Pastilla de estado («Abierto ahora · cierra a las …») */
export function OpenStatus({ status }: { status: { tone: string; text: string } | null }) {
  if (!status) return null;
  return (
    <span className="ag-open">
      <i style={{ background: `var(--${status.tone})` }} />
      {status.text}
    </span>
  );
}

/** Bloque «Horario y ubicación»: mapa, dirección, teléfono y la semana con hoy resaltado. */
export function HoursAndLocation() {
  const org = useSelector(selectOrganization);
  const { weeklyHours, fmtHour } = useBusinessHours();
  if (!org?.address && !org?.phoneNumber && weeklyHours.length === 0) return null;

  return (
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
                <dd className="ag-num">{h.isOpen && h.start && h.end ? `${fmtHour(h.start)} – ${fmtHour(h.end)}` : "Cerrado"}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

/** Pie de la landing: nombre, redes, enlaces del negocio y «Acceso para el equipo». */
export function LandingFooter({ links }: { links: { title: string; link: string }[] }) {
  const org = useSelector(selectOrganization);
  const socials = [
    { url: org?.instagramUrl, label: "Instagram", Icon: IconBrandInstagram },
    { url: org?.facebookUrl, label: "Facebook", Icon: IconBrandFacebook },
    { url: org?.tiktokUrl, label: "TikTok", Icon: IconBrandTiktok },
    { url: org?.whatsappUrl, label: "WhatsApp", Icon: IconBrandWhatsapp },
  ].filter((s) => !!s.url);
  const termsEnabled = !!org?.termsAndConditions?.enabled;

  return (
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
          {links.map((f) => (
            <Link key={f.link} to={f.link}>
              {f.title}
            </Link>
          ))}
          {termsEnabled && <Link to="/terminos-condiciones">Términos y condiciones</Link>}
          <Link to="/login-admin">Acceso para el equipo</Link>
        </nav>
      </div>
    </footer>
  );
}
