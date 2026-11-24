import { Button } from "@mantine/core";
import { IconBrandWhatsapp, IconWifiOff } from "@tabler/icons-react";
import { AGENDITAPP_SUPPORT_WA_URL } from "../utils/panelAccess";
import AuthCard from "./auth/AuthCard";
import { StatusIcon } from "./auth/AccessStatus";
import NotFoundOrg from "../pages/public/NotFoundOrg";

interface Props {
  notFound: boolean;
  onRetry: () => void;
}

/**
 * Pantalla cuando no se pudo cargar el negocio del dominio actual (rediseño,
 * ErroresYAcceso). Si el negocio no existe, «No encontramos este negocio»; si
 * falló la carga, «No pudimos cargar la página» con «Reintentar».
 */
export default function OrgLoadError({ notFound, onRetry }: Props) {
  if (notFound) return <NotFoundOrg />;
  return (
    <AuthCard platform>
      <StatusIcon tone="warning">
        <IconWifiOff size={26} />
      </StatusIcon>
      <div>
        <h1>No pudimos cargar la página</h1>
        <p className="ag-muted" style={{ margin: "4px 0 0" }}>
          Puede ser la conexión a internet. Inténtalo de nuevo en un momento.
        </p>
      </div>
      <div className="ag-stack" style={{ gap: 8 }}>
        <Button fullWidth color="var(--platform)" onClick={onRetry}>
          Reintentar
        </Button>
        <Button fullWidth variant="default" component="a" href={AGENDITAPP_SUPPORT_WA_URL} target="_blank" rel="noopener noreferrer" leftSection={<IconBrandWhatsapp size={16} />}>
          Escribir a soporte
        </Button>
      </div>
    </AuthCard>
  );
}
