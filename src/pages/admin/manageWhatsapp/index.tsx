/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  CheckIcon,
  CopyButton,
  Group,
  Kbd,
  Progress,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { QRCodeSVG } from "qrcode.react";
import { Link, useSearchParams } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import WhatsappTabs from "../../../components/whatsapp/WhatsappTabs";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../app/store";
import {
  BiCopy,
  BiInfoCircle,
  BiRefresh,
  BiX,
  BiQrScan,
  BiMobile,
  BiSend,
} from "react-icons/bi";
import { useWhatsappStatus } from "../../../hooks/useWhatsappStatus";
import type { WaCode } from "../../../utils/waRealtime";
import { updateOrganization, sendWhatsappWelcomeTest } from "../../../services/organizationService";
import { fetchOrganizationConfig } from "../../../features/organization/sliceOrganization";
import { notifications } from "@mantine/notifications";
import MetaConnectionPanel from "./MetaConnectionPanel";
import WhatsappConnectGuide from "./components/WhatsappConnectGuide";
import WhatsappQuotaUsage from "../../../components/WhatsappQuotaUsage";
import { usePlanLimits } from "../../../hooks/usePlanLimits";

// -----------------------------
// 1) Mapeo UI por estado
// -----------------------------
const UI_STATUS: Record<
  WaCode,
  {
    title: string;
    color: "blue" | "teal" | "green" | "orange" | "red" | "gray";
    showQR?: boolean;
    desc?: string;
  }
> = {
  connecting: {
    title: "Conectando…",
    color: "blue",
    desc: "Creando o reanudando la sesión.",
  },
  waiting_qr: {
    title: "Esperando vinculación",
    color: "teal",
    showQR: true, // Nota: controlamos la visualización manualmente abajo según el modo
    desc: "Escanea el QR o ingresa el código en tu celular.",
  },
  authenticated: {
    title: "Autenticado",
    color: "blue",
    desc: "Listando chats y finalizando inicio…",
  },
  ready: {
    title: "Conectado",
    color: "green",
    desc: "Sesión lista para enviar mensajes.",
  },
  disconnected: {
    title: "Desconectado",
    color: "orange",
    desc: "La sesión no está activa en este momento.",
  },
  auth_failure: {
    title: "Error de autenticación",
    color: "red",
    showQR: true,
    desc: "Tus credenciales caducaron. Vuelve a vincular.",
  },
  reconnecting: {
    title: "Reconectando…",
    color: "blue",
    desc: "Recuperando la sesión tras una caída.",
  },
  error: {
    title: "Error",
    color: "red",
    desc: "Ocurrió un problema. Intenta de nuevo.",
  },
};

const METHOD_STORAGE_KEY = "wa_connection_method";

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-subtle)",
};

function readStoredMethod(): "web" | "meta" | null {
  try {
    const v = localStorage.getItem(METHOD_STORAGE_KEY);
    return v === "web" || v === "meta" ? v : null;
  } catch {
    return null;
  }
}

