// Retorno del pago de la membresía (rediseño, RegistroPlataforma): «Verificando
// tu pago» mientras llega el webhook (polling), «Tu plan está activo» o, si
// tarda, opciones para verificar de nuevo o escribir a soporte.
import { useEffect, useRef, useState } from "react";
import { Button, Loader } from "@mantine/core";
import { IconBrandWhatsapp, IconCheck, IconClock } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { getCurrentMembership } from "../../services/membershipService";

// Configuración del polling
const POLL_INTERVAL_MS = 4000; // cada 4 segundos
const MAX_ATTEMPTS = 15; // 60 segundos máximo

type PageStatus = "waiting" | "activated" | "timeout";

const SUPPORT_WHATSAPP = "573506674686";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const organizationId = useSelector((state: RootState) => state.auth.organizationId);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const [pageStatus, setPageStatus] = useState<PageStatus>("waiting");
  const [attempts, setAttempts] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const countAttempt = () =>
    setAttempts((prev) => {
      const next = prev + 1;
      if (next >= MAX_ATTEMPTS) {
        stopPolling();
        setPageStatus("timeout");
      }
      return next;
    });

  const checkActivation = async () => {
    if (!organizationId) return;
    try {
      const membership = await getCurrentMembership(organizationId);
      if (membership?.status === "active") {
        stopPolling();
        setPageStatus("activated");
        return;
      }
      countAttempt();
    } catch {
      // Ignorar errores de red en polling, seguir intentando
    }
  };

  useEffect(() => {
    // organizationId = null puede significar dos cosas:
    // a) Usuario no autenticado → timeout inmediato
    // b) Autenticado pero organizationId aún no hidratado (useAuthInitializer async) → esperar
    if (!organizationId) {
      if (!isAuthenticated) setPageStatus("timeout");
      return;
    }
    setPageStatus("waiting");
    setAttempts(0);
    checkActivation();
    intervalRef.current = setInterval(checkActivation, POLL_INTERVAL_MS);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, isAuthenticated]);

  const handleManualCheck = () => {
    stopPolling();
    setAttempts(0);
    setPageStatus("waiting");
    checkActivation();
    intervalRef.current = setInterval(checkActivation, POLL_INTERVAL_MS);
  };

  const supportUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    "Hola, acabo de pagar mi plan de AgenditApp pero aún no se activa. ¿Pueden verificarlo?"
  )}`;

  const progress = Math.min(100, ((attempts + 1) / MAX_ATTEMPTS) * 100);

  const icon = (tone: "success" | "warning" | "info", node: React.ReactNode) => (
    <span style={{ width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", background: `var(--${tone}-soft)`, color: `var(--${tone})` }}>
      {node}
    </span>
  );

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div className="ag-card" style={{ width: "100%", maxWidth: 440, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
        {pageStatus === "waiting" && (
          <>
            {icon("info", <Loader size={24} color="var(--info)" />)}
            <h1 style={{ margin: 0, font: "600 22px/28px var(--mantine-font-family)" }}>Verificando tu pago</h1>
            <div className="ag-muted" style={{ fontSize: 14 }}>
              Estamos confirmando la activación con el procesador de pagos. Suele tardar menos de 30 segundos; no cierres esta página.
            </div>
            <div style={{ width: "100%", height: 6, borderRadius: 999, background: "var(--line)", overflow: "hidden" }} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${progress}%`, height: "100%", background: "var(--platform)", transition: "width 300ms ease" }} />
            </div>
          </>
        )}

        {pageStatus === "activated" && (
          <>
            {icon("success", <IconCheck size={28} />)}
            <h1 style={{ margin: 0, font: "600 22px/28px var(--mantine-font-family)" }}>Tu plan está activo</h1>
            <div className="ag-muted" style={{ fontSize: 14 }}>Ya puedes usar todas las funciones de tu nuevo plan.</div>
            <div className="ag-stack" style={{ gap: 8, width: "100%" }}>
              <Button fullWidth size="md" color="var(--platform)" onClick={() => navigate("/gestionar-agenda")}>
                Ir a mi agenda
              </Button>
              <Button fullWidth variant="default" onClick={() => navigate("/my-membership")}>
                Ver mi membresía
              </Button>
            </div>
          </>
        )}

        {pageStatus === "timeout" && (
          <>
            {icon("warning", <IconClock size={28} />)}
            <h1 style={{ margin: 0, font: "600 22px/28px var(--mantine-font-family)" }}>Tu pago se está procesando</h1>
            <div className="ag-muted" style={{ fontSize: 14 }}>
              La activación está tardando más de lo normal. Si pagaste con PayPal, tu plan se activará solo en unos minutos. También podemos activarlo
              a mano si nos escribes.
            </div>
            <div className="ag-stack" style={{ gap: 8, width: "100%" }}>
              <Button fullWidth color="var(--platform)" onClick={handleManualCheck}>
                Verificar de nuevo
              </Button>
              <Button fullWidth variant="default" component="a" href={supportUrl} target="_blank" rel="noopener noreferrer" leftSection={<IconBrandWhatsapp size={16} />}>
                Escribir a soporte
              </Button>
              <Button fullWidth variant="subtle" color="gray" onClick={() => navigate("/my-membership")}>
                Ver estado de mi membresía
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
