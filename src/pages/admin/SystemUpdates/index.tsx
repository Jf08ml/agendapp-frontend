// Novedades (rediseño, NovedadesHistorial): tarjetas por versión con el tipo de
// cada cambio (Nuevo, Mejora o Corrección), «Más reciente», soporte por WhatsApp y
// la versión de compilación al pie (antes en el footer fijo).
import { useEffect, useState } from "react";
import { Button, Collapse, Skeleton, UnstyledButton } from "@mantine/core";
import { IconBrandWhatsapp, IconBug, IconChevronDown, IconChevronUp, IconInfoCircle, IconSparkles, IconTool } from "@tabler/icons-react";
import { getPublishedAnnouncements, markAnnouncementsRead, type Announcement, type AnnouncementItem } from "../../../services/announcementService";
import { usePwaActions } from "../../../hooks/usePwaActions";

export const NOVEDADES_STORAGE_KEY = "novedades_last_seen";

// Soporte de AgenditApp (mismo número que el enlace de ayuda del registro)
const SUPPORT_WHATSAPP_URL = "https://api.whatsapp.com/send/?phone=573506674686";

type UpdateType = AnnouncementItem["type"];

const TYPE_CONFIG: Record<UpdateType, { label: string; tone: string; Icon: typeof IconSparkles }> = {
  new: { label: "Nuevo", tone: "ag-badge--brand", Icon: IconSparkles },
  improvement: { label: "Mejora", tone: "ag-badge--info", Icon: IconTool },
  fix: { label: "Corrección", tone: "", Icon: IconBug },
};

export default function SystemUpdates() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());
  const { appVersion } = usePwaActions();

  const load = () => {
    setLoading(true);
    setError(false);
    getPublishedAnnouncements()
      .then((data) => {
        setAnnouncements(data);
        if (data.length > 0) {
          localStorage.setItem(NOVEDADES_STORAGE_KEY, data[0].isoDate);
        }
        window.dispatchEvent(new Event("announcements-seen"));
        markAnnouncementsRead().catch(() => {});
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleDetail = (key: string) => {
    setOpenDetails((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
      <div className="ag-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span className="ag-muted" style={{ fontSize: 14 }}>Lo último que cambió en AgenditApp.</span>
        <Button
          component="a"
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          size="xs"
          leftSection={<IconBrandWhatsapp size={16} />}
        >
          Soporte por WhatsApp
        </Button>
      </div>

      {loading && (
        <div className="ag-stack" style={{ gap: 12 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="ag-card" style={{ padding: 20 }}>
              <Skeleton height={16} width="30%" mb={14} />
              <Skeleton height={12} mb={8} />
              <Skeleton height={12} width="80%" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
          <IconInfoCircle size={20} />
          <div style={{ flex: 1 }}>No pudimos cargar las novedades.</div>
          <Button size="xs" variant="outline" onClick={load}>
            Reintentar
          </Button>
        </div>
      )}

      {!loading && !error && announcements.length === 0 && (
        <div className="ag-card" style={{ padding: "40px 20px", textAlign: "center" }}>
          <b>Aún no hay novedades publicadas</b>
        </div>
      )}

      {!loading &&
        !error &&
        announcements.map((entry, i) => (
          <article key={entry._id} className="ag-card" style={{ padding: 20 }}>
            <div className="ag-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <div className="ag-row" style={{ gap: 8 }}>
                <h2 className="ag-h" style={{ margin: 0 }}>Versión {entry.version}</h2>
                {i === 0 && <span className="ag-badge ag-badge--brand">Más reciente</span>}
              </div>
              <span className="ag-subtle">{entry.date}</span>
            </div>
            <div className="ag-stack" style={{ gap: 12 }}>
              {entry.items.map((item, j) => {
                const cfg = TYPE_CONFIG[item.type];
                const detailKey = `${entry._id}_${j}`;
                const detailOpen = openDetails.has(detailKey);
                const hasDetail = !!item.detail?.trim();
                return (
                  <div key={j} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span className={`ag-badge ${cfg.tone}`} style={{ flex: "none", minWidth: 104, justifyContent: "center" }}>
                      <cfg.Icon size={13} /> {cfg.label}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, lineHeight: "20px" }}>{item.text}</div>
                      {hasDetail && (
                        <>
                          <UnstyledButton onClick={() => toggleDetail(detailKey)} mt={4} className="ag-link" style={{ fontSize: 13 }}>
                            {detailOpen ? "Ver menos" : "Ver más"} {detailOpen ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                          </UnstyledButton>
                          <Collapse in={detailOpen}>
                            <div
                              className="ag-muted"
                              style={{
                                marginTop: 8,
                                padding: "10px 12px",
                                borderLeft: "2px solid var(--line-strong)",
                                background: "var(--surface-muted)",
                                fontSize: 13,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {item.detail}
                            </div>
                          </Collapse>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}

      {appVersion && (
        <div className="ag-subtle" style={{ textAlign: "center" }}>
          Versión de la app: {appVersion.buildDate}
        </div>
      )}
    </div>
  );
}
