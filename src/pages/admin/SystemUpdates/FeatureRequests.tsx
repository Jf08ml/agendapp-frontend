// Mis solicitudes (rediseño, NovedadesHistorial): ideas de mejora del negocio con
// su estado. «Retirar solicitud» va en el menú «⋯».
import { useEffect, useState } from "react";
import { ActionIcon, Button, Collapse, Menu, Skeleton, Text, Textarea, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconDots, IconInfoCircle, IconSend, IconX } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { openConfirmModal } from "@mantine/modals";
import {
  createFeatureRequest,
  getMyFeatureRequests,
  closeFeatureRequest,
  type FeatureRequest,
  type FeatureRequestStatus,
} from "../../../services/featureRequestService";

const STATUS_CONFIG: Record<FeatureRequestStatus, { label: string; tone: string }> = {
  pending: { label: "Pendiente", tone: "" },
  under_review: { label: "En revisión", tone: "ag-badge--info" },
  planned: { label: "Planeada", tone: "ag-badge--brand" },
  done: { label: "Implementada", tone: "ag-badge--success" },
  declined: { label: "No planeada", tone: "ag-badge--danger" },
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

function RequestCard({ request, onClose, closing }: { request: FeatureRequest; onClose?: (id: string) => void; closing: boolean }) {
  const cfg = STATUS_CONFIG[request.status];
  return (
    <div className="ag-card" style={{ padding: "14px 16px", opacity: request.closedByOrg ? 0.6 : 1 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, lineHeight: "20px", textDecoration: request.closedByOrg ? "line-through" : undefined }}>{request.text}</div>
          <div className="ag-subtle" style={{ marginTop: 4 }}>
            {formatDate(request.createdAt)}
            {request.closedByOrg ? " · Retirada" : ""}
          </div>
          {request.adminReply && (
            <div
              className="ag-muted"
              style={{ marginTop: 10, padding: "10px 12px", borderLeft: "2px solid var(--line-strong)", background: "var(--surface-muted)", fontSize: 13 }}
            >
              <b style={{ display: "block", color: "var(--ink)", marginBottom: 2 }}>Respuesta de AgenditApp</b>
              {request.adminReply}
            </div>
          )}
        </div>
        <span className={`ag-badge ${cfg.tone}`} style={{ flex: "none" }}>
          {cfg.label}
        </span>
        {onClose && (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="sm" loading={closing} aria-label="Más opciones">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconX size={14} />} onClick={() => onClose(request._id)}>
                Retirar solicitud
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </div>
    </div>
  );
}

export default function FeatureRequests() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const loadRequests = () => {
    setLoading(true);
    setError(false);
    getMyFeatureRequests()
      .then(setRequests)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await createFeatureRequest(text.trim());
      setText("");
      showNotification({ title: "Solicitud enviada", message: "Gracias por tu idea, la vamos a revisar.", color: "green", autoClose: 3000 });
      loadRequests();
    } catch (err) {
      showNotification({ message: (err as Error).message || "No pudimos enviar tu solicitud. Inténtalo de nuevo.", color: "red", autoClose: 4000 });
    } finally {
      setSending(false);
    }
  };

  const handleClose = async (id: string) => {
    setClosingId(id);
    try {
      await closeFeatureRequest(id);
      showNotification({ title: "Solicitud retirada", message: "La quitamos de tu lista activa.", color: "gray", autoClose: 2500 });
      loadRequests();
    } catch (err) {
      showNotification({ message: (err as Error).message || "No pudimos retirar la solicitud. Inténtalo de nuevo.", color: "red", autoClose: 4000 });
    } finally {
      setClosingId(null);
    }
  };

  const confirmClose = (id: string) => {
    openConfirmModal({
      title: "Retirar solicitud",
      children: <Text size="sm">¿Ya no la necesitas? Sale de tu lista activa, pero no se borra.</Text>,
      labels: { confirm: "Sí, retirar", cancel: "Volver" },
      onConfirm: () => handleClose(id),
      centered: true,
    });
  };

  const activeRequests = requests.filter((r) => !r.closedByOrg);
  const closedRequests = requests.filter((r) => r.closedByOrg);

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
      <div className="ag-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <b style={{ display: "block", fontSize: 14 }}>¿Te falta algo o se te ocurre una mejora?</b>
          <span className="ag-muted" style={{ fontSize: 14 }}>Cuéntanos: lo revisamos y aquí verás en qué va tu solicitud.</span>
        </div>
        <Textarea
          placeholder="Ej: quiero compartir el detalle de mis servicios con un enlace"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          minRows={3}
          autosize
          maxRows={8}
          aria-label="Tu solicitud"
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button leftSection={<IconSend size={16} />} onClick={handleSubmit} loading={sending} disabled={!text.trim()}>
            Enviar solicitud
          </Button>
        </div>
      </div>

      {loading && (
        <div className="ag-stack" style={{ gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={64} radius="md" />
          ))}
        </div>
      )}

      {error && (
        <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
          <IconInfoCircle size={20} />
          <div style={{ flex: 1 }}>No pudimos cargar tus solicitudes.</div>
          <Button size="xs" variant="outline" onClick={loadRequests}>
            Reintentar
          </Button>
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="ag-card" style={{ padding: "32px 20px", textAlign: "center" }}>
          <b>Todavía no has enviado ninguna solicitud</b>
        </div>
      )}

      {!loading && !error && activeRequests.length > 0 && (
        <div className="ag-stack" style={{ gap: 8 }}>
          {activeRequests.map((r) => (
            <RequestCard key={r._id} request={r} onClose={confirmClose} closing={closingId === r._id} />
          ))}
        </div>
      )}

      {!loading && !error && closedRequests.length > 0 && (
        <div>
          <UnstyledButton onClick={() => setShowClosed((v) => !v)} className="ag-link" style={{ fontSize: 13 }}>
            {showClosed ? "Ocultar" : "Ver"} retiradas ({closedRequests.length}) {showClosed ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
          </UnstyledButton>
          <Collapse in={showClosed}>
            <div className="ag-stack" style={{ gap: 8, marginTop: 8 }}>
              {closedRequests.map((r) => (
                <RequestCard key={r._id} request={r} closing={false} />
              ))}
            </div>
          </Collapse>
        </div>
      )}
    </div>
  );
}
