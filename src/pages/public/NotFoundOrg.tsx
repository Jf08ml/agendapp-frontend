// Subdominio o dominio sin negocio (rediseño, ErroresYAcceso): «No encontramos
// este negocio» con la dirección escrita, crear cuenta o recuperar acceso.
import { Button } from "@mantine/core";
import { IconBuildingStore } from "@tabler/icons-react";
import AuthCard from "../../components/auth/AuthCard";
import { StatusIcon } from "../../components/auth/AccessStatus";

const PLATFORM = "https://app.agenditapp.com";

export default function NotFoundOrg() {
  const host = window.location.hostname;
  return (
    <AuthCard platform maxWidth={420}>
      <StatusIcon tone="muted">
        <IconBuildingStore size={26} />
      </StatusIcon>
      <div>
        <h1>No encontramos este negocio</h1>
        <p className="ag-muted" style={{ margin: "4px 0 0" }}>
          <b style={{ color: "var(--ink)", wordBreak: "break-all" }}>{host}</b> no corresponde a ningún negocio registrado. Revisa que esté bien
          escrita o crea tu propia cuenta.
        </p>
      </div>
      <div className="ag-stack" style={{ gap: 8 }}>
        <Button component="a" href={`${PLATFORM}/signup`} fullWidth color="var(--platform)">
          Crear mi cuenta gratis
        </Button>
        <Button component="a" href={`${PLATFORM}/recuperar-acceso`} fullWidth variant="default">
          Recuperar acceso
        </Button>
      </div>
    </AuthCard>
  );
}