// -----------------------------
// 2) Componente principal
// -----------------------------
const WhatsappOrgSession: React.FC = () => {
  // Organización y prefill del clientId
  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );
  const dispatch = useDispatch<AppDispatch>();

  const initialClientId =
    (organization as any)?.clientIdWhatsapp || organization?._id || "";

  // Estado del panel de Agente IA
  const [waPhone, setWaPhone] = useState<string>((organization as any)?.waPhone ?? "");
  const [waAgentEnabled, setWaAgentEnabled] = useState<boolean>((organization as any)?.waAgentEnabled ?? false);
  const [savingAgent, setSavingAgent] = useState(false);

  // Hook centralizado
  const {
    // estado
    code,
    reason,
    me,

    // clientId controlado
    clientId,
    setClientId,

    // QR & Pairing
    qr,

    qrTtl,
    pairingCode, // <--- Importante: viene del hook actualizado

    // loaders
    loadingPrimary,
    loadingRestart,
    loadingLogout,
    loadingSend,

    // acciones
    connect,
    restart,
    logout,
    sendTest,
  } = useWhatsappStatus(organization?._id, initialClientId);

  // Método de conexión visible: solo se muestra el panel del método elegido.
  // Arranca con la última elección de este navegador; si no hay, en Meta cuando la
  // org ya conectó por Meta (o solo tiene Meta disponible) y en Web en los demás casos.
  const [connectionMethod, setConnectionMethod] = useState<"web" | "meta">(() => {
    if (organization?.hideBaileysUI) return "meta";
    return (
      readStoredMethod() ??
      (organization?.waConnectionType === "meta" ? "meta" : "web")
    );
  });
  const handleChangeMethod = (val: string | null) => {
    if (val !== "web" && val !== "meta") return;
    setConnectionMethod(val);
    try {
      localStorage.setItem(METHOD_STORAGE_KEY, val);
    } catch {
      /* almacenamiento no disponible: la elección solo dura esta visita */
    }
  };
  const showWebPanel = !organization?.hideBaileysUI && connectionMethod === "web";
  const showMetaPanel = !!organization?._id && (organization?.hideBaileysUI || connectionMethod === "meta");

  // Estado local para UI de conexión
  const [connectMode, setConnectMode] = useState<"qr" | "pairing">("qr");
  const [pairingPhone, setPairingPhone] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [searchParams] = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 62em)");

  const handleSaveAgentConfig = async () => {
    if (!organization?._id) return;
    setSavingAgent(true);
    try {
      await updateOrganization(organization._id, { waPhone: waPhone.trim() || null, waAgentEnabled });
      await dispatch(fetchOrganizationConfig());
      notifications.show({ color: "green", message: "Configuración del agente guardada." });
    } catch {
      notifications.show({ color: "red", message: "Error al guardar. Intenta de nuevo." });
    } finally {
      setSavingAgent(false);
    }
  };

  const ui = UI_STATUS[code];
  const { usage: planUsage } = usePlanLimits();

  // 🎉 Aha moment: al conectar WhatsApp, enviar al propio número del negocio el
  // recordatorio de ejemplo para que el dueño vea lo que reciben sus clientes.
  // Se dispara una vez por montaje al llegar a "ready"; el backend es idempotente
  // por `firstAutoMessageAt` (no por la conexión), así que volver a llamar es seguro.
  const welcomeTriggered = useRef(false);
  useEffect(() => {
    if (code !== "ready" || welcomeTriggered.current || !organization?._id) return;
    welcomeTriggered.current = true;
    const selfPhone = me?.id ? me.id.split("@")[0].split(":")[0] : undefined;
    sendWhatsappWelcomeTest(organization._id, selfPhone)
      .then((r) => {
        if (r.sent) {
          notifications.show({
            color: "green",
            autoClose: 14000,
            title: "¡WhatsApp conectado!",
            message:
              "Te enviamos a tu propio número el recordatorio de ejemplo que recibirían tus clientes. Revísalo en tu WhatsApp.",
          });
        } else if (!r.alreadySent) {
          // No silenciar la falla: avisar el motivo y ofrecer reintento manual
          const reasons: Record<string, string> = {
            no_phone: "No encontramos tu número de teléfono. Verifícalo en la configuración del negocio.",
            plan_limit: "Tu plan no incluye el envío por WhatsApp.",
            send_failed: "No se pudo enviar el mensaje. Usa el botón «Enviar mensaje de prueba».",
          };
          notifications.show({
            color: "yellow",
            autoClose: 10000,
            title: "No se envió el mensaje de ejemplo",
            message: reasons[r.reason || ""] || "Inténtalo con el botón «Enviar mensaje de prueba».",
          });
        }
        dispatch(fetchOrganizationConfig());
      })
      .catch(() => {});
  }, [code, me, organization, dispatch]);

  // Botón manual: reenviar el recordatorio de ejemplo al propio WhatsApp (force).
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const handleSendWelcomeTest = async () => {
    if (!organization?._id || sendingWelcome) return;
    setSendingWelcome(true);
    try {
      const selfPhone = me?.id ? me.id.split("@")[0].split(":")[0] : undefined;
      const r = await sendWhatsappWelcomeTest(organization._id, selfPhone, true);
      if (r.sent) {
        notifications.show({ color: "green", title: "Mensaje enviado", message: "Revisa tu WhatsApp." });
      } else {
        const reasons: Record<string, string> = {
          no_phone: "No encontramos tu número. Verifícalo en la configuración del negocio.",
          plan_limit: "Tu plan no incluye el envío por WhatsApp.",
          send_failed: "No se pudo enviar. Asegúrate de que WhatsApp esté conectado.",
        };
        notifications.show({ color: "red", title: "No se pudo enviar", message: reasons[r.reason || ""] || "Intenta de nuevo." });
      }
    } catch {
      notifications.show({ color: "red", title: "Error", message: "No se pudo enviar el mensaje." });
    } finally {
      setSendingWelcome(false);
    }
  };

  // Handler manual para el botón de conectar
  const handleConnect = () => {
    if (connectMode === "pairing") {
      if (!pairingPhone || pairingPhone.length < 7) {
        notifications.show({ color: "red", message: "Escribe un número válido, con indicativo del país (ej: 57300…)." });
        return;
      }
      // Forzamos nueva sesión enviando el teléfono
      connect({ forceFresh: true, pairingPhone });
    } else {
      // Modo QR normal
      connect({ forceFresh: true });
    }
  };

  const tab = searchParams.get("tab") === "asistentes" ? "asistentes" : "conexion";
  const selfPhone = me?.id ? me.id.split("@")[0].split(":")[0] : "";
  const statusTone: Record<string, string> = {
    green: "success",
    orange: "warning",
    red: "danger",
    blue: "info",
    teal: "info",
    gray: "",
  };

  const methodCards = !organization?.hideBaileysUI && (
    <div className="ag-stack" style={{ gap: 8 }} role="radiogroup" aria-label="Método de conexión">
      {[
        {
          value: "web",
          title: "WhatsApp Web",
          desc: "Vinculas tu número como un dispositivo más, con un código QR. Listo en un minuto.",
        },
        {
          value: "meta",
          title: "API oficial de Meta",
          desc: "Conexión oficial con tu cuenta de Facebook. Necesaria para el asistente que responde a tus clientes y las plantillas de campaña.",
        },
      ].map((o) => (
        <div
          key={o.value}
          className="ag-opt"
          role="radio"
          tabIndex={0}
          aria-checked={connectionMethod === o.value}
          onClick={() => handleChangeMethod(o.value)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), handleChangeMethod(o.value))}
          style={{ cursor: "pointer" }}
        >
          <span className="ag-radio" />
          <div>
            <b>{o.title}</b>
            <span className="d">{o.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const advanced = showWebPanel && (
    <details className="ag-card" style={{ padding: "12px 16px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Opciones avanzadas</summary>
      <div className="ag-stack" style={{ gap: 14, marginTop: 14 }}>
        {code === "ready" && !organization?.hideBaileysUI && (
          <Select
            label="Método de conexión"
            value={connectionMethod}
            onChange={handleChangeMethod}
            data={[
              { value: "web", label: "WhatsApp Web" },
              { value: "meta", label: "API oficial de Meta" },
            ]}
            allowDeselect={false}
            maw={320}
          />
        )}
        <Group align="end" wrap="nowrap">
          <TextInput
            label="ID de sesión"
            description="Identificador interno de esta conexión."
            value={clientId}
            onChange={(e) => setClientId(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 360 }}
            disabled={code === "ready" || code === "connecting"}
          />
          <CopyButton value={clientId} timeout={1500}>
            {({ copied, copy }) => (
              <Button variant="default" onClick={copy} leftSection={copied ? <CheckIcon size={14} /> : <BiCopy size={14} />}>
                {copied ? "Copiado" : "Copiar"}
              </Button>
            )}
          </CopyButton>
        </Group>
        {reason && (
          <Text size="xs" c="dimmed">
            Detalle técnico: <Kbd>{reason}</Kbd>
          </Text>
        )}
        {code === "ready" && (
          <>
            <Group align="end" wrap="wrap">
              <TextInput
                label="Probar envío a otro número"
                description="Con indicativo del país, sin +. Ej: 573001234567"
                placeholder="573001234567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.currentTarget.value)}
                style={{ flex: 1, maxWidth: 360 }}
              />
              <Button variant="default" loading={loadingSend} disabled={testPhone.trim().length < 7} onClick={() => sendTest(testPhone.trim())}>
                Enviar prueba
              </Button>
            </Group>
            <Group gap="xs">
              <Button variant="default" onClick={restart} loading={loadingRestart} leftSection={<BiRefresh size={16} />}>
                Reiniciar conexión
              </Button>
              <Button variant="subtle" color="red" onClick={logout} loading={loadingLogout} leftSection={<BiX size={16} />}>
                Desconectar
              </Button>
            </Group>
          </>
        )}
      </div>
    </details>
  );

  const webPanel = showWebPanel && (
    <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
      {code === "ready" ? (
        <div className="ag-card" style={{ padding: 20, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "var(--success-soft)",
              color: "var(--success)",
              flex: "none",
            }}
          >
            <IconBrandWhatsapp size={26} />
          </span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="ag-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 18, lineHeight: "24px" }}>Conectado{selfPhone ? ` · +${selfPhone}` : ""}</b>
              <span className="ag-badge ag-badge--success">WhatsApp Web</span>
            </div>
            <div className="ag-muted" style={{ fontSize: 14 }}>
              {me?.name ? `${me.name} · ` : ""}Tus clientes reciben confirmaciones y recordatorios desde este número.
            </div>
          </div>
          <Button onClick={handleSendWelcomeTest} loading={sendingWelcome} leftSection={<BiSend size={16} />}>
            Enviar mensaje de prueba
          </Button>
        </div>
      ) : (
        <>
          <div className={`ag-alert ag-alert--${statusTone[ui.color] || "warning"}`}>
            <BiInfoCircle size={20} />
            <div>
              <b style={{ display: "block" }}>
                {code === "disconnected" ? "WhatsApp no está conectado" : ui.title}
              </b>
              {code === "disconnected"
                ? "Mientras no lo conectes, tus clientes no reciben confirmaciones ni recordatorios."
                : ui.desc}
              {code === "connecting" && <Progress value={100} striped animated mt={8} />}
            </div>
          </div>

          {methodCards}

          <div className="ag-card" style={{ padding: 20 }}>
            <div className="ag-stack" style={{ gap: 14 }}>
              <WhatsappConnectGuide />
              <div className="ag-segment" role="group" aria-label="Cómo vincular">
                <button type="button" aria-pressed={connectMode === "qr"} disabled={code === "connecting"} onClick={() => setConnectMode("qr")}>
                  <BiQrScan style={{ marginRight: 6, verticalAlign: -2 }} />
                  Código QR
                </button>
                <button type="button" aria-pressed={connectMode === "pairing"} disabled={code === "connecting"} onClick={() => setConnectMode("pairing")}>
                  <BiMobile style={{ marginRight: 6, verticalAlign: -2 }} />
                  Usar código de vinculación
                </button>
              </div>

              {connectMode === "pairing" &&
                (!pairingCode ? (
                  <Group align="end" wrap="wrap">
                    <TextInput
                      label="Tu número de WhatsApp"
                      placeholder="573001234567"
                      description="Con indicativo del país, sin +."
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.currentTarget.value)}
                      disabled={code === "connecting"}
                      style={{ flex: 1, maxWidth: 320 }}
                    />
                    <Button onClick={handleConnect} loading={loadingPrimary} disabled={!pairingPhone || code === "connecting"}>
                      Obtener código
                    </Button>
                  </Group>
                ) : (
                  <div className="ag-card" style={{ padding: 20, textAlign: "center", background: "var(--surface-muted)" }}>
                    <span style={eyebrowStyle}>Código de vinculación</span>
                    <div style={{ font: "600 32px/40px monospace", letterSpacing: "0.2em", margin: "8px 0" }}>{pairingCode}</div>
                    <div className="ag-muted" style={{ fontSize: 13, maxWidth: 320, margin: "0 auto" }}>
                      En tu celular: <b>Dispositivos vinculados</b> › <b>Vincular dispositivo</b> › <b>Vincular con número de teléfono</b>.
                    </div>
                    <Group justify="center" mt="sm" gap="xs">
                      <CopyButton value={pairingCode}>
                        {({ copied, copy }) => (
                          <Button size="xs" variant="default" onClick={copy} leftSection={copied ? <CheckIcon size={12} /> : <BiCopy size={14} />}>
                            {copied ? "Copiado" : "Copiar código"}
                          </Button>
                        )}
                      </CopyButton>
                      <Button size="xs" variant="subtle" color="gray" onClick={() => connect({ forceFresh: true })}>
                        Volver a intentar
                      </Button>
                    </Group>
                  </div>
                ))}

              {connectMode === "qr" &&
                (!qr ? (
                  <Button onClick={() => connect({ forceFresh: true })} loading={loadingPrimary} disabled={code === "connecting"} style={{ alignSelf: "flex-start" }}>
                    Generar código QR
                  </Button>
                ) : (
                  <Stack align="center" gap={6}>
                    <QRCodeSVG value={qr} size={240} includeMargin />
                    <Text size="xs" c="dimmed">
                      Expira en {qrTtl}s
                    </Text>
                    {qrTtl === 0 && (
                      <Button variant="default" size="xs" leftSection={<BiRefresh size={16} />} onClick={() => connect()}>
                        Generar otro QR
                      </Button>
                    )}
                  </Stack>
                ))}
            </div>
          </div>
        </>
      )}
      {advanced}
    </div>
  );

  const comparison = !organization?.hideBaileysUI && (
    <aside className="ag-card" style={{ padding: 20, alignSelf: "flex-start" }}>
      <b style={{ display: "block", marginBottom: 10 }}>¿Cuál método me conviene?</b>
      <dl className="ag-kv" style={{ gridTemplateColumns: "1fr", gap: 4 }}>
        <dt style={{ fontWeight: 600, color: "var(--ink)" }}>WhatsApp Web</dt>
        <dd className="ag-muted" style={{ marginBottom: 10 }}>Rápido y gratis. Usas tu mismo número desde el celular. Envía confirmaciones, recordatorios y campañas.</dd>
        <dt style={{ fontWeight: 600, color: "var(--ink)" }}>API oficial de Meta</dt>
        <dd className="ag-muted">
          Más estable. Con la coexistencia de Meta sigues usando la app de WhatsApp Business en tu celular. Incluye el asistente que responde a tus clientes.
        </dd>
      </dl>
    </aside>
  );

  const assistants = (
    <div className="ag-stack" style={{ gap: "var(--space-4)", maxWidth: 760 }}>
      <div className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <b style={{ fontSize: 16 }}>Responde a tus clientes</b>
          {organization?.waConnectionType === "meta" ? (
            <span className={`ag-badge${organization?.waBookingAgentEnabled ? " ag-badge--success" : ""}`}>
              {organization?.waBookingAgentEnabled ? "Activo" : "Apagado"}
            </span>
          ) : (
            <span className="ag-badge">Requiere la API oficial de Meta</span>
          )}
        </div>
        <div className="ag-muted" style={{ fontSize: 14 }}>
          Contesta los mensajes que tus clientes escriben a tu número: muestra servicios, consulta disponibilidad y agenda la cita. Si respondes tú, se
          pausa con ese cliente por el tiempo que elijas.
        </div>
        <div>
          <Button
            size="xs"
            variant="outline"
            component={Link}
            to="/gestionar-whatsapp"
            onClick={() => organization?.waConnectionType !== "meta" && handleChangeMethod("meta")}
          >
            {organization?.waConnectionType === "meta" ? "Configurar en Conexión" : "Conectar con Meta"}
          </Button>
        </div>
      </div>

      <div className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <b style={{ fontSize: 16 }}>Agente para tu equipo</b>
          <span className={`ag-badge${(organization as any)?.waAgentEnabled ? " ag-badge--success" : ""}`}>
            {(organization as any)?.waAgentEnabled ? "Activo" : "Apagado"}
          </span>
        </div>
        <div className="ag-muted" style={{ fontSize: 14 }}>
          Escríbele al WhatsApp de AgenditApp, por ejemplo «agenda una cita para Juan mañana a las 3 p. m. con María» o «muéstrame los ingresos de
          esta semana», y lo hace en tu agenda. Te responde a tu número de contacto:{" "}
          <b>{organization?.phoneNumber || "—"}</b>.
        </div>
        <Switch
          label="Activar agente para el equipo"
          checked={waAgentEnabled}
          onChange={(e) => setWaAgentEnabled(e.currentTarget.checked)}
        />
        <TextInput
          label="Número adicional autorizado (opcional)"
          description="Otro número del equipo que también puede darle instrucciones. Con +, ej: +573218104634"
          placeholder="+57300..."
          value={waPhone}
          onChange={(e) => setWaPhone(e.currentTarget.value)}
          maw={360}
        />
        <Group justify="flex-end">
          <Button onClick={handleSaveAgentConfig} loading={savingAgent}>
            Guardar
          </Button>
        </Group>
      </div>
    </div>
  );

  return (
    <Box p={{ base: "sm", md: "lg" }}>
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        <WhatsappTabs />

        {/* Tope mensual de citas con WhatsApp (solo planes de entrada) */}
        {planUsage?.whatsappAppointmentsThisMonth?.max != null && (
          <div className="ag-card" style={{ padding: 12 }}>
            <WhatsappQuotaUsage usage={planUsage.whatsappAppointmentsThisMonth} showUpgrade />
          </div>
        )}

        {tab === "asistentes" ? (
          assistants
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isDesktop && comparison ? "minmax(0, 1fr) 320px" : "minmax(0, 1fr)",
              gap: "var(--space-4)",
              alignItems: "start",
            }}
          >
            <div className="ag-stack" style={{ gap: "var(--space-3)", minWidth: 0 }}>
              {webPanel}
              {showMetaPanel && organization?._id && (
                <>
                  {methodCards}
                  <div className="ag-card" style={{ padding: 20 }}>
                    <MetaConnectionPanel organizationId={organization._id} />
                  </div>
                </>
              )}
            </div>
            {comparison}
          </div>
        )}
      </div>
    </Box>
  );
};

export default WhatsappOrgSession;
