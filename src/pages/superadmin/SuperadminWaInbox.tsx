// pages/superadmin/SuperadminWaInbox.tsx
// Bandeja de WhatsApp de la plataforma (rediseño, SuperadminWhatsapp): número
// en un control segmentado, envíos automáticos en una fila, conversaciones con
// no leídos en brand y filtro «Sin leer», hilo con el origen de cada mensaje y
// la ventana de 24 h explicada. «Ver organización» abre su ficha.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, ScrollArea, Skeleton, Switch, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconCheck, IconChecks } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  getConversations,
  getConversationMessages,
  markConversationRead,
  replyToConversation,
  getPlatformSettings,
  updatePlatformSettings,
  getLines,
  type PlatformWaLine,
  type PlatformConversation,
  type PlatformWaMessage,
  type PlatformSettings,
} from "../../services/platformInboxService";

dayjs.locale("es");

const POLL_MS = 15000;

const SOURCE_LABEL: Record<PlatformWaMessage["source"], string> = {
  inbound: "Recibido",
  retargeting: "Plantilla",
  ai_agent: "Bot IA",
  manual: "Manual",
  alert: "Alerta",
  oficina: "Oficina IA",
  welcome: "Bienvenida",
  access: "Acceso",
};

function conversationLabel(c: PlatformConversation) {
  return c.organization?.name || `+${c.phone}`;
}

// Ticks estilo WhatsApp para mensajes salientes: 1 palomita gris (enviado),
// 2 grises (entregado), 2 azules (leído por el destinatario).
function StatusTicks({ status }: { status: PlatformWaMessage["status"] }) {
  if (!status) return null;
  if (status === "failed") {
    return <IconAlertTriangle size={14} color="var(--danger)" aria-label="No se envió" />;
  }
  if (status === "read") {
    return <IconChecks size={14} color="var(--info)" aria-label="Leído" />;
  }
  if (status === "delivered") {
    return <IconChecks size={14} color="var(--ink-subtle)" aria-label="Entregado" />;
  }
  return <IconCheck size={14} color="var(--ink-subtle)" aria-label="Enviado" />;
}

