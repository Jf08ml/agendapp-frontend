// Piezas compartidas por las plantillas de inicio Estudio (LandingLayout) y
// Esencial (EssentialLayout): horario del negocio, bloque «Horario y
// ubicación» y pie con enlaces.
import { GoogleMap, Marker } from "@react-google-maps/api";
import { Link } from "react-router-dom";
import { Anchor, Group } from "@mantine/core";
import type { ReactNode } from "react";
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
import { useBusinessHours } from "./useBusinessHours";


export interface LandingFeature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
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
