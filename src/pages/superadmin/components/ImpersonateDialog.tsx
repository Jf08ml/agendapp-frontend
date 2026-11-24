// «Entrar como administrador de …» (rediseño, SuperadminOrganizaciones):
// razón obligatoria (mínimo 5 caracteres), queda en auditoría y se abre en una
// pestaña nueva por 60 minutos. Lo usan la lista y la ficha de organización.
import { useEffect, useState } from "react";
import { Button, Modal, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconShieldCheck } from "@tabler/icons-react";
import { apiGeneral } from "../../../services/axiosConfig";

interface Props {
  org: { _id?: string; name?: string; slug?: string } | null;
  onClose: () => void;
}

export default function ImpersonateDialog({ org, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (org) {
      setReason("");
      setError("");
    }
  }, [org]);

  const submit = async () => {
    if (!org || reason.trim().length < 5) {
      setError("Escribe la razón del acceso (mínimo 5 caracteres).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await apiGeneral.post("/admin/impersonate", { organizationId: org._id, reason: reason.trim() });
      const { exchangeCode, subdomain } = res.data.data;

      // Guardar el token de superadmin antes de ser reemplazado por el de la org
      const backupToken = localStorage.getItem("app_token");
      const backupUserId = localStorage.getItem("app_userId");
      const backupExpiresAt = localStorage.getItem("app_token_expires_at");
      if (backupToken && backupUserId) {
        localStorage.setItem("sa_backup", JSON.stringify({ token: backupToken, userId: backupUserId, expiresAt: backupExpiresAt }));
      }

      // Pestaña nueva: el panel del superadmin sigue abierto en esta.
      const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const url = isDev ? `/exchange?slug=${org.slug}&code=${exchangeCode}` : `https://${subdomain}/exchange?code=${exchangeCode}`;
      window.open(url, "_blank", "noopener,noreferrer");

      notifications.show({ message: `Se abrió ${org.name} en una pestaña nueva.` });
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || "No se pudo generar el acceso. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened={!!org} onClose={() => !busy && onClose()} title={<b>Entrar como administrador de {org?.name}</b>} centered>
      <div className="ag-stack" style={{ gap: 14 }}>
        <div className="ag-alert ag-alert--info">
          <IconShieldCheck size={20} />
          <div style={{ fontSize: 14 }}>Se abre en una pestaña nueva y dura 60 minutos. El acceso y su razón quedan en el registro de auditoría.</div>
        </div>
        <Textarea
          label="Razón del acceso"
          required
          placeholder="Ej.: soporte, el negocio reportó un error en la agenda"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          minRows={2}
          autosize
          disabled={busy}
          error={error || undefined}
        />
        <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <Button variant="default" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button color="var(--platform)" onClick={submit} loading={busy}>
            Entrar como admin
          </Button>
        </div>
      </div>
    </Modal>
  );
}