export default function SuperadminWaInbox() {
  const [conversations, setConversations] = useState<PlatformConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<PlatformWaMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [savingKey, setSavingKey] = useState<keyof PlatformSettings | null>(null);
  const [line, setLine] = useState<PlatformWaLine>("platform");
  const [oficinaConfigured, setOficinaConfigured] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);

  useEffect(() => {
    getLines()
      .then((lines) => setOficinaConfigured(lines.some((l) => l.id === "oficina" && l.configured)))
      .catch((err) => console.error("Error cargando los números de WhatsApp:", err));
  }, []);

  const handleChangeLine = (value: string) => {
    setLine(value as PlatformWaLine);
    setSelectedPhone(null);
    setMessages([]);
    setConversations([]);
    setLoadingList(true);
  };

  useEffect(() => {
    getPlatformSettings()
      .then(setSettings)
      .catch((err) => {
        console.error("Error cargando la configuración de envíos:", err);
        notifications.show({
          color: "red",
          title: "No se pudo cargar la configuración",
          message: "Los interruptores de envíos automáticos no están disponibles.",
        });
      });
  }, []);

  const handleToggleSetting = async (key: keyof PlatformSettings, value: boolean) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    setSavingKey(key);
    try {
      setSettings(await updatePlatformSettings({ [key]: value }));
    } catch (err) {
      console.error("Error guardando la configuración de envíos:", err);
      setSettings(previous);
      notifications.show({ color: "red", title: "No se pudo guardar", message: "Intenta de nuevo." });
    } finally {
      setSavingKey(null);
    }
  };

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations(line);
      setConversations(data);
    } catch (err) {
      console.error("Error cargando conversaciones:", err);
    } finally {
      setLoadingList(false);
    }
  }, [line]);

  const loadThread = useCallback(async (phone: string) => {
    setLoadingThread(true);
    try {
      const data = await getConversationMessages(phone, line);
      setMessages(data);
      // El hilo está abierto — cualquier mensaje entrante (incluido uno que
      // haya llegado justo en este poll) se da por leído de una vez.
      setConversations((prev) => prev.map((c) => (c.phone === phone ? { ...c, unreadCount: 0 } : c)));
      markConversationRead(phone, line).catch((err) => console.error("Error marcando como leído:", err));
    } catch (err) {
      console.error("Error cargando mensajes:", err);
    } finally {
      setLoadingThread(false);
    }
  }, [line]);

  useEffect(() => {
    void loadConversations();
    const interval = setInterval(loadConversations, POLL_MS);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedPhone) return;
    void loadThread(selectedPhone);
    const interval = setInterval(() => loadThread(selectedPhone), POLL_MS);
    return () => clearInterval(interval);
  }, [selectedPhone, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSelect = (phone: string) => {
    // loadThread (disparado por el efecto de selectedPhone) ya marca como leído.
    setSelectedPhone(phone);
  };

  const selectedConversation = conversations.find((c) => c.phone === selectedPhone) || null;

  const handleSend = async () => {
    if (!selectedPhone || !draft.trim() || sending) return;
    setSending(true);
    try {
      await replyToConversation(selectedPhone, draft.trim(), line);
      setDraft("");
      await loadThread(selectedPhone);
      await loadConversations();
    } catch (err) {
      console.error("Error enviando respuesta:", err);
      notifications.show({
        color: "red",
        title: "No se pudo enviar",
        message: "Revisa que la ventana de 24 h siga abierta o intenta de nuevo.",
      });
    } finally {
      setSending(false);
    }
  };

  // Ventana de 24 h: desde el último mensaje recibido del hilo.
  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const windowEnds = lastInbound ? dayjs(lastInbound.createdAt).add(24, "hour") : null;
  const unreadTotal = conversations.filter((c) => c.unreadCount > 0).length;
  const shownConversations = onlyUnread ? conversations.filter((c) => c.unreadCount > 0) : conversations;

  const settingRow = (key: keyof PlatformSettings, label: string, description: string, fallback: boolean) => (
    <Switch
      label={label}
      description={description}
      checked={settings?.[key] ?? fallback}
      disabled={!settings || savingKey === key}
      onChange={(e) => void handleToggleSetting(key, e.currentTarget.checked)}
      styles={{ body: { alignItems: "flex-start" } }}
    />
  );

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 16 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>WhatsApp de la plataforma</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4, maxWidth: 720 }}>
              {line === "platform"
                ? "El número oficial de AgenditApp: recordatorios de activación y las respuestas de los dueños."
                : "El número de soporte y ventas: contactos, soporte y mensajes de Oficina IA, también lo que escribes desde el teléfono. Aquí no responde ningún bot."}
            </div>
          </div>
          {oficinaConfigured && (
            <div className="ag-segment" role="group" aria-label="Número">
              {(
                [
                  ["platform", "Número oficial"],
                  ["oficina", "Soporte y ventas"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={line === v} onClick={() => handleChangeLine(v)} style={{ cursor: "pointer" }}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        {line === "platform" && (
          <section className="ag-card" style={{ padding: 18 }}>
            <h2 className="ag-h" style={{ margin: "0 0 12px" }}>Envíos automáticos</h2>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {settingRow(
                "retargetingEnabled",
                "Retargeting de activación",
                "Cada día a las 11:00 a. m.: activa tu cuenta, agenda tu primera cita y conecta tu WhatsApp. No incluye el aviso de prueba por vencer.",
                false
              )}
              {settingRow(
                "trialNudgeEnabled",
                "Aviso de prueba por vencer",
                "3 días y 1 día antes de que termine la prueba. Apágalo cuando Oficina IA envíe estos mensajes con aprobación humana.",
                true
              )}
              {settingRow(
                "waDisconnectWhatsappAlertEnabled",
                "Aviso de WhatsApp desconectado",
                "Texto libre cuando se cae la sesión de un negocio. Apagado, el negocio igual recibe el aviso en la app y por notificación.",
                false
              )}
            </div>
          </section>
        )}

        <section className="ag-card wa-inbox" style={{ overflow: "hidden" }}>
          <style>{`
            .wa-inbox { display: grid; grid-template-columns: 320px minmax(0, 1fr); height: 640px; }
            @media (max-width: 62em) { .wa-inbox { grid-template-columns: 1fr; height: auto; } .wa-list { max-height: 320px; } .wa-thread { height: 560px; } }
            .wa-conv { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--line); background: none; padding: 10px 14px; cursor: pointer; font: inherit; color: inherit; }
            .wa-conv:hover { background: var(--surface-hover); }
            .wa-conv[aria-current="true"] { background: var(--brand-soft); }
          `}</style>

          <div className="wa-list" style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="ag-row" style={{ justifyContent: "space-between", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
              <b style={{ fontSize: 14 }}>Conversaciones</b>
              <button type="button" className="ag-chip" style={{ cursor: "pointer", height: 28 }} aria-pressed={onlyUnread} onClick={() => setOnlyUnread((v) => !v)}>
                Sin leer <span className="count">{unreadTotal}</span>
              </button>
            </div>
            <ScrollArea style={{ flex: 1 }}>
              {loadingList && conversations.length === 0 ? (
                <div className="ag-stack" style={{ gap: 8, padding: 14 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </div>
              ) : shownConversations.length === 0 ? (
                <div className="ag-muted" style={{ textAlign: "center", padding: 20, fontSize: 14 }}>
                  {onlyUnread ? "No hay conversaciones sin leer." : "Aún no hay conversaciones."}
                </div>
              ) : (
                shownConversations.map((c) => (
                  <button key={c.phone} type="button" className="wa-conv" aria-current={c.phone === selectedPhone} onClick={() => handleSelect(c.phone)}>
                    <div className="ag-row" style={{ justifyContent: "space-between", gap: 6, flexWrap: "nowrap" }}>
                      <b style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conversationLabel(c)}</b>
                      <span className="ag-subtle ag-num" style={{ flex: "none" }}>{dayjs(c.lastMessageAt).format("DD/MM HH:mm")}</span>
                    </div>
                    <div className="ag-row" style={{ justifyContent: "space-between", gap: 6, flexWrap: "nowrap", marginTop: 2 }}>
                      <span className="ag-muted" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.lastDirection === "outbound" ? "Tú: " : ""}
                        {c.lastMessage}
                      </span>
                      {c.unreadCount > 0 && (
                        <span
                          aria-label={`${c.unreadCount} sin leer`}
                          style={{ flex: "none", minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "var(--brand)", color: "#fff", font: "600 11px/20px var(--font-sans)", textAlign: "center" }}
                        >
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          <div className="wa-thread" style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
            {!selectedConversation ? (
              <div className="ag-muted" style={{ flex: 1, display: "grid", placeItems: "center", fontSize: 14, padding: 24 }}>
                Elige una conversación para verla.
              </div>
            ) : (
              <>
                <div className="ag-row" style={{ justifyContent: "space-between", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 15 }}>{conversationLabel(selectedConversation)}</b>
                    <div className="ag-subtle ag-num">
                      +{selectedConversation.phone}
                      {selectedConversation.organization?.slug ? ` · ${selectedConversation.organization.slug}` : ""}
                    </div>
                  </div>
                  {selectedConversation.organization?._id && (
                    <Link to={`/superadmin/organizaciones/${selectedConversation.organization._id}`} className="ag-link" style={{ fontSize: 14 }}>
                      Ver organización
                    </Link>
                  )}
                </div>
                <ScrollArea style={{ flex: 1 }}>
                  <div className="ag-stack" style={{ gap: 10, padding: 16, opacity: loadingThread && messages.length === 0 ? 0.6 : 1 }}>
                    {messages.length === 0 && !loadingThread && <div className="ag-muted" style={{ textAlign: "center", fontSize: 14 }}>Sin mensajes en este hilo.</div>}
                    {messages.map((m) => {
                      const out = m.direction === "outbound";
                      return (
                        <div key={m._id} style={{ alignSelf: out ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                          <div
                            style={{
                              padding: "8px 12px",
                              borderRadius: 12,
                              fontSize: 14,
                              lineHeight: "20px",
                              whiteSpace: "pre-wrap",
                              background: out ? "var(--brand-soft)" : "var(--surface-muted)",
                              border: "1px solid var(--line)",
                            }}
                          >
                            {m.body}
                          </div>
                          <div className="ag-row" style={{ gap: 6, marginTop: 3, justifyContent: out ? "flex-end" : "flex-start" }}>
                            <span className="ag-badge ag-badge--outline" style={{ height: 18, fontSize: 11, padding: "0 6px" }}>{SOURCE_LABEL[m.source]}</span>
                            <span className="ag-subtle ag-num">{dayjs(m.createdAt).format("DD/MM HH:mm")}</span>
                            {out && <StatusTicks status={m.status} />}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>
                <div style={{ borderTop: "1px solid var(--line)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedConversation.withinReplyWindow ? (
                    windowEnds && <div className="ag-subtle">Puedes responder con texto libre hasta el {windowEnds.format("D MMM [a las] h:mm a")}.</div>
                  ) : (
                    <div className="ag-alert ag-alert--warning" style={{ padding: "8px 12px" }}>
                      <IconAlertTriangle size={18} />
                      <div style={{ fontSize: 13 }}>
                        Pasaron más de 24 h. WhatsApp no permite texto libre hasta que {selectedConversation.organization?.ownerName || "el dueño"} vuelva a escribir.
                      </div>
                    </div>
                  )}
                  <div className="ag-row" style={{ gap: 8, flexWrap: "nowrap", alignItems: "flex-end" }}>
                    <Textarea
                      style={{ flex: 1 }}
                      aria-label="Respuesta"
                      placeholder="Escribe una respuesta"
                      value={draft}
                      onChange={(e) => setDraft(e.currentTarget.value)}
                      disabled={!selectedConversation.withinReplyWindow || sending}
                      autosize
                      minRows={1}
                      maxRows={4}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                    <Button color="var(--platform)" onClick={() => void handleSend()} disabled={!selectedConversation.withinReplyWindow || !draft.trim()} loading={sending}>
                      Enviar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
